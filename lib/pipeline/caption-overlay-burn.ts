import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { planCaptionBurnText } from "@/lib/image-canvas-text-layout";
import {
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { burnTextSvgPaths } from "@/lib/compositor/latin-text-paths";
import type { CaptionLine } from "@/lib/ad-pack-types";
import {
  resolveCaptionBurnStyle,
  resolveLineCaptionStyle,
  type CaptionBurnStyle,
} from "@/lib/caption-burn-styles";
import {
  getFfmpegPath,
  getMediaDurationSeconds,
  getVideoDimensions,
  videoHasAudioStream,
} from "@/lib/pipeline/ffmpeg";

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

function layoutX(
  position: CaptionLine["position"],
  width: number,
): { x: number; anchor: "start" | "middle" | "end" } {
  const marginX = Math.round(width * 0.06);
  switch (position ?? "bottom") {
    case "top-left":
    case "bottom-left":
      return { x: marginX, anchor: "start" };
    case "top-right":
    case "bottom-right":
      return { x: width - marginX, anchor: "end" };
    default:
      return { x: Math.round(width / 2), anchor: "middle" };
  }
}

async function renderCaptionOverlayPng(
  width: number,
  height: number,
  caption: CaptionLine,
  style: CaptionBurnStyle,
): Promise<Buffer> {
  const preset = resolveCaptionBurnStyle(style);
  const plan = planCaptionBurnText(caption.text, width, height, {
    fontSizeScale: preset.fontSizeScale ?? 1,
    position: caption.position,
  });
  const chunks = plan.lines.map((line) => sanitizeCompositorText(line));
  const fontSize = plan.fontSize;
  const stroke = Math.max(
    2,
    Math.round(fontSize * 0.12 * (preset.strokeWidthScale ?? 1)),
  );
  const fill = preset.fill ?? "white";
  const strokeColor = preset.stroke ?? "black";
  const fontWeight = preset.fontWeight ?? 700;
  const bold = fontWeight >= 600;
  const { x, anchor } = layoutX(caption.position, width);
  const preferred =
    preset.fontFamily === "NotoDisplay" ? ("headline" as const) : ("body" as const);

  // Always outline glyphs — Sharp @font-face tofu on Vercel for EN and CJK.
  const body = burnTextSvgPaths({
    lines: chunks,
    lineYs: plan.lineYs,
    x,
    anchor,
    fontSize,
    bold,
    preferred,
    fill,
    stroke: strokeColor,
    strokeWidth: stroke,
  });

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${body}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Reject overlay PNGs that painted .notdef tofu / empty glyphs.
 * Sharp+SVG can "succeed" on Linux while Latin still renders as blank boxes.
 */
async function assertOverlayHasInk(png: Buffer, text: string): Promise<void> {
  const sample = text.replace(/\s+/g, "");
  if (sample.length < 2) return;
  const { data } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Any opaque pixel counts — captions may be yellow/pink/green, not only white.
    const a = data[i + 3] ?? 0;
    if (a >= 40) ink += 1;
  }
  const minInk = Math.max(80, sample.length * 8);
  if (ink < minInk) {
    throw new Error(
      `Caption overlay looks empty/tofu for "${sample.slice(0, 40)}" (inkPixels=${ink}, need≥${minInk}). Prefer drawtext.`,
    );
  }
}

/** Burn captions via transparent PNG overlays — works without ffmpeg drawtext/libass. */
export async function burnCaptionsOverlay(
  inputVideo: string,
  captionLines: CaptionLine[],
  outputVideo: string,
  workDir: string,
  style: CaptionBurnStyle = resolveCaptionBurnStyle("classic"),
): Promise<void> {
  ensureCompositorFonts();
  const duration = await getMediaDurationSeconds(inputVideo);
  const { width, height } = await getVideoDimensions(inputVideo);
  const hasAudio = await videoHasAudioStream(inputVideo);

  const overlayPaths: string[] = [];
  const filterParts: string[] = [];
  let current = "0:v";

  for (let i = 0; i < captionLines.length; i++) {
    const cap = captionLines[i];
    const lineStyle = resolveLineCaptionStyle(cap.stylePreset, style);
    const pngPath = path.join(workDir, `caption_overlay_${i}.png`);
    const png = await renderCaptionOverlayPng(width, height, cap, lineStyle);
    // Always validate Latin; CJK tofu is rarer but cheap to catch too.
    await assertOverlayHasInk(png, sanitizeCompositorText(cap.text));
    await fs.writeFile(pngPath, png);
    overlayPaths.push(pngPath);

    const startSec = Math.max(0, cap.startSec);
    const endSec = Math.min(duration, Math.max(startSec + 0.2, cap.endSec));
    const enable = `between(t\\,${startSec.toFixed(2)}\\,${endSec.toFixed(2)})`;
    const next = i === captionLines.length - 1 ? "vout" : `v${i + 1}`;
    filterParts.push(
      `[${current}][${i + 1}:v]overlay=0:0:enable='${enable}'[${next}]`,
    );
    current = next;
  }

  const args = ["-y", "-i", inputVideo, ...overlayPaths.flatMap((p) => ["-i", p])];
  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[vout]");
  if (hasAudio) {
    args.push("-map", "0:a:0", "-c:a", "copy");
  }
  args.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputVideo,
  );

  await run(getFfmpegPath(), args);
}
