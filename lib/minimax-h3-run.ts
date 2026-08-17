import { fal } from "@fal-ai/client";
import { videoCapForPlan } from "@/lib/billing/entitlements";
import type { UserPlan } from "@/lib/billing/plans";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { collectKlingFallbackImageUrls } from "@/lib/kling-storyboard-run";
import {
  buildSeedanceReferenceClip,
  MINIMAX_MAX_REFERENCE_SEC,
} from "@/lib/reference-video-prepare";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { VIDEO1_SPINE_SCREENPLAY } from "@/lib/prompt-balance-contract";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";

export type MinimaxH3Mode = "image" | "reference";

function extractVideoUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const video = (data as { video?: { url?: unknown } }).video;
  if (video && typeof video.url === "string" && video.url) return video.url;
  return null;
}

export function clampMinimaxH3Duration(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.min(15, Math.max(5, Math.round(n)));
}

/** H3 expects exact enums: 480P | 768P | 2K | 4K (not Seedance's 768p). */
export type MinimaxH3Resolution = "480P" | "768P" | "2K" | "4K";

export function normalizeMinimaxH3Resolution(
  raw: string | null | undefined,
): MinimaxH3Resolution {
  const t = (raw ?? "").trim();
  const lower = t.toLowerCase();
  if (t === "4K" || lower === "4k" || lower === "2160p") return "4K";
  if (t === "480P" || lower === "480p" || lower === "480") return "480P";
  if (
    t === "768P" ||
    lower === "768p" ||
    lower === "720p" ||
    lower === "768"
  ) {
    return "768P";
  }
  // 1080p / 2K / unknown → 2K
  return "2K";
}

/** Plan video cap clamps the H3 enum (Free → 480P, Standard → 768P, Pro/Master → 2K). */
export function clampMinimaxH3ResolutionForPlan(
  plan: UserPlan,
  requested: MinimaxH3Resolution,
): MinimaxH3Resolution {
  const cap = videoCapForPlan(plan);
  if (cap === "480p") return "480P";
  if (cap === "720p") return requested === "480P" ? "480P" : "768P";
  if (requested === "4K") return "2K";
  if (requested === "480P" || requested === "768P") return requested;
  return "2K";
}

/** Seedance @Image1 / @Video1 → MiniMax “Image 1” / “Video 1” prompt grammar. */
export function seedancePromptToMinimaxH3(prompt: string): string {
  return prompt
    .replace(/@Image(\d+)\b/gi, (_m, n: string) => `Image ${n}`)
    .replace(/@Video(\d+)\b/gi, (_m, n: string) => `Video ${n}`)
    .replace(/@Audio(\d+)\b/gi, (_m, n: string) => `Audio ${n}`);
}

function h3Endpoint(mode: MinimaxH3Mode): string {
  return mode === "image"
    ? "minimax/h3/image-to-video"
    : "minimax/h3/reference-to-video";
}

/** True when the client sent a reference MP4 / @Video1 spine (not stills-only). */
export function formDataExpectsReferenceVideo(formData: FormData, prompt?: string): boolean {
  if (prompt && (/@\s*Video\s*1\b/i.test(prompt) || /\bVideo\s+1\b/i.test(prompt))) {
    return true;
  }
  const url =
    (formData.get("reference_video_url") as string | null)?.trim() ||
    (formData.get("reference_video_urls") as string | null)?.trim();
  if (url) return true;
  for (const key of ["reference_video", "video"] as const) {
    const f = formData.get(key);
    if (f instanceof File && f.size > 0) return true;
  }
  for (const f of formData.getAll("videos")) {
    if (f instanceof File && f.size > 0) return true;
  }
  return false;
}

/** Collect reference video URLs/files from Seedance generate FormData. */
export async function collectMinimaxH3FallbackVideoUrls(
  formData: FormData,
): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    const t = u.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    urls.push(t);
  };

  const multi = (formData.get("reference_video_urls") as string | null)
    ?.trim()
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  for (const u of multi ?? []) add(u);

  const single = (formData.get("reference_video_url") as string | null)?.trim();
  if (single) add(single);

  for (const key of ["reference_video", "video"] as const) {
    const f = formData.get(key) as File | null;
    if (f && f.size > 0) {
      // Trim before upload — fal MiniMax rejects reference_video_urls over 15s
      // (this is the REFERENCE clip length, not the user's output duration).
      const raw = Buffer.from(await f.arrayBuffer());
      const clip = await buildSeedanceReferenceClip(raw, MINIMAX_MAX_REFERENCE_SEC);
      add(
        await fal.storage.upload(
          new File([new Uint8Array(clip.buffer)], "reference-clip.mp4", {
            type: "video/mp4",
          }),
        ),
      );
    }
  }

  return urls.slice(0, 3);
}

/**
 * Re-download + re-trim any reference URL that may still be >14.5s
 * (e.g. prepared for Seedance at ~15.0s, or an untrimmed research MP4).
 */
export async function ensureMinimaxReferenceVideoUrls(
  videoUrls: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const url of videoUrls.slice(0, 3)) {
    if (!url.trim()) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        out.push(url);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const clip = await buildSeedanceReferenceClip(buf, MINIMAX_MAX_REFERENCE_SEC);
      if (
        !clip.digestMontage &&
        clip.sourceDurationSec <= MINIMAX_MAX_REFERENCE_SEC - 0.05 &&
        clip.buffer.equals(buf)
      ) {
        // Already safe — keep original CDN URL.
        out.push(url);
        continue;
      }
      out.push(
        await fal.storage.upload(
          new File([new Uint8Array(clip.buffer)], "reference-clip-h3.mp4", {
            type: "video/mp4",
          }),
        ),
      );
    } catch (err) {
      console.warn("[minimax-h3] reference trim skipped:", err);
      out.push(url);
    }
  }
  return out;
}

export type RunMinimaxH3FallbackInput = {
  clerkId: string;
  prompt: string;
  durationSec: number;
  aspectRatio?: string;
  resolution?: string;
  imageUrls: string[];
  videoUrls: string[];
};

export type RunMinimaxH3FallbackResult = {
  videoUrl: string;
  generationMode: string;
  endpoint: string;
  mode: MinimaxH3Mode;
};

/**
 * Run MiniMax H3 from already-resolved fal/CDN URLs (Seedance 422 escape hatch).
 * Prefers reference-to-video when a motion clip exists; else image-to-video.
 */
export async function runMinimaxH3Fallback(
  input: RunMinimaxH3FallbackInput,
): Promise<RunMinimaxH3FallbackResult> {
  const duration = clampMinimaxH3Duration(input.durationSec);
  const prompt = seedancePromptToMinimaxH3(input.prompt).trim();
  if (!prompt) throw new Error("Video generation needs a prompt.");

  const imageUrls = (
    await Promise.all(
      input.imageUrls.slice(0, 9).map((u) =>
        mirrorImageUrlToFalStorage(u, { clerkId: input.clerkId, refresh: true }),
      ),
    )
  ).filter(Boolean);
  const videoUrls = await ensureMinimaxReferenceVideoUrls(
    input.videoUrls.slice(0, 3).filter(Boolean),
  );

  if (!imageUrls.length && !videoUrls.length) {
    throw new Error("Video fallback needs at least one image or video.");
  }

  const mode: MinimaxH3Mode =
    videoUrls.length > 0 || imageUrls.length > 1 ? "reference" : "image";
  const endpoint = h3Endpoint(mode);
  const aspectRatio = input.aspectRatio?.trim() || "9:16";
  const resolution = normalizeMinimaxH3Resolution(input.resolution);

  let falInput: Record<string, unknown> = {
    prompt,
    duration,
    resolution,
    aspect_ratio: aspectRatio,
  };

  if (mode === "image") {
    falInput.image_url = imageUrls[0];
  } else {
    if (imageUrls.length) falInput.reference_image_urls = imageUrls;
    if (videoUrls.length) falInput.reference_video_urls = videoUrls;
  }

  const result = await fal.subscribe(endpoint, { input: falInput, logs: false });
  const rawUrl = extractVideoUrl(result.data);
  if (!rawUrl) throw new Error("Video generation returned no video.");

  const durableUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: rawUrl,
    fallbackUrl: rawUrl,
    timingManifest: buildSingleClipManifest(duration, {
      source: "seedance",
      engine: "unknown",
      timingSource: "reported",
    }),
  });

  return {
    videoUrl: durableUrl,
    generationMode: `minimax-h3-fallback-${mode}`,
    endpoint,
    mode,
  };
}

/** Resolve stills + videos from Seedance FormData for H3 fallback. */
export async function collectMinimaxH3FallbackMedia(
  formData: FormData,
  opts: { clerkId: string },
): Promise<{ imageUrls: string[]; videoUrls: string[] }> {
  const [imageUrls, videoUrls] = await Promise.all([
    collectKlingFallbackImageUrls(formData, { clerkId: opts.clerkId }),
    collectMinimaxH3FallbackVideoUrls(formData),
  ]);
  return { imageUrls, videoUrls };
}

export type StoryboardH3SceneHint = {
  role?: string;
  cameraMotionEn?: string;
  lightingEn?: string;
  imagePrompt?: string;
};

/**
 * One-shot MiniMax H3 prompt for N storyboard stills (Image 1…N) — no Kling stitch.
 * English-only motion/roles so the model does not burn Chinese captions.
 */
export function buildStoryboardMinimaxH3Prompt(input: {
  theme?: string;
  motionPlan?: string;
  durationSec: number;
  scenes: StoryboardH3SceneHint[];
  hasReferenceVideo?: boolean;
  lookBibleGrade?: string;
  preserveOnScreenType?: boolean;
}): string {
  const n = Math.max(1, input.scenes.length);
  const duration = clampMinimaxH3Duration(input.durationSec);
  const look = (input.lookBibleGrade ?? "").trim();
  const lines = input.scenes.map((s, i) => {
    const idx = i + 1;
    const role = (s.role ?? "").trim() || `storyboard beat ${idx}`;
    const cam = (s.cameraMotionEn ?? "").trim();
    const lighting = (s.lightingEn ?? "").trim();
    const hint = (s.imagePrompt ?? "").trim().slice(0, 100);
    return [
      `Image ${idx} is storyboard frame ${idx} (${role}).`,
      cam ? `Motion for this beat: ${cam}.` : "",
      lighting ? `Lighting for this beat: ${lighting}.` : "",
      hint ? `Visual cue: ${hint}.` : "",
      `Keep subject identity locked to Image ${idx}.`,
    ]
      .filter(Boolean)
      .join(" ");
  });

  const plan = seedancePromptToMinimaxH3((input.motionPlan ?? "").trim()).slice(0, 900);
  const theme = (input.theme ?? "").trim().slice(0, 120);

  return [
    `Create ONE continuous ${duration}s vertical marketing video that progresses through ${n} storyboard beats in order (Image 1 → Image ${n}).`,
    input.preserveOnScreenType
      ? "Hard cuts between beats are OK when matching the storyboard. Keep existing on-screen wording identical — type may fade or track with the card. Do not invent new logos or rewrite letters."
      : "Hard cuts between beats are OK when matching the storyboard; do not invent on-screen text, logos, or watermarks.",
    theme ? `Theme: ${theme}.` : "",
    look ? `Look lock (grade only across all beats): ${look}.` : "",
    input.hasReferenceVideo ? seedancePromptToMinimaxH3(VIDEO1_SPINE_SCREENPLAY) : "",
    ...lines,
    plan ? `Director notes (adapt, do not copy on-screen copy): ${plan}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
