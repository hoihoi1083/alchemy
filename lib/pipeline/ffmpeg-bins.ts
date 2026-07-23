import { accessSync, constants } from "fs";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

/**
 * Resolve ffmpeg/ffprobe binaries for local Mac (PATH) and Vercel (static npm bins).
 * System PATH is preferred when present so local brew installs still work.
 */

function isExecutable(filePath: string | null | undefined): filePath is string {
  if (!filePath?.trim()) return false;
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    try {
      accessSync(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

let resolvedFfmpeg: string | null = null;
let resolvedFfprobe: string | null = null;

export function getFfmpegPath(): string {
  if (resolvedFfmpeg) return resolvedFfmpeg;
  if (isExecutable(ffmpegStatic)) {
    resolvedFfmpeg = ffmpegStatic;
    return resolvedFfmpeg;
  }
  resolvedFfmpeg = "ffmpeg";
  return resolvedFfmpeg;
}

export function getFfprobePath(): string {
  if (resolvedFfprobe) return resolvedFfprobe;
  const staticPath =
    typeof ffprobeStatic === "object" && ffprobeStatic && "path" in ffprobeStatic
      ? String((ffprobeStatic as { path: string }).path)
      : null;
  if (isExecutable(staticPath)) {
    resolvedFfprobe = staticPath;
    return resolvedFfprobe;
  }
  resolvedFfprobe = "ffprobe";
  return resolvedFfprobe;
}
