import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import sharp from "sharp";
import {
  ensureCompositorFonts,
  sanitizeCompositorText,
} from "@/lib/compositor/fonts";
import { burnTextSvgPaths } from "@/lib/compositor/latin-text-paths";
import { planCaptionBurnText } from "@/lib/image-canvas-text-layout";
import {
  getFfmpegPath,
  getMediaDurationSeconds,
  getVideoDimensions,
  videoHasAudioStream,
} from "@/lib/pipeline/ffmpeg";
import {
  buildMotionPosterTypeFilter,
  planMotionPosterTypeOverlay,
  type MotionPosterTypeOverlayPlan,
} from "@/lib/motion-poster-type-overlay";
import type { MotionPosterDialectId } from "@/lib/motion-poster-dialects";

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

async function renderHeadlinePng(
  width: number,
  height: number,
  headline: string,
  subline: string,
): Promise<Buffer> {
  const chunks: string[] = [];
  const head = sanitizeCompositorText(headline);
  if (head) {
    const plan = planCaptionBurnText(head, width, height, {
      fontSizeScale: 1.28,
      maxLines: 3,
      position: "top",
    });
    chunks.push(
      burnTextSvgPaths({
        lines: plan.lines.map((l) => sanitizeCompositorText(l)),
        lineYs: plan.lineYs,
        x: Math.round(width / 2),
        anchor: "middle",
        fontSize: plan.fontSize,
        bold: true,
        preferred: "headline",
        fill: "white",
        stroke: "rgba(15,23,42,0.88)",
        strokeWidth: Math.max(3, Math.round(plan.fontSize * 0.1)),
      }),
    );
    if (subline.trim()) {
      const sub = planCaptionBurnText(sanitizeCompositorText(subline), width, height, {
        fontSizeScale: 0.72,
        maxLines: 3,
        position: "top",
      });
      const shift =
        (plan.lineYs[plan.lineYs.length - 1] ?? plan.fontSize) +
        Math.round(plan.lineHeight * 0.85);
      const subYs = sub.lineYs.map((y) => y - sub.lineYs[0]! + shift);
      chunks.push(
        burnTextSvgPaths({
          lines: sub.lines.map((l) => sanitizeCompositorText(l)),
          lineYs: subYs,
          x: Math.round(width / 2),
          anchor: "middle",
          fontSize: sub.fontSize,
          bold: false,
          preferred: "body",
          fill: "rgba(248,250,252,0.94)",
          stroke: "rgba(15,23,42,0.75)",
          strokeWidth: Math.max(2, Math.round(sub.fontSize * 0.08)),
        }),
      );
    }
  }
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${chunks.join("")}</svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();
}

async function renderCtaPng(width: number, height: number, cta: string): Promise<Buffer> {
  const text = sanitizeCompositorText(cta);
  const plan = planCaptionBurnText(text, width, height, {
    fontSizeScale: 0.7,
    maxLines: 2,
    position: "bottom",
  });
  const padX = Math.round(width * 0.07);
  const barH = Math.round(plan.fontSize * 2.15 + (plan.lines.length - 1) * plan.lineHeight);
  const lastY = plan.lineYs[plan.lineYs.length - 1] ?? height * 0.9;
  const firstY = plan.lineYs[0] ?? lastY;
  const barY = Math.max(0, Math.round(firstY - plan.fontSize * 0.85));
  const body = burnTextSvgPaths({
    lines: plan.lines.map((l) => sanitizeCompositorText(l)),
    lineYs: plan.lineYs,
    x: Math.round(width / 2),
    anchor: "middle",
    fontSize: plan.fontSize,
    bold: true,
    preferred: "body",
    fill: "white",
    stroke: "rgba(15,23,42,0.55)",
    strokeWidth: Math.max(2, Math.round(plan.fontSize * 0.07)),
  });
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="${barY}" width="${width - padX * 2}" height="${barH}" rx="${Math.round(barH / 2)}" fill="rgba(15,23,42,0.62)"/>
    ${body}
  </svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();
}

export async function burnMotionPosterTypeOverlay(input: {
  inputVideo: string;
  outputVideo: string;
  workDir: string;
  headline?: string;
  subline?: string;
  offer?: string;
  product?: string;
  dialect?: MotionPosterDialectId;
  durationSec?: number;
}): Promise<MotionPosterTypeOverlayPlan | null> {
  const probed = await getMediaDurationSeconds(input.inputVideo);
  const plan = planMotionPosterTypeOverlay({
    headline: input.headline,
    subline: input.subline,
    offer: input.offer,
    product: input.product,
    dialect: input.dialect,
    durationSec: input.durationSec || probed,
  });
  if (!plan) return null;

  ensureCompositorFonts();
  const { width, height } = await getVideoDimensions(input.inputVideo);
  const hasAudio = await videoHasAudioStream(input.inputVideo);
  const overlayPaths: string[] = [];
  const hasHeadline = Boolean(plan.headline || plan.subline);
  const hasCta = Boolean(plan.cta);

  if (hasHeadline) {
    const png = await renderHeadlinePng(width, height, plan.headline, plan.subline);
    const p = path.join(input.workDir, "poster-type-head.png");
    await fs.writeFile(p, png);
    overlayPaths.push(p);
  }
  if (hasCta) {
    const png = await renderCtaPng(width, height, plan.cta);
    const p = path.join(input.workDir, "poster-type-cta.png");
    await fs.writeFile(p, png);
    overlayPaths.push(p);
  }

  const filter = buildMotionPosterTypeFilter({
    kind: plan.kind,
    hasHeadline,
    hasCta,
    headStartSec: plan.headStartSec,
    headDurSec: plan.headDurSec,
    ctaStartSec: plan.ctaStartSec,
    ctaDurSec: plan.ctaDurSec,
  });
  if (!filter) return null;

  // PNG is one frame — without -loop, fade=t=in stays at t=0 (alpha 0) forever.
  const holdSec = Math.max(4, probed).toFixed(2);
  const args = ["-y", "-i", input.inputVideo];
  for (const p of overlayPaths) {
    args.push("-loop", "1", "-framerate", "24", "-t", holdSec, "-i", p);
  }
  args.push("-filter_complex", filter, "-map", "[vout]");
  if (hasAudio) args.push("-map", "0:a:0", "-c:a", "copy");
  args.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-t",
    holdSec,
    "-movflags",
    "+faststart",
    input.outputVideo,
  );
  await run(getFfmpegPath(), args);
  return plan;
}
