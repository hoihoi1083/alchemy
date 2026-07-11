import { promises as fs } from "fs";
import path from "path";
import { jobDir } from "@/lib/pipeline/paths";
import { materializeMediaInput, pipelineFileUrl } from "@/lib/pipeline/local-input";
import { studioSlideFileName } from "@/lib/pipeline/studio-slide-files";

/** Copy a remote fal/CDN image into pipeline storage for durable download URLs. */
export async function archiveRemoteImageToPipeline(
  request: Request,
  remoteUrl: string,
  fileName: string,
  jobId?: string,
): Promise<string> {
  const id = jobId ?? crypto.randomUUID();
  const dir = jobDir(id);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, fileName);
  await materializeMediaInput(remoteUrl, dest);
  return pipelineFileUrl(request, id, fileName);
}

/** Archive every slide in one campaign job folder. */
export async function archiveCampaignSlidesToPipeline(
  request: Request,
  remoteUrls: string[],
): Promise<string[]> {
  const jobId = crypto.randomUUID();
  const archived: string[] = [];
  for (let i = 0; i < remoteUrls.length; i++) {
    const url = remoteUrls[i];
    if (!url?.startsWith("http")) continue;
    archived.push(
      await archiveRemoteImageToPipeline(request, url, studioSlideFileName(i), jobId),
    );
  }
  return archived;
}
