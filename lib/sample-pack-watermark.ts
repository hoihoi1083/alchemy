import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  burnTextSvgPaths,
  measureBurnTextWidth,
} from "@/lib/compositor/latin-text-paths";
import {
  SAMPLE_PACK_ITEMS,
  SAMPLE_PACK_WATERMARK,
  type SamplePackItem,
} from "@/lib/sample-pack";

function publicPathFromSrc(src: string): string {
  const rel = src.startsWith("/") ? src.slice(1) : src;
  return path.join(process.cwd(), "public", rel);
}

/**
 * Diagonal repeating Alchemy watermark burned into pixels.
 * Uses glyph path outlines (not SVG <text>) so Vercel/Sharp won't render tofu □□□.
 * Pattern matches common stock-photo style overlays (tilted mesh of the phrase).
 */
function watermarkSvg(width: number, height: number): Buffer {
  const phrase = SAMPLE_PACK_WATERMARK;
  // Compact phrase + airy mesh so tiles don’t collide after rotation.
  const fontSize = Math.max(11, Math.round(Math.min(width, height) * 0.016));
  const phraseW = Math.max(
    fontSize * 4,
    measureBurnTextWidth(phrase, fontSize, true),
  );
  // Wide gaps — short phrase packs tight unless we leave lots of air.
  const stepX = Math.max(phraseW * 2.4, phraseW + fontSize * 12);
  const stepY = fontSize * 12;
  const angle = -28;

  const tiles: string[] = [];
  // Oversized grid so rotation still covers corners.
  for (let y = -height; y < height * 2; y += stepY) {
    let row = 0;
    for (let x = -width; x < width * 2; x += stepX) {
      const offsetX = (row % 2) * (stepX * 0.5);
      const glyph = burnTextSvgPaths({
        lines: [phrase],
        lineYs: [0],
        x: 0,
        anchor: "start",
        fontSize,
        bold: true,
        fill: "#1a1a1a",
        stroke: "transparent",
        strokeWidth: 0,
      });
      tiles.push(
        `<g transform="translate(${(x + offsetX).toFixed(1)} ${y.toFixed(1)})" opacity="0.24">${glyph}</g>`,
      );
      row += 1;
    }
  }

  const cx = (width / 2).toFixed(1);
  const cy = (height / 2).toFixed(1);
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(${angle} ${cx} ${cy})">
    ${tiles.join("\n")}
  </g>
</svg>`;
  return Buffer.from(svg);
}

export function samplePackItemById(id: string): SamplePackItem | undefined {
  return SAMPLE_PACK_ITEMS.find((i) => i.id === id);
}

/** Burn Alchemy watermark into a sample image (JPEG bytes). */
export async function watermarkSamplePackImage(
  item: SamplePackItem,
): Promise<Buffer> {
  const filePath = publicPathFromSrc(item.src);
  const input = await readFile(filePath);
  const base = sharp(input).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1280;
  return base
    .composite([{ input: watermarkSvg(width, height), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function watermarkAllSamplePackImages(): Promise<
  Array<{ id: string; filename: string; bytes: Buffer }>
> {
  const out: Array<{ id: string; filename: string; bytes: Buffer }> = [];
  for (const item of SAMPLE_PACK_ITEMS) {
    const bytes = await watermarkSamplePackImage(item);
    out.push({
      id: item.id,
      filename: `alchemy-sample-${item.id}.jpg`,
      bytes,
    });
  }
  return out;
}
