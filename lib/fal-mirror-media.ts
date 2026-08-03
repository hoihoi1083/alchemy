import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import {
  pipelineJobIdFromUrl,
  resolvePipelineFileUrl,
} from "@/lib/pipeline/local-input";
import { assertSafeRemoteMediaUrl, isFalCdnUrl } from "@/lib/pipeline/safe-url";
import { isLibraryAssetUrl, readLibraryAssetMedia } from "@/lib/storage/durable-media";

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

/**
 * fal/HeyGen/Seedance run on fal servers — they cannot fetch localhost or
 * authenticated pipeline URLs. Mirror to fal storage before API calls.
 * `clerkId` required for private library assets and pipeline job files.
 */
export async function mirrorImageUrlToFalStorage(
  url: string,
  opts?: { clerkId?: string },
): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("Image URL is required.");
  if (isFalCdnUrl(trimmed)) return trimmed;

  const localPath = resolvePipelineFileUrl(trimmed);
  if (localPath) {
    const clerkId = opts?.clerkId?.trim();
    if (!clerkId) {
      throw new Error("clerkId is required to mirror a pipeline asset.");
    }
    const jobId = pipelineJobIdFromUrl(trimmed);
    if (!jobId) {
      throw new Error("Invalid pipeline media URL.");
    }
    const { assertJobOwnedBy } = await import("@/lib/pipeline/job-owner");
    if (!(await assertJobOwnedBy(jobId, clerkId))) {
      throw new Error("Pipeline media not found or not owned by this user.");
    }
    const buf = await fs.readFile(localPath);
    const type = contentTypeForPath(localPath);
    const file = new File(
      [new Uint8Array(buf)],
      path.basename(localPath) || "source.png",
      { type },
    );
    return fal.storage.upload(file);
  }

  if (isLibraryAssetUrl(trimmed)) {
    const clerkId = opts?.clerkId?.trim();
    if (!clerkId) {
      throw new Error("clerkId is required to mirror a library asset.");
    }
    const media = await readLibraryAssetMedia(trimmed, clerkId);
    if (!media) {
      throw new Error("Library media not found or storage unavailable.");
    }
    const type = media.contentType.split(";")[0]?.trim() || "image/png";
    const file = new File([new Uint8Array(media.bytes)], "source.png", { type });
    return fal.storage.upload(file);
  }

  // Remote URL: validate against SSRF (blocks private/internal hosts and
  // non-allowlisted domains) before fetching a user-supplied URL.
  assertSafeRemoteMediaUrl(trimmed);
  const res = await fetch(trimmed, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch source image for fal (${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const bytes = await res.arrayBuffer();
  const file = new File([bytes], "source.png", { type: contentType });
  return fal.storage.upload(file);
}
