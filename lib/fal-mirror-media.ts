import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { resolvePipelineFileUrl } from "@/lib/pipeline/local-input";
import { isFalCdnUrl } from "@/lib/pipeline/safe-url";

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
 */
export async function mirrorImageUrlToFalStorage(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("Image URL is required.");
  if (isFalCdnUrl(trimmed)) return trimmed;

  const localPath = resolvePipelineFileUrl(trimmed);
  if (localPath) {
    const buf = await fs.readFile(localPath);
    const type = contentTypeForPath(localPath);
    const file = new File(
      [new Uint8Array(buf)],
      path.basename(localPath) || "source.png",
      { type },
    );
    return fal.storage.upload(file);
  }

  const res = await fetch(trimmed, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch source image for fal (${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const bytes = await res.arrayBuffer();
  const file = new File([bytes], "source.png", { type: contentType });
  return fal.storage.upload(file);
}
