/**
 * Caption 2 Picture-phase video edit: ModelArk Seedance first, fal R2V fallback.
 */

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fal } from "@fal-ai/client";
import { byteplusApiKey } from "@/lib/byteplus-ark";
import {
  buildCaptionEditPrompt,
  runByteplusSeedanceEdit,
  type CaptionEditJob,
} from "@/lib/byteplus-seedance-edit";
import { estimateCaptionVideoEditTokens } from "@/lib/billing/token-costs";
import { mirrorImageUrlToFalStorage } from "@/lib/fal-mirror-media";
import {
  ensureFfmpeg,
  scaleVideoToMinPixelCount,
  SEEDANCE_MIN_REF_PIXELS,
} from "@/lib/pipeline/ffmpeg";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { assertPublicHttpUrl } from "@/lib/pipeline/safe-url";
import { persistAndDurablize } from "@/lib/storage/durable-media";

const FAL_R2V = "bytedance/seedance-2.0/fast/reference-to-video";

export type CaptionVideoEditProvider = "byteplus-modelark" | "fal-seedance";

export { estimateCaptionVideoEditTokens };

export function captionVideoEditPreferredProvider(): CaptionVideoEditProvider {
  return byteplusApiKey() ? "byteplus-modelark" : "fal-seedance";
}

function extractFalVideoUrl(resultData: unknown): string | undefined {
  if (!resultData || typeof resultData !== "object") return undefined;
  if ("video" in resultData) {
    const video = (resultData as { video?: { url?: unknown } }).video;
    if (video && typeof video.url === "string") return video.url;
  }
  return undefined;
}

/** Download provider output so R2 persist does not depend on allowlisted mirror fetch. */
async function persistEditedVideo(opts: {
  clerkId: string;
  remoteUrl: string;
  job: CaptionEditJob;
}): Promise<string> {
  assertPublicHttpUrl(opts.remoteUrl);
  const res = await fetch(opts.remoteUrl, { cache: "no-store" });
  if (!res.ok) {
    // Fall back to URL-only persist (allowlist now includes volces.com).
    return persistAndDurablize({
      clerkId: opts.clerkId,
      kind: "video",
      sourceUrl: opts.remoteUrl,
      fallbackUrl: opts.remoteUrl,
      name: `caption-edit-${opts.job}`,
    });
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";
  return persistAndDurablize({
    clerkId: opts.clerkId,
    kind: "video",
    sourceUrl: opts.remoteUrl,
    fallbackUrl: opts.remoteUrl,
    name: `caption-edit-${opts.job}`,
    bytes,
    contentType,
  });
}

/**
 * Library / localhost URLs → fal CDN. Upscales if under Seedance min pixel count.
 */
async function publicVideoForSeedanceEdit(
  clerkId: string,
  videoUrl: string,
): Promise<string> {
  await ensureFfmpeg();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "caption-edit-"));
  try {
    const input = path.join(dir, "in.mp4");
    const prepared = path.join(dir, "prepared.mp4");
    await materializeMediaInput(videoUrl, input, { clerkId });
    await scaleVideoToMinPixelCount(input, prepared, SEEDANCE_MIN_REF_PIXELS);
    const buf = await fs.readFile(prepared);
    const file = new File([new Uint8Array(buf)], "seedance-ref.mp4", {
      type: "video/mp4",
    });
    return fal.storage.upload(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runCaptionVideoEdit(opts: {
  clerkId: string;
  videoUrl: string;
  imageUrl?: string;
  job: CaptionEditJob;
  note?: string;
  durationSec?: number;
  resolution?: "480p" | "720p";
  signal?: AbortSignal;
}): Promise<{
  videoUrl: string;
  provider: CaptionVideoEditProvider;
  modelOrEndpoint: string;
  tokenCost: number;
  prompt: string;
}> {
  const hasRef = Boolean(opts.imageUrl?.trim());
  if (!hasRef && !(opts.note || "").trim()) {
    throw new Error("Add a reference photo or a short note before generating.");
  }
  const prompt = buildCaptionEditPrompt({
    job: opts.job,
    note: opts.note,
    hasRefImage: hasRef,
  });
  const durationSec = Math.max(4, Math.min(15, Math.round(opts.durationSec ?? 8)));
  const resolution = opts.resolution || "720p";
  const tokenCost = estimateCaptionVideoEditTokens(durationSec);

  const publicVideoUrl = await publicVideoForSeedanceEdit(
    opts.clerkId,
    opts.videoUrl,
  );
  const publicImageUrl = opts.imageUrl?.trim()
    ? await mirrorImageUrlToFalStorage(opts.imageUrl.trim(), {
        clerkId: opts.clerkId,
        refresh: true,
      })
    : undefined;

  if (byteplusApiKey()) {
    try {
      const out = await runByteplusSeedanceEdit({
        videoUrl: publicVideoUrl,
        imageUrl: publicImageUrl,
        prompt,
        resolution,
        signal: opts.signal,
      });
      const durable = await persistEditedVideo({
        clerkId: opts.clerkId,
        remoteUrl: out.videoUrl,
        job: opts.job,
      });
      return {
        videoUrl: durable,
        provider: "byteplus-modelark",
        modelOrEndpoint: out.model,
        tokenCost,
        prompt,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/not configured/i.test(msg)) throw e;
      console.warn("[caption-video-edit] ModelArk failed, trying fal:", msg.slice(0, 200));
    }
  }

  const result = await fal.subscribe(FAL_R2V, {
    input: {
      prompt,
      duration: String(durationSec),
      aspect_ratio: "auto",
      resolution,
      generate_audio: false,
      image_urls: publicImageUrl ? [publicImageUrl] : [],
      video_urls: [publicVideoUrl],
    },
    logs: true,
  });
  const rawUrl = extractFalVideoUrl(result.data);
  if (!rawUrl) throw new Error("fal Seedance edit returned no video.");
  const durable = await persistEditedVideo({
    clerkId: opts.clerkId,
    remoteUrl: rawUrl,
    job: opts.job,
  });
  return {
    videoUrl: durable,
    provider: "fal-seedance",
    modelOrEndpoint: FAL_R2V,
    tokenCost,
    prompt,
  };
}
