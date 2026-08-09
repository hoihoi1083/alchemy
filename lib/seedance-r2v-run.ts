import { fal } from "@fal-ai/client";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import { VIDEO1_SPINE_SCREENPLAY } from "@/lib/prompt-balance-contract";
import { softenSeedancePromptForModeration } from "@/lib/seedance-moderation";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import { ensureSeedanceReferenceTags } from "@/lib/video-engine-prompt-adapters";
import { buildSingleClipManifest } from "@/lib/video-timing-manifest";

const SEEDANCE_R2V_QUALITY = "bytedance/seedance-2.0/reference-to-video";

function extractVideoUrl(resultData: unknown): string | undefined {
  if (!resultData || typeof resultData !== "object") return undefined;
  if ("video" in resultData) {
    const video = (resultData as { video?: { url?: unknown } }).video;
    if (video && typeof video.url === "string") return video.url;
  }
  return undefined;
}

function clampSeedanceDuration(raw: number): number {
  if (!Number.isFinite(raw)) return 8;
  return Math.min(15, Math.max(4, Math.round(raw)));
}

export type RunSeedanceR2vInput = {
  clerkId: string;
  prompt: string;
  durationSec: number;
  aspectRatio?: string;
  resolution?: string;
  imageUrls: string[];
  videoUrls: string[];
};

/**
 * Quality Seedance reference-to-video (never /fast).
 * Requires stills + @Video1 — do not call for I2V / stills-only.
 */
export async function runSeedanceStoryboardR2v(input: RunSeedanceR2vInput): Promise<{
  videoUrl: string;
  endpoint: string;
  generationMode: "seedance-storyboard-r2v";
  durationSec: number;
}> {
  const imageUrls = (
    await Promise.all(
      input.imageUrls.slice(0, 9).map((u) =>
        mirrorImageUrlToFalStorage(u, { clerkId: input.clerkId, refresh: true }),
      ),
    )
  ).filter(Boolean);
  const videoUrls = input.videoUrls.slice(0, 3).filter(Boolean);
  if (!imageUrls.length) {
    throw new Error("Seedance R2V needs storyboard scene stills.");
  }
  if (!videoUrls.length) {
    throw new Error("Seedance R2V needs @Video1 — do not use image-to-video.");
  }

  const durationSec = clampSeedanceDuration(input.durationSec);
  const softened = softenSeedancePromptForModeration(input.prompt);
  const { prompt: tagged } = ensureSeedanceReferenceTags(
    softened,
    imageUrls.length,
    videoUrls.length,
    0,
  );
  let prompt = tagged.trim();
  if (!/spine/i.test(prompt)) {
    prompt = `${VIDEO1_SPINE_SCREENPLAY} ${prompt}`.trim();
  }

  const aspectRatio = input.aspectRatio?.trim() || "9:16";
  const resolution =
    input.resolution === "480p" || input.resolution === "720p" ? "720p" : "1080p";

  const result = await fal.subscribe(SEEDANCE_R2V_QUALITY, {
    input: {
      prompt,
      duration: String(durationSec),
      aspect_ratio: aspectRatio === "auto" ? "9:16" : aspectRatio,
      resolution,
      generate_audio: false,
      image_urls: imageUrls,
      video_urls: videoUrls,
    },
    logs: true,
  });

  const rawUrl = extractVideoUrl(result.data);
  if (!rawUrl) throw new Error("Seedance R2V returned no video.");

  const videoUrl = await persistAndDurablize({
    clerkId: input.clerkId,
    kind: "video",
    sourceUrl: rawUrl,
    fallbackUrl: rawUrl,
    prompt: prompt.slice(0, 500),
    timingManifest: buildSingleClipManifest(durationSec, {
      source: "seedance",
      engine: "seedance",
      timingSource: "reported",
    }),
  });

  return {
    videoUrl,
    endpoint: SEEDANCE_R2V_QUALITY,
    generationMode: "seedance-storyboard-r2v",
    durationSec,
  };
}
