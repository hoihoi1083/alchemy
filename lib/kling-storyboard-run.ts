import { ApiError, fal } from "@fal-ai/client";
import { messageHasVendorName } from "@/lib/api/errors";
import { promises as fs } from "fs";
import path from "path";
import { KLING_TURBO_PRO, type KlingClipDuration } from "@/lib/billing/token-costs";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import {
  klingSceneMotionPrompt,
  klingStoryboardTokenCost,
  parseKlingScenesMeta,
  resolveKlingClipDurations,
  resolveKlingScenesMeta,
  KLING_TEXTLESS_NEGATIVE,
  KLING_PRESERVE_TYPE_NEGATIVE,
  type KlingSceneMeta,
} from "@/lib/kling-storyboard-fallback";
import {
  parseSceneMotionHintsFromPlan,
  sanitizeKlingMotionHint,
} from "@/lib/kling-motion-from-plan";
import {
  concatVideos,
  ensureFfmpeg,
  getMediaDurationSeconds,
  timeCompressVideoToDuration,
} from "@/lib/pipeline/ffmpeg";
import {
  KlingDurationUnreachableError,
  klingStitchCanHitDuration,
} from "@/lib/video-engine-router";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";

export type { KlingSceneMeta };
export {
  klingStoryboardTokenCost,
  parseKlingScenesMeta,
  resolveKlingClipDurations,
  resolveKlingScenesMeta,
};

const KLING_ENDPOINT = KLING_TURBO_PRO.endpoint;

export function formatKlingFalError(e: unknown): string {
  const fallback = "Storyboard video generation failed";
  if (e instanceof ApiError) return fallback;
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (!msg || messageHasVendorName(msg)) return fallback;
    return msg;
  }
  return fallback;
}

function extractVideoUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const video = (data as { video?: { url?: unknown } }).video;
  if (video && typeof video.url === "string" && video.url) return video.url;
  return null;
}

/**
 * Count storyboard/Kling image inputs WITHOUT uploading to fal (cheap pre-charge).
 * Prefer reference_image_urls when present (primary storyboard client path).
 */
export function countKlingFallbackImageSources(formData: FormData): number {
  const directRefUrls = (formData.get("reference_image_urls") as string | null)
    ?.trim()
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (directRefUrls?.length) return Math.min(directRefUrls.length, 9);

  let n = 0;
  const start = formData.get("image_start") as File | null;
  if (start && start.size > 0) n += 1;
  if ((formData.get("image_start_url") as string | null)?.trim()) n += 1;
  for (const f of formData.getAll("images") as File[]) {
    if (f && f.size > 0) n += 1;
  }
  if ((formData.get("image_ref_url") as string | null)?.trim()) n += 1;
  return Math.min(n, 9);
}

/**
 * Collect stills from any Seedance generate FormData shape (image / reference / storyboard).
 * Returns fal CDN URLs ready for Kling I2V.
 */
export async function collectKlingFallbackImageUrls(
  formData: FormData,
  opts?: { clerkId?: string },
): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();
  const mirrorOpts = {
    ...(opts?.clerkId ? { clerkId: opts.clerkId } : {}),
    // Fresh fal upload at fallback start — stale fal.media stills fail mid-job.
    refresh: true as const,
  };

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
      addFalUrl(await mirrorImageUrlToFalStorage(trimmed, mirrorOpts));
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
  preserveOnScreenType?: boolean;
}): Promise<{
  videoUrl: string;
  clipCount: number;
  clipDurations: KlingClipDuration[];
  endpoint: string;
  generationMode: "kling-storyboard-fallback";
  note: string;
  outputDurationSec: number;
  timingSource: "probed" | "reported";
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

  // Re-mirror before parallel Kling clips so stale fal.media stills fail fast.
  imageUrls = await Promise.all(
    imageUrls.map((u) =>
      mirrorImageUrlToFalStorage(u, { clerkId: opts.clerkId, refresh: true }),
    ),
  );

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
  const planHints = parseSceneMotionHintsFromPlan(motionPrompt);

  const { jobId, dir } = await createOwnedJobDir(opts.clerkId);

  // Run Kling I2V in parallel — sequential 4× clips often approaches Hobby's 300s limit.
  const clipUrls = await Promise.all(
    imageUrls.map(async (imageUrl, i) => {
      const duration = clipDurations[i] ?? 5;
      const meta = scenesMeta[i];
      const sceneIndex = i + 1;
      // Prefer per-scene DeepSeek cameraMotionEn, then Scene N block from motion plan.
      // Never embed Chinese marketing copy — Kling burns gibberish glyphs.
      const cameraMotionEn =
        sanitizeKlingMotionHint(meta?.cameraMotionEn) ||
        planHints.get(sceneIndex) ||
        (imageUrls.length === 1
          ? sanitizeKlingMotionHint(motionPrompt.slice(0, 280))
          : undefined);
      const prompt = klingSceneMotionPrompt({
        sceneIndex,
        sceneCount: imageUrls.length,
        // Do NOT pass Chinese sceneDescription as motion — Kling fills screens with gibberish.
        sceneDescription: undefined,
        imagePrompt: meta?.imagePrompt?.slice(0, 120),
        role: meta?.role,
        theme: theme.slice(0, 80),
        cameraMotionEn,
        lightingEn: meta?.lightingEn,
        lookBibleGrade: meta?.lookBibleGrade,
        endWithBrandLogo: Boolean(meta?.useBrandLogo ?? meta?.endWithBrandLogo),
        useBrandLogo: Boolean(meta?.useBrandLogo ?? meta?.endWithBrandLogo),
        preserveOnScreenType: Boolean(opts.preserveOnScreenType),
      });

      const result = await fal.subscribe(KLING_ENDPOINT, {
        input: {
          prompt,
          image_url: imageUrl,
          duration: (duration === 10 ? "10" : "5") as "5" | "10",
          negative_prompt: opts.preserveOnScreenType
            ? KLING_PRESERVE_TYPE_NEGATIVE
            : KLING_TEXTLESS_NEGATIVE,
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
  let durationNote = "";
  let probedOutputSec: number | undefined;
  let timingSource: "probed" | "reported" = "reported";
  if (clipUrls.length === 1) {
    finalUrl = clipUrls[0];
  } else {
    await ensureFfmpeg();
    const clipPaths = await Promise.all(
      clipUrls.map(async (clipUrl, i) => {
        const clipPath = path.join(dir, `kling-${i}.mp4`);
        await materializeMediaInput(clipUrl, clipPath, { clerkId: opts.clerkId });
        return clipPath;
      }),
    );
    const concatPath = path.join(dir, "concat.mp4");
    const outputPath = path.join(dir, "final.mp4");
    await concatVideos(clipPaths, concatPath);
    const compress = await timeCompressVideoToDuration(
      concatPath,
      outputPath,
      totalDurationSec,
    );
    const probedSec = await getMediaDurationSeconds(outputPath);
    if (
      !klingStitchCanHitDuration(compress.sourceSec, totalDurationSec, {
        clipCount: clipUrls.length,
      }) ||
      (totalDurationSec <= 8 && probedSec > totalDurationSec * 1.12)
    ) {
      throw new KlingDurationUnreachableError(
        `Stitched fallback is ~${probedSec.toFixed(1)}s; cannot honestly hit ${totalDurationSec}s (min 5s/clip, max 1.85×). Retry single-clip mode or pick 12s.`,
        probedSec,
      );
    }
    if (compress.applied) {
      durationNote = ` Time-compressed ~${compress.sourceSec.toFixed(0)}s stitch → ~${probedSec.toFixed(1)}s file (target ${totalDurationSec}s).`;
    } else {
      durationNote = ` Stitch file ~${probedSec.toFixed(1)}s.`;
    }
    localBytes = await fs.readFile(outputPath);
    finalUrl = pipelineFileUrl(opts.request, jobId, "final.mp4");
    probedOutputSec = probedSec;
    timingSource = "probed";
  }

  const outputDurationSec =
    probedOutputSec ?? clipDurations.reduce((a, d) => a + (Number(d) || 5), 0);

  const durable = await persistAndDurablize({
    clerkId: opts.clerkId,
    kind: "video",
    sourceUrl: finalUrl,
    fallbackUrl: finalUrl,
    prompt: "kling-seedance-fallback",
    bytes: localBytes,
    contentType: "video/mp4",
    timingManifest: buildSingleClipManifest(outputDurationSec, {
      source: "kling",
      engine: "kling",
      timingSource,
    }),
  });

  return {
    videoUrl: durable,
    clipCount: clipUrls.length,
    clipDurations,
    endpoint: KLING_ENDPOINT,
    generationMode: "kling-storyboard-fallback",
    note: `Per-scene image-to-video (parallel clips) + stitch.${durationNote}`,
    outputDurationSec,
    timingSource,
  };
}
