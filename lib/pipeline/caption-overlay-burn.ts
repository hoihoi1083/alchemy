import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import { planCaptionBurnText } from "@/lib/image-canvas-text-layout";
import {
  compositorFontFaceCss,
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { escapeXml } from "@/lib/compositor/paper-sticker/svg";
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
  const fontFamily = preset.fontFamily ?? "NotoBody";
  const fontWeight = preset.fontWeight ?? 700;
  const { x, anchor } = layoutX(caption.position, width);

  const textNodes = chunks
    .map((chunk, lineIndex) => {
      const y = plan.lineYs[lineIndex] ?? plan.lineYs[plan.lineYs.length - 1] ?? Math.round(height * 0.9);
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" stroke="${strokeColor}" stroke-width="${stroke}" paint-order="stroke">${escapeXml(chunk)}</text>`;
    })
    .join("");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>${compositorFontFaceCss()}</defs>
    ${textNodes}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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
