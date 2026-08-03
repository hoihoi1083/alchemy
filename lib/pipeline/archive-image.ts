import { promises as fs } from "fs";
import path from "path";
import { jobDir } from "@/lib/pipeline/paths";
import { createOwnedJobDir } from "@/lib/pipeline/job-owner";
import { materializeMediaInput } from "@/lib/pipeline/local-input";
import { studioSlideFileName } from "@/lib/pipeline/studio-slide-files";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import { persistAndDurablize } from "@/lib/storage/durable-media";

function contentTypeForArchiveFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  return "image/png";
}

/**
 * Copy remote/library media into an owned job dir, then persist to R2 library.
 * Returns a durable `/api/library/download/:id` URL (not ephemeral pipeline /tmp).
 */
export async function archiveRemoteImageToPipeline(
  _request: Request,
  remoteUrl: string,
  fileName: string,
  clerkId: string,
  jobId?: string,
): Promise<string> {
  if (isLibraryAssetUrl(remoteUrl)) return remoteUrl;

  let id = jobId;
  let dir: string;
  if (id) {
    dir = jobDir(id);
    await fs.mkdir(dir, { recursive: true });
  } else {
    ({ jobId: id, dir } = await createOwnedJobDir(clerkId));
  }
  const dest = path.join(dir, fileName);
  await materializeMediaInput(remoteUrl, dest, { clerkId });
  const bytes = await fs.readFile(dest);
  const sourceKey =
    remoteUrl.startsWith("http://") || remoteUrl.startsWith("https://")
      ? remoteUrl
      : `archive://${id}/${fileName}`;
  const durable = await persistAndDurablize({
    clerkId,
    kind: fileName.toLowerCase().endsWith(".mp4") ? "video" : "image",
    sourceUrl: sourceKey,
    fallbackUrl: sourceKey,
    bytes,
    contentType: contentTypeForArchiveFile(fileName),
    name: fileName,
  });
  if (!isLibraryAssetUrl(durable)) {
    throw new Error(
      "Could not save archived media to My library. Configure cloud storage (R2) and try again.",
    );
  }
  return durable;
}

/** Archive every slide and return durable library URLs. */
export async function archiveCampaignSlidesToPipeline(
  request: Request,
  remoteUrls: string[],
  clerkId: string,
): Promise<string[]> {
  const { jobId } = await createOwnedJobDir(clerkId);
  const archived: string[] = [];
  for (let i = 0; i < remoteUrls.length; i++) {
    const url = remoteUrls[i];
    if (!url?.startsWith("http") && !isLibraryAssetUrl(url)) continue;
    archived.push(
      await archiveRemoteImageToPipeline(
        request,
        url,
        studioSlideFileName(i),
        clerkId,
        jobId,
      ),
    );
  }
  return archived;
}
