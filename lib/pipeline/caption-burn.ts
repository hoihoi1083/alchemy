import { spawn } from "child_process";
import { compositorFontPath, ensureCompositorFonts } from "@/lib/compositor/fonts";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { getMediaDurationSeconds } from "@/lib/pipeline/ffmpeg";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
  });
}

function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

function escapeDrawtextFontPath(fontPath: string): string {
  return fontPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function positionCoords(
  position: CaptionLine["position"],
  lineIndex: number,
  lineCount: number,
): { x: string; y: string } {
  const stack = lineIndex * 52;
  const centerStack = (lineIndex - (lineCount - 1) / 2) * 52;
  switch (position ?? "bottom") {
    case "top":
      return { x: "(w-text_w)/2", y: String(96 + stack) };
    case "center":
      return { x: "(w-text_w)/2", y: `(h-text_h)/2+${Math.round(centerStack)}` };
    case "top-left":
      return { x: "w*0.06", y: String(96 + stack) };
    case "top-right":
      return { x: "w*0.94-text_w", y: String(96 + stack) };
    case "bottom-left":
      return { x: "w*0.06", y: `h*0.90-text_h-${stack}` };
    case "bottom-right":
      return { x: "w*0.94-text_w", y: `h*0.90-text_h-${stack}` };
    case "bottom":
    default:
      return { x: "(w-text_w)/2", y: `h*0.90-text_h-${stack}` };
  }
}

function drawtextFilter(
  fontfile: string,
  text: string,
  position: CaptionLine["position"],
  startSec: number,
  endSec: number,
  lineIndex: number,
  lineCount: number,
): string {
  const { x, y } = positionCoords(position, lineIndex, lineCount);
  const escaped = escapeDrawtextText(text);
  const enable = `between(t\\,${startSec.toFixed(2)}\\,${endSec.toFixed(2)})`;
  return [
    `drawtext=fontfile='${fontfile}'`,
    `text='${escaped}'`,
    "fontsize=44",
    "fontcolor=white",
    "borderw=4",
    "bordercolor=black@0.85",
    `x=${x}`,
    `y=${y}`,
    `enable='${enable}'`,
  ].join(":");
}

/** Burn captions as visible pixels — supports overlapping lines at different positions. */
export async function burnCaptionsDrawtext(
  inputVideo: string,
  captionLines: CaptionLine[],
  outputVideo: string,
): Promise<void> {
  ensureCompositorFonts();
  const fontfile = escapeDrawtextFontPath(compositorFontPath("body"));
  const duration = await getMediaDurationSeconds(inputVideo);

  const filters: string[] = [];
  for (const cap of captionLines) {
    const startSec = Math.max(0, cap.startSec);
    const endSec = Math.min(duration, Math.max(startSec + 0.2, cap.endSec));
    const chunks = cap.text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    chunks.forEach((chunk, lineIndex) => {
      filters.push(
        drawtextFilter(
          fontfile,
          chunk,
          cap.position,
          startSec,
          endSec,
          lineIndex,
          chunks.length,
        ),
      );
    });
  }

  if (filters.length === 0) {
    throw new Error("No caption lines to burn.");
  }

  await run("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-vf",
    filters.join(","),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    outputVideo,
  ]);
}
