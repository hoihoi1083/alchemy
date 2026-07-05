import { promises as fs } from "fs";
import path from "path";
import { jobDir, isValidJobId } from "@/lib/pipeline/paths";
import { assertSafeRemoteMediaUrl } from "@/lib/pipeline/safe-url";

export const PIPELINE_FILES = new Set([
  "input.mp4",
  "corrected.srt",
  "dubbed.wav",
  "final.mp4",
  "subtitled.mp4",
  "visual-subtitled.mp4",
  "with-bgm.mp4",
  "with-voice.mp4",
  "composed.png",
  "composed.mp4",
  "captions.srt",
  "narration.mp3",
  "narration-fit.wav",
  "custom-bgm.mp3",
  "preview-voice-0.mp3",
  "preview-voice-1.mp3",
  "preview-voice-2.mp3",
]);

function pipelinePathname(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith("/api/pipeline-files/")) {
    return trimmed.split("?")[0];
  }
  try {
    return new URL(trimmed).pathname;
  } catch {
    return null;
  }
}

/** Map a pipeline-files URL to a local path when this server owns the job. */
export function resolvePipelineFileUrl(url: string): string | null {
  const pathname = pipelinePathname(url);
  if (!pathname) return null;

  const match = pathname.match(/^\/api\/pipeline-files\/([^/]+)\/([^/]+)$/);
  if (!match) return null;

  const [, jobId, file] = match;
  if (!isValidJobId(jobId)) return null;
  if (!PIPELINE_FILES.has(file)) return null;

  return path.join(jobDir(jobId), file);
}

/** Download remote media or copy a local pipeline job file into destPath. */
export async function materializeMediaInput(url: string, destPath: string): Promise<void> {
  const localPath = resolvePipelineFileUrl(url);
  if (localPath) {
    await fs.copyFile(localPath, destPath);
    return;
  }

  const safeUrl = assertSafeRemoteMediaUrl(url);
  const res = await fetch(safeUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status} ${res.statusText}`);
  }
  const data = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, data);
}

export function pipelineFileUrl(request: Request, jobId: string, file: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}/api/pipeline-files/${jobId}/${file}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}/api/pipeline-files/${jobId}/${file}`;
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}/api/pipeline-files/${jobId}/${file}`;
}
