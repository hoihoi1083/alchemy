import { ApiError, fal } from "@fal-ai/client";
import { promises as fs } from "fs";
import path from "path";
import { KLING_TURBO_PRO, type KlingClipDuration } from "@/lib/billing/token-costs";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import {
  klingSceneMotionPrompt,
  klingStoryboardTokenCost,
  resolveKlingClipDurations,
  KLING_TEXTLESS_NEGATIVE,
  type KlingSceneMeta,
} from "@/lib/kling-storyboard-fallback";
import { concatVideos, ensureFfmpeg } from "@/lib/pipeline/ffmpeg";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { jobDir } from "@/lib/pipeline/paths";
import { persistAndDurablize } from "@/lib/storage/durable-media";

export type { KlingSceneMeta };
export { klingStoryboardTokenCost, resolveKlingClipDurations };

const KLING_ENDPOINT = KLING_TURBO_PRO.endpoint;

export function formatKlingFalError(e: unknown): string {
  if (e instanceof ApiError) {
    return `${e.message}${e.requestId ? ` (request: ${e.requestId})` : ""}`;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Storyboard video generation failed";
}

function extractVideoUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const video = (data as { video?: { url?: unknown } }).video;
  if (video && typeof video.url === "string" && video.url) return video.url;
  return null;
}

/**
 * Collect stills from any Seedance generate FormData shape (image / reference / storyboard).
 * Returns fal CDN URLs ready for Kling I2V.
 */
export async function collectKlingFallbackImageUrls(
  formData: FormData,
): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();

  const addFalUrl = (falUrl: string) => {
    if (!falUrl || seen.has(falUrl)) return;
    seen.add(falUrl);
    urls.push(falUrl);
  };

  const pushRemote = async (raw: string | null | undefined) => {
    const trimmed = raw?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    try {
      addFalUrl(await mirrorImageUrlToFalStorage(trimmed));
    } catch {
      /* skip unreadable URL */
    }
  };

  const start = formData.get("image_start") as File | null;
  if (start && start.size > 0) {
    try {
      addFalUrl(await fal.storage.upload(start));
    } catch {
      /* skip */
    }
  }
  await pushRemote(formData.get("image_start_url") as string | null);

  for (const f of formData.getAll("images") as File[]) {
    if (!f || f.size <= 0) continue;
    try {
      addFalUrl(await fal.storage.upload(f));
    } catch {
      /* skip */
    }
  }

  await pushRemote(formData.get("image_ref_url") as string | null);

  const directRefUrls = (formData.get("reference_image_urls") as string | null)
    ?.trim()
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (directRefUrls) {
    for (const u of directRefUrls) await pushRemote(u);
  }

  return urls.slice(0, 9);
}

/**
 * Animate still(s) with Kling I2V (stitch if multiple). Caller handles billing.
 */
export async function runKlingStoryboardFallback(opts: {
  request: Request;
  clerkId: string;
  /** Prefer fal CDN URLs when already uploaded. */
  imageUrls?: string[];
  imageFiles?: File[];
  theme?: string;
  motionPrompt?: string;
  totalDurationSec?: number;
  scenesMeta?: KlingSceneMeta[];
}): Promise<{
  videoUrl: string;
  clipCount: number;
  clipDurations: KlingClipDuration[];
  endpoint: string;
  generationMode: "kling-storyboard-fallback";
  note: string;
}> {
  let imageUrls = (opts.imageUrls ?? []).filter(Boolean);
  if (!imageUrls.length && opts.imageFiles?.length) {
    const files = opts.imageFiles.filter((f) => f && f.size > 0);
    imageUrls = await Promise.all(files.map((f) => fal.storage.upload(f)));
  }
  if (!imageUrls.length) {
    throw new Error("Storyboard video needs at least one scene image.");
  }
  if (imageUrls.length > 9) {
    throw new Error("At most 9 storyboard scenes.");
  }

  const totalDurationSec =
    opts.totalDurationSec && opts.totalDurationSec > 0 ? opts.totalDurationSec : 8;
  const scenesMeta = opts.scenesMeta ?? [];
  const clipDurations = resolveKlingClipDurations(
    imageUrls.length,
    totalDurationSec,
    scenesMeta,
  );
  const theme = opts.theme?.trim() || "";
  const motionPrompt = opts.motionPrompt?.trim() || "";

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  // Run Kling I2V in parallel — sequential 4× clips often approaches Hobby's 300s limit.
  const clipUrls = await Promise.all(
    imageUrls.map(async (imageUrl, i) => {
      const duration = clipDurations[i] ?? 5;
      const meta = scenesMeta[i];
      const prompt =
        imageUrls.length === 1 && motionPrompt
          ? [
              "Animate this exact still with confident commercial camera motion and light movement.",
              motionPrompt.slice(0, 400),
              "Preserve layout, product, logo, and blank UI. Do not invent any readable text or Chinese glyphs.",
              "If any accidental gibberish text appears, keep it heavily out-of-focus and unreadable.",
            ].join(" ")
          : klingSceneMotionPrompt({
              sceneIndex: i + 1,
              sceneCount: imageUrls.length,
              // Do NOT pass Chinese sceneDescription as motion — Kling fills screens with gibberish.
              sceneDescription: undefined,
              imagePrompt: meta?.imagePrompt?.slice(0, 120),
              role: meta?.role,
              theme,
              endWithBrandLogo: Boolean(meta?.useBrandLogo ?? meta?.endWithBrandLogo),
              useBrandLogo: Boolean(meta?.useBrandLogo ?? meta?.endWithBrandLogo),
            });

      const result = await fal.subscribe(KLING_ENDPOINT, {
        input: {
          prompt,
          image_url: imageUrl,
          duration: (duration === 10 ? "10" : "5") as "5" | "10",
          negative_prompt: KLING_TEXTLESS_NEGATIVE,
          // Slightly higher guidance so camera/motion instructions stick.
          cfg_scale: 0.6,
        },
        logs: true,
      });

      const url = extractVideoUrl(result.data);
      if (!url) {
        throw new Error(`No video returned for scene ${i + 1}.`);
      }
      return url;
    }),
  );

  let finalUrl: string;
  let localBytes: Buffer | undefined;
  if (clipUrls.length === 1) {
    finalUrl = clipUrls[0];
  } else {
    await ensureFfmpeg();
    const clipPaths = await Promise.all(
      clipUrls.map(async (clipUrl, i) => {
        const clipPath = path.join(dir, `kling-${i}.mp4`);
        await materializeMediaInput(clipUrl, clipPath);
        return clipPath;
      }),
    );
    const outputPath = path.join(dir, "final.mp4");
    await concatVideos(clipPaths, outputPath);
    localBytes = await fs.readFile(outputPath);
    finalUrl = pipelineFileUrl(opts.request, jobId, "final.mp4");
  }

  const durable = await persistAndDurablize({
    clerkId: opts.clerkId,
    kind: "video",
    sourceUrl: finalUrl,
    fallbackUrl: finalUrl,
    prompt: "kling-seedance-fallback",
    bytes: localBytes,
    contentType: "video/mp4",
  });

  return {
    videoUrl: durable,
    clipCount: clipUrls.length,
    clipDurations,
    endpoint: KLING_ENDPOINT,
    generationMode: "kling-storyboard-fallback",
    note:
      "Per-scene image-to-video (parallel clips) + stitch.",
  };
}
