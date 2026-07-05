import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import {
  compositorFontFaceCss,
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { escapeXml } from "@/lib/compositor/paper-sticker/svg";
import type { VisualCaptionClip } from "@/lib/visual-caption-types";
import {
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
  const lines = clip.text
    .split(/\n/)
    .map((line) => sanitizeCompositorText(line))
    .filter(Boolean);
  const fontSize = Math.max(24, Math.round(width * 0.048));
  const lineHeight = Math.round(fontSize * 1.35);
  const stroke = Math.max(3, Math.round(fontSize * 0.12));
  const cx = Math.round((clip.xPct / 100) * width);
  const baseY = Math.round((clip.yPct / 100) * height);
  const startY = baseY - ((lines.length - 1) * lineHeight) / 2;

  const textNodes = lines
    .map((line, i) => {
      const y = Math.round(startY + i * lineHeight);
      return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="NotoBody" font-size="${fontSize}" font-weight="700" fill="white" stroke="black" stroke-width="${stroke}" paint-order="stroke">${escapeXml(line)}</text>`;
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

  await run("ffmpeg", args);
}
