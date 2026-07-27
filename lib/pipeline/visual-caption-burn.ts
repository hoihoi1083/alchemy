import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import {
  captionBurnFontFamily,
  compositorFontFaceCss,
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { escapeXml } from "@/lib/compositor/paper-sticker/svg";
import { planCaptionBurnText } from "@/lib/image-canvas-text-layout";
import type { VisualCaptionClip } from "@/lib/visual-caption-types";
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

async function renderClipOverlayPng(
  width: number,
  height: number,
  clip: VisualCaptionClip,
): Promise<Buffer> {
  const plan = planCaptionBurnText(clip.text, width, height, {
    fontSizeScale: 0.048 / 0.052,
    position: "center",
  });
  const lines = plan.lines.map((line) => sanitizeCompositorText(line));
  const { fontSize, lineHeight } = plan;
  const stroke = Math.max(3, Math.round(fontSize * 0.12));
  const cx = Math.round((clip.xPct / 100) * width);
  const blockSpan = (Math.max(1, lines.length) - 1) * lineHeight;
  const halfGlyph = fontSize * 0.55;
  const minCenterY = Math.round(height * 0.08) + halfGlyph;
  const maxCenterY = height - Math.round(height * 0.08) - halfGlyph;
  let baseY = Math.round((clip.yPct / 100) * height);
  let firstLineY = baseY - blockSpan / 2;
  firstLineY = Math.max(minCenterY, Math.min(firstLineY, maxCenterY - blockSpan));

  const textNodes = lines
    .map((line, i) => {
      const y = Math.round(firstLineY + i * lineHeight);
      return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${captionBurnFontFamily("NotoBody", true)}" font-size="${fontSize}" font-weight="700" fill="white" stroke="black" stroke-width="${stroke}" paint-order="stroke">${escapeXml(line)}</text>`;
    })
    .join("");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>${compositorFontFaceCss()}</defs>
    ${textNodes}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Burn visually positioned captions (drag-and-drop coordinates). */
export async function burnVisualCaptionsOverlay(
  inputVideo: string,
  clips: VisualCaptionClip[],
  outputVideo: string,
  workDir: string,
): Promise<void> {
  ensureCompositorFonts();
  const duration = await getMediaDurationSeconds(inputVideo);
  const { width, height } = await getVideoDimensions(inputVideo);
  const hasAudio = await videoHasAudioStream(inputVideo);

  const overlayPaths: string[] = [];
  const filterParts: string[] = [];
  let current = "0:v";

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const pngPath = path.join(workDir, `visual_caption_${i}.png`);
    const png = await renderClipOverlayPng(width, height, clip);
    await fs.writeFile(pngPath, png);
    overlayPaths.push(pngPath);

    const startSec = Math.max(0, clip.startSec);
    const endSec = Math.min(duration, Math.max(startSec + 0.2, clip.endSec));
    const enable = `between(t\\,${startSec.toFixed(2)}\\,${endSec.toFixed(2)})`;
    const next = i === clips.length - 1 ? "vout" : `v${i + 1}`;
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
