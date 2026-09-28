import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  SAMPLE_PACK_ITEMS,
  SAMPLE_PACK_WATERMARK,
  type SamplePackItem,
} from "@/lib/sample-pack";

function publicPathFromSrc(src: string): string {
  const rel = src.startsWith("/") ? src.slice(1) : src;
  return path.join(process.cwd(), "public", rel);
}

/** SVG overlay — bottom-centered Alchemy credit burned into pixels. */
function watermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(14, Math.round(width * 0.028));
  const padY = Math.max(16, Math.round(height * 0.035));
  const barH = Math.round(fontSize * 2.4);
  const text = SAMPLE_PACK_WATERMARK.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${height - barH - padY}" width="${width}" height="${barH + padY}" fill="url(#g)"/>
  <text x="50%" y="${height - padY - fontSize * 0.35}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700"
    fill="#ffffff" fill-opacity="0.95" letter-spacing="0.06em">${text}</text>
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
