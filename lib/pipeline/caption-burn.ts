import { spawn } from "child_process";
import {
  compositorFontPath,
  ensureCompositorFonts,
  textNeedsCjkFonts,
} from "@/lib/compositor/fonts";
import type { CaptionLine } from "@/lib/ad-pack-types";
import { planCaptionBurnText } from "@/lib/image-canvas-text-layout";
import {
  getFfmpegPath,
  getMediaDurationSeconds,
  getVideoDimensions,
  videoHasAudioStream,
} from "@/lib/pipeline/ffmpeg";

/** Prefer ffmpeg drawtext when forced; otherwise overlay (Latin uses glyph paths). */
export function preferDrawtextCaptionBurn(): boolean {
  const forced = process.env.CAPTION_BURN_DRAWTEXT?.trim();
  if (forced === "1") return true;
  if (forced === "0") return false;
  // Default: overlay. English is rendered as opentype SVG paths (Linux-safe).
  // Drawtext remains a fallback if overlay throws.
  return false;
}

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

function positionX(position: CaptionLine["position"], xPct?: number): string {
  if (typeof xPct === "number" && Number.isFinite(xPct)) {
    return `w*${(Math.min(95, Math.max(5, xPct)) / 100).toFixed(4)}-text_w/2`;
  }
  switch (position ?? "bottom") {
    case "top-left":
    case "bottom-left":
      return "w*0.06";
    case "top-right":
    case "bottom-right":
      return "w*0.94-text_w";
    default:
      return "(w-text_w)/2";
  }
}

function drawtextFontForText(text: string): string {
  const role = textNeedsCjkFonts(text) ? "body" : "latinBold";
  return escapeDrawtextFontPath(compositorFontPath(role));
}

function drawtextFilter(
  fontfile: string,
  text: string,
  position: CaptionLine["position"],
  startSec: number,
  endSec: number,
  yPx: number,
  fontSize: number,
  xPct?: number,
): string {
  const escaped = escapeDrawtextText(text);
  const enable = `between(t\\,${startSec.toFixed(2)}\\,${endSec.toFixed(2)})`;
  // yPx is glyph center; drawtext uses top of text box ≈ center - text_h/2
  return [
    `drawtext=fontfile='${fontfile}'`,
    `text='${escaped}'`,
    `fontsize=${fontSize}`,
    "fontcolor=white",
    "borderw=4",
    "bordercolor=black@0.85",
    `x=${positionX(position, xPct)}`,
    `y=${yPx}-text_h/2`,
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
  const duration = await getMediaDurationSeconds(inputVideo);
  const hasAudio = await videoHasAudioStream(inputVideo);
  const { width, height } = await getVideoDimensions(inputVideo);

  const filters: string[] = [];
  for (const cap of captionLines) {
    const startSec = Math.max(0, cap.startSec);
    const endSec = Math.min(duration, Math.max(startSec + 0.2, cap.endSec));
    const plan = planCaptionBurnText(cap.text, width, height, {
      position: cap.position,
      fontSizeScale: cap.style?.fontSizeScale,
    });
    let lineYs = plan.lineYs;
    if (typeof cap.yPct === "number" && Number.isFinite(cap.yPct)) {
      const centerY = Math.round(
        (Math.min(95, Math.max(5, cap.yPct)) / 100) * height,
      );
      const blockH = plan.fontSize * Math.max(1, plan.lines.length) * 1.15;
      const startY = centerY - blockH / 2 + plan.fontSize * 0.85;
      lineYs = plan.lines.map((_, i) =>
        Math.round(startY + i * plan.fontSize * 1.15),
      );
    }
    plan.lines.forEach((chunk, lineIndex) => {
      filters.push(
        drawtextFilter(
          drawtextFontForText(chunk),
          chunk,
          cap.position,
          startSec,
          endSec,
          lineYs[lineIndex] ?? lineYs[0] ?? Math.round(height * 0.9),
          plan.fontSize,
          cap.xPct,
        ),
      );
    });
  }

  if (filters.length === 0) {
    throw new Error("No caption lines to burn.");
  }

  const args = [
    "-y",
    "-i",
    inputVideo,
    "-vf",
    filters.join(","),
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  ];
  if (hasAudio) {
    args.push("-map", "0:a:0", "-c:a", "copy");
  }
  args.push(outputVideo);

  await run(getFfmpegPath(), args);
}
