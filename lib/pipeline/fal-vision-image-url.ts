import { promises as fs } from "fs";
import path from "path";
import { fal } from "@fal-ai/client";
import { pipelineFileUrl, resolvePipelineFileUrl } from "@/lib/pipeline/local-input";

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

/** Fal vision cannot fetch localhost — upload pipeline/local images to fal storage first. */
export async function falVisionImageUrl(
  request: Request,
  imageUrl: string,
): Promise<string> {
  const trimmed = imageUrl.trim();
  if (!isLocalOrPipelineUrl(trimmed)) return trimmed;

  const localPath = resolvePipelineFileUrl(trimmed);
  if (localPath) {
    const bytes = await fs.readFile(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const type =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".webp" ? "image/webp"
      : "image/png";
    return fal.storage.upload(new File([bytes], `vision${ext || ".png"}`, { type }));
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
  return fal.storage.upload(new File([bytes], "vision-review.png", { type: contentType }));
}
