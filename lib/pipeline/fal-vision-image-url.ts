import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { pipelineFileUrl, resolvePipelineFileUrl } from "@/lib/pipeline/local-input";
import { isLibraryAssetUrl, readLibraryAssetMedia } from "@/lib/storage/durable-media";

function isLocalOrPipelineUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/api/pipeline-files/")) return true;
  try {
    const host = new URL(trimmed).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

async function uploadBytesToFal(
  bytes: ArrayBuffer | Buffer | Uint8Array,
  contentType: string,
  filename = "vision-review.png",
): Promise<string> {
  const type = contentType.split(";")[0]?.trim() || "image/png";
  const buf = Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
  return fal.storage.upload(new File([buf], filename, { type }));
}

/**
 * Fal / Google vision fetch image_urls from the public internet.
 * They cannot use auth-only `/api/library/download/:id` (returns JSON error text)
 * or localhost pipeline URLs — re-host those on fal.storage first.
 */
export async function falVisionImageUrl(
  request: Request,
  imageUrl: string,
): Promise<string> {
  const trimmed = imageUrl.trim();

  // Durable library assets are private (Clerk). Read R2 server-side → fal CDN.
  if (isLibraryAssetUrl(trimmed)) {
    const media = await readLibraryAssetMedia(trimmed);
    if (!media) {
      throw new Error("Could not read library image for vision review.");
    }
    const ext =
      media.contentType.includes("jpeg") || media.contentType.includes("jpg") ? ".jpg"
      : media.contentType.includes("webp") ? ".webp"
      : ".png";
    return uploadBytesToFal(media.bytes, media.contentType, `vision-library${ext}`);
  }

  if (!isLocalOrPipelineUrl(trimmed)) return trimmed;

  const localPath = resolvePipelineFileUrl(trimmed);
  if (localPath) {
    const bytes = await fs.readFile(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const type =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".webp" ? "image/webp"
      : "image/png";
    return uploadBytesToFal(bytes, type, `vision${ext || ".png"}`);
  }

  const absolute = trimmed.startsWith("/")
    ? pipelineFileUrl(
        request,
        trimmed.split("/")[3] ?? "",
        trimmed.split("/")[4]?.split("?")[0] ?? "generated.png",
      )
    : trimmed;
  const res = await fetch(absolute, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch image for vision review (${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const bytes = await res.arrayBuffer();
  return uploadBytesToFal(bytes, contentType);
}
