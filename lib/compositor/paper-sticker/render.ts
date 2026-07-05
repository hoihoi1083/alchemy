import sharp from "sharp";
import { ensureCompositorFonts, sanitizeCompositorText } from "@/lib/compositor/fonts";
import type { PaperStickerInput, RenderProgress } from "@/lib/compositor/types";
import {
  cafeBackgroundSvg,
  paperCardSvg,
  sparkleSvg,
  textLayerSvg,
} from "@/lib/compositor/paper-sticker/svg";
import { H, PAPER, STICKER, TEXT, VIDEO, W } from "@/lib/compositor/paper-sticker/layout";

/** Bump when layout/visual design changes so dev server picks up new assets. */
const DESIGN_VERSION = 2;

let cachedBackground: Buffer | null = null;
let cachedPaper: Buffer | null = null;
let cachedDesignVersion = 0;

function ensureDesignCache(): void {
  if (cachedDesignVersion === DESIGN_VERSION) return;
  cachedBackground = null;
  cachedPaper = null;
  cachedDesignVersion = DESIGN_VERSION;
}

async function getBackground(): Promise<Buffer> {
  if (cachedBackground) return cachedBackground;
  cachedBackground = await sharp(Buffer.from(cafeBackgroundSvg()))
    .resize(W, H, { fit: "cover" })
    .png()
    .toBuffer();
  return cachedBackground;
}

async function getPaperCard(): Promise<Buffer> {
  if (cachedPaper) return cachedPaper;
  cachedPaper = await sharp(Buffer.from(paperCardSvg(PAPER.width, PAPER.height)))
    .png()
    .toBuffer();
  return cachedPaper;
}

async function productSticker(productImage: Buffer, scale = 1): Promise<Buffer> {
  const pad = Math.round((STICKER.ring + STICKER.glow) * scale);
  const inner = Math.round(STICKER.r * 2 * scale);
  const ring = Math.round(STICKER.ring * scale);
  const glow = Math.round(STICKER.glow * scale);
  const size = inner + pad * 2;

  const photo = await sharp(productImage)
    .resize(inner, inner, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${inner}" height="${inner}"><circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="white"/></svg>`,
  );

  const clipped = await sharp(photo)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const ringSvg = Buffer.from(
    `<svg width="${size}" height="${size}">
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="${glow}" flood-color="#3d2e1e" flood-opacity="0.35"/>
        </filter>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${inner / 2 + ring + 4}" fill="none" stroke="#e8d4a8" stroke-width="${ring}" filter="url(#glow)"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${inner / 2 + ring / 2}" fill="none" stroke="white" stroke-width="${ring}"/>
    </svg>`,
  );

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: clipped, left: pad, top: pad },
      { input: ringSvg, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

function motionAt(progress: number) {
  const t = progress * Math.PI * 2;
  return {
    bgScale: 1 + progress * 0.06,
    paperDy: Math.sin(t) * 10,
    stickerScale: 1 + Math.sin(t * 2) * 0.025,
    sparkleOpacity: 0.35 + Math.sin(t * 3) * 0.25,
  };
}

export async function renderPaperStickerFrame(
  input: PaperStickerInput,
  progress = 0,
): Promise<Buffer> {
  ensureCompositorFonts();
  ensureDesignCache();
  const motion = motionAt(progress);
  const bg = await getBackground();
  const paper = await getPaperCard();
  const sticker = await productSticker(input.productImage, motion.stickerScale);

  const textSvg = textLayerSvg({
    headline: input.headline,
    bullets: input.bullets,
    brand: input.brand,
    signoff: input.signoff,
    paperWidth: PAPER.width,
    paperHeight: PAPER.height,
    headlineSize: TEXT.headlineSize,
  });

  const textLayer = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const sparkles = await sharp(
    Buffer.from(sparkleSvg(PAPER.width, PAPER.height, motion.sparkleOpacity)),
  )
    .png()
    .toBuffer();

  const paperComposite = await sharp(paper)
    .composite([
      { input: textLayer, left: 0, top: 0 },
      { input: sparkles, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  const scaledBg = await sharp(bg)
    .resize(Math.round(W * motion.bgScale), Math.round(H * motion.bgScale), { fit: "cover" })
    .extract({
      left: Math.round((W * motion.bgScale - W) / 2),
      top: Math.round((H * motion.bgScale - H) / 2),
      width: W,
      height: H,
    })
    .png()
    .toBuffer();

  const paperY = PAPER.y + Math.round(motion.paperDy);
  const stickerMeta = await sharp(sticker).metadata();
  const stickerW = stickerMeta.width ?? STICKER.r * 2;
  const stickerH = stickerMeta.height ?? STICKER.r * 2;
  const stickerLeft = PAPER.x + STICKER.cx - Math.round(stickerW / 2);
  const stickerTop = paperY + STICKER.cy - Math.round(stickerH / 2);

  return sharp(scaledBg)
    .composite([
      { input: paperComposite, left: PAPER.x, top: paperY },
      { input: sticker, left: stickerLeft, top: stickerTop },
    ])
    .png()
    .toBuffer();
}

export async function renderPaperStickerImage(input: PaperStickerInput): Promise<Buffer> {
  return renderPaperStickerFrame(input, 0);
}

export async function renderPaperStickerVideoFrames(
  input: PaperStickerInput,
  outDir: string,
  onProgress?: (p: RenderProgress) => void,
): Promise<number> {
  const { promises: fs } = await import("fs");
  const pathMod = await import("path");
  await fs.mkdir(outDir, { recursive: true });

  const total = VIDEO.fps * VIDEO.durationSec;
  for (let i = 0; i < total; i++) {
    const progress = i / total;
    const frame = await renderPaperStickerFrame(input, progress);
    const name = `frame_${String(i).padStart(4, "0")}.png`;
    await fs.writeFile(pathMod.join(outDir, name), frame);
    onProgress?.({ frame: i + 1, total });
  }
  return total;
}

export function parsePaperStickerBullets(subline: string): string[] {
  return subline
    .split(/\n/)
    .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
    .filter(Boolean);
}

export function buildPaperStickerInput(opts: {
  headline: string;
  subline: string;
  brand: string;
  signoff: string;
  productImage: Buffer;
}): PaperStickerInput {
  return {
    headline: sanitizeCompositorText(opts.headline),
    bullets: parsePaperStickerBullets(sanitizeCompositorText(opts.subline)),
    brand: sanitizeCompositorText(opts.brand) || "crystal hk",
    signoff: sanitizeCompositorText(opts.signoff) || "從略",
    productImage: opts.productImage,
  };
}
