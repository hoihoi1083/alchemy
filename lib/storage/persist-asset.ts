import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { WithId } from "mongodb";
import {
  findAssetBySource,
  insertAsset,
  updateAssetContent,
  updateAssetTiming,
} from "@/lib/db/assets";
import type { AssetKind, DbAsset } from "@/lib/db/types";
import { isMongoConfigured } from "@/lib/mongodb";
import { resolvePipelineFileUrl, pipelineJobIdFromUrl } from "@/lib/pipeline/local-input";
import { isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import { isR2Configured, mirrorRemoteToR2, putR2Object } from "@/lib/storage/r2";
import type { VideoTimingManifest } from "@/lib/video-timing-manifest";
import { parseTimingManifest } from "@/lib/video-timing-manifest";

const EXT_BY_KIND: Record<AssetKind, string> = {
  image: "png",
  video: "mp4",
  audio: "mp3",
  voiceover: "mp4",
};

function isMirrorableUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  // Already in our own storage — skip.
  if (u.includes(".r2.cloudflarestorage.com") || u.includes("r2.dev")) return false;
  if (u.includes("/api/library/download/")) return false;
  // Pipeline scratch must go through owned local-disk path, never remote fetch.
  if (u.includes("/api/pipeline-files/")) return false;
  return true;
}

function extFromContentType(contentType: string, kind: AssetKind): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  return EXT_BY_KIND[kind];
}

function contentTypeFromExt(filePath: string, kind: AssetKind): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (kind === "video" || kind === "voiceover") return "video/mp4";
  if (kind === "audio") return "audio/mpeg";
  return "image/png";
}

/** Reject HTML/JSON error pages that were accidentally mirrored. */
export function assertMediaBytes(contentType: string, body: Uint8Array | Buffer): void {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/json") || ct.includes("text/plain")) {
    throw new Error(`Refusing to store non-media content-type: ${contentType}`);
  }
  // PNG / JPEG / WebP / MP4 magic — catch mislabeled HTML.
  if (body.length >= 4) {
    const b0 = body[0];
    const b1 = body[1];
    const b2 = body[2];
    const b3 = body[3];
    const looksHtml =
      (b0 === 0x3c && b1 === 0x21) || // <!
      (b0 === 0x3c && b1 === 0x68) || // <h
      (b0 === 0x3c && b1 === 0x48) || // <H
      (b0 === 0x3c && b1 === 0x64) || // <d
      (b0 === 0x3c && b1 === 0x44); // <D
    if (looksHtml) {
      throw new Error("Refusing to store HTML body as media.");
    }
  }
}

/**
 * Mirror a remote (fal/CDN) output into R2 and record it as a durable asset.
 * Best-effort and idempotent per (clerkId, sourceUrl). Returns null when
 * storage/db is unavailable or the URL is not mirrorable — never throws.
 *
 * Pipeline-file URLs are read from local disk (never HTTP — that returns
 * Clerk HTML without cookies). Pass `bytes` to skip fetch entirely.
 */
export async function persistUserAsset(input: {
  clerkId: string;
  projectId?: string | null;
  kind: AssetKind;
  sourceUrl: string;
  name?: string | null;
  prompt?: string | null;
  bytes?: Buffer | Uint8Array;
  contentType?: string;
  timingManifest?: VideoTimingManifest | null;
}): Promise<WithId<DbAsset> | null> {
  if (!isMongoConfigured() || !isR2Configured()) return null;

  const hasBytes = input.bytes != null && input.bytes.length > 0;
  if (!hasBytes && !isMirrorableUrl(input.sourceUrl) && !isPipelineFileUrl(input.sourceUrl)) {
    return null;
  }
  const timing = parseTimingManifest(input.timingManifest);

  try {
    const existing = await findAssetBySource(input.clerkId, input.sourceUrl);
    if (existing) {
      // Do not return a known-bad HTML asset as "success".
      if (!existing.contentType.toLowerCase().includes("text/html")) {
        if (timing) {
          const updated = await updateAssetTiming(String(existing._id), timing);
          return updated ?? existing;
        }
        return existing;
      }
    }

    const provisionalExt = EXT_BY_KIND[input.kind];
    const key =
      existing?.r2Key ??
      `users/${input.clerkId}/${input.kind}/${randomUUID()}.${provisionalExt}`;

    let put: { key: string; contentType: string };

    if (hasBytes) {
      const contentType = input.contentType ?? "application/octet-stream";
      assertMediaBytes(contentType, input.bytes!);
      put = await putR2Object(key, Buffer.from(input.bytes!), contentType);
    } else if (isPipelineFileUrl(input.sourceUrl)) {
      // Read the real file from disk — never HTTP-fetch localhost (Clerk HTML).
      const jobId = pipelineJobIdFromUrl(input.sourceUrl);
      if (!jobId) {
        throw new Error("Invalid pipeline media URL.");
      }
      const { assertJobOwnedBy } = await import("@/lib/pipeline/job-owner");
      if (!(await assertJobOwnedBy(jobId, input.clerkId))) {
        throw new Error("Pipeline media not found or not owned by this user.");
      }
      const localPath = resolvePipelineFileUrl(input.sourceUrl);
      if (!localPath) {
        throw new Error("Pipeline file path could not be resolved.");
      }
      const bytes = await fs.readFile(localPath);
      const contentType = contentTypeFromExt(localPath, input.kind);
      assertMediaBytes(contentType, bytes);
      put = await putR2Object(key, bytes, contentType);
    } else {
      put = await mirrorRemoteToR2(input.sourceUrl, key);
      // mirrorRemoteToR2 also validates; double-check stored type.
      if (put.contentType.toLowerCase().includes("text/html")) {
        throw new Error("Remote mirror returned HTML.");
      }
    }

    // Re-check dedupe in case a concurrent save mirrored the same URL.
    const raced = await findAssetBySource(input.clerkId, input.sourceUrl);
    if (raced && !raced.contentType.toLowerCase().includes("text/html")) {
      if (timing) {
        const updated = await updateAssetTiming(String(raced._id), timing);
        return updated ?? raced;
      }
      return raced;
    }

    if (existing && existing.contentType.toLowerCase().includes("text/html")) {
      // Repair path: overwrite the bad object; update Mongo metadata.
      const repaired = await updateAssetContent(String(existing._id), {
        r2Key: put.key,
        contentType: put.contentType ?? "application/octet-stream",
        sizeBytes: null,
      });
      if (repaired && timing) {
        return (await updateAssetTiming(String(repaired._id), timing)) ?? repaired;
      }
      return repaired;
    }

    return await insertAsset({
      clerkId: input.clerkId,
      projectId: input.projectId ?? null,
      kind: input.kind,
      sourceUrl: input.sourceUrl,
      r2Key: put.key,
      contentType: put.contentType ?? "application/octet-stream",
      name: input.name ?? null,
      prompt: input.prompt ?? null,
      timingManifest: timing,
    });
  } catch {
    return null;
  }
}

export { extFromContentType };
