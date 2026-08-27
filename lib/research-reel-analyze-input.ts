import type { ContentPlatform } from "@/lib/content-research-types";
import {
  fetchResearchPostVideoBytes,
  isAllowedResearchVideoUrl,
} from "@/lib/research-post-video-fetch";

export type ResolvedResearchReelVideo = {
  bytes: Buffer;
  source: "cdn_url" | "upload";
};

/** Full source reel bytes for analyze — server fetch avoids Vercel body limits. */
export async function resolveResearchReelVideoBytes(input: {
  referenceVideoUrl?: string | null;
  platform?: ContentPlatform | string | null;
  referenceVideo?: File | null;
}): Promise<ResolvedResearchReelVideo> {
  const url = input.referenceVideoUrl?.trim() ?? "";
  const platform = (String(input.platform ?? "").trim() ||
    "tiktok") as ContentPlatform;

  if (url) {
    if (!isAllowedResearchVideoUrl(url)) {
      throw new Error("Invalid research video URL.");
    }
    const fetched = await fetchResearchPostVideoBytes(url, platform);
    if (!fetched.ok || !fetched.buffer) {
      throw new Error(
        fetched.error === "too_large"
          ? "Research reel is too large to analyze (over 50MB)."
          : "Could not fetch the research reel for analysis.",
      );
    }
    return { bytes: Buffer.from(fetched.buffer), source: "cdn_url" };
  }

  const file = input.referenceVideo;
  if (file instanceof File && file.size > 0) {
    return {
      bytes: Buffer.from(await file.arrayBuffer()),
      source: "upload",
    };
  }

  throw new Error("Upload a reference reel MP4.");
}

/** Upload fal @Video1 clip after analyze — trimmed to H3/Seedance limits + Vercel-safe size. */
export async function uploadPreparedResearchReferenceClip(
  sourceBytes: Buffer,
): Promise<{
  videoUrl: string;
  referenceDigestMontage: boolean;
  sourceDurationSec: number;
  referenceDurationSec: number;
  preparedBytes: number;
}> {
  const { fal } = await import("@fal-ai/client");
  const {
    buildWizardResearchReferenceClip,
    MINIMAX_MAX_REFERENCE_SEC,
  } = await import("@/lib/reference-video-prepare");

  const clip = await buildWizardResearchReferenceClip(
    sourceBytes,
    MINIMAX_MAX_REFERENCE_SEC,
  );
  const videoUrl = await fal.storage.upload(
    new File([new Uint8Array(clip.buffer)], "research-ref-clip.mp4", {
      type: "video/mp4",
    }),
  );
  return {
    videoUrl,
    referenceDigestMontage: clip.digestMontage,
    sourceDurationSec: clip.sourceDurationSec,
    referenceDurationSec: clip.durationSec,
    preparedBytes: clip.buffer.byteLength,
  };
}
