import sharp from "sharp";
import type { HealRect } from "@/lib/edit-image-2-local-heal";

/**
 * Wipe a hole with a solid median ring colour (no smear / no billed heal).
 * Only for small text-sized holes. Large subject punches sample stadium grass
 * and paint ugly green rectangles on the plate.
 */
export async function softCoverHole(
  imgBuf: Buffer,
  hole: HealRect,
  imgW: number,
  imgH: number,
): Promise<Buffer> {
  const hl = Math.max(0, Math.min(hole.left, imgW - 1));
  const ht = Math.max(0, Math.min(hole.top, imgH - 1));
  const hw = Math.max(1, Math.min(hole.width, imgW - hl));
  const hh = Math.max(1, Math.min(hole.height, imgH - ht));

  // Never paint a huge solid patch (subject-sized) — that becomes the green blocks.
  if ((hw * hh) / Math.max(1, imgW * imgH) > 0.08) {
    return imgBuf;
  }

  const ring = Math.max(8, Math.round(Math.min(hw, hh) * 0.12));
  const left = Math.max(0, hl - ring);
  const top = Math.max(0, ht - ring);
  const width = Math.min(imgW - left, hw + ring * 2);
  const height = Math.min(imgH - top, hh + ring * 2);

  const { data, info } = await sharp(imgBuf)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const rw = info.width;
  const rh = info.height;
  const holeL = hl - left;
  const holeT = ht - top;
  const samples: number[] = [];

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const inHole = x >= holeL && x < holeL + hw && y >= holeT && y < holeT + hh;
      if (inHole) continue;
      const i = (y * rw + x) * ch;
      samples.push(data[i]!, data[i + 1]!, data[i + 2]!);
    }
  }

  // Default dark fill — avoid saturated grass greens when sampling fails.
  let fillR = 24;
  let fillG = 24;
  let fillB = 28;
  if (samples.length >= 3) {
    const rs: number[] = [];
    const gs: number[] = [];
    const bs: number[] = [];
    for (let i = 0; i < samples.length; i += 3) {
      rs.push(samples[i]!);
      gs.push(samples[i + 1]!);
      bs.push(samples[i + 2]!);
    }
    const med = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };
    fillR = med(rs);
    fillG = med(gs);
    fillB = med(bs);
    // Desaturate neon / grass greens so punches don't flash as green bars.
    if (fillG > fillR + 35 && fillG > fillB + 35) {
      const grey = Math.round(0.3 * fillR + 0.5 * fillG + 0.2 * fillB);
      fillR = grey;
      fillG = grey;
      fillB = grey;
    }
  }

  const solid = await sharp({
    create: {
      width: hw,
      height: hh,
      channels: 3,
      background: { r: fillR, g: fillG, b: fillB },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();

  return sharp(imgBuf)
    .composite([{ input: solid, left: hl, top: ht }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Big Latin wordmarks (e.g. SMASH) — leave for Qwen as graphic layers. */
export function isLogoLikeGraphicText(
  label: string,
  px: { width: number; height: number },
  imgW: number,
  imgH: number,
): boolean {
  const area = (px.width * px.height) / Math.max(1, imgW * imgH);
  const compact = label.replace(/\s+/g, "");
  if (!compact || compact.length > 24) return false;
  const latin = /^[A-Za-z0-9!?.\-_'']+$/.test(compact);
  if (latin && area >= 0.04 && compact.length <= 16) return true;
  if (area >= 0.1 && compact.length <= 20) return true;
  return false;
}

/**
 * Qwen sometimes emits flat colour patches (green grass blocks). Drop those
 * as layers — they are not useful design pieces.
 */
export async function isNearlyFlatColorLayer(
  pngBuf: Buffer,
  opts?: { maxVariance?: number; minOpaqueFrac?: number },
): Promise<boolean> {
  const maxVariance = opts?.maxVariance ?? 420;
  const minOpaqueFrac = opts?.minOpaqueFrac ?? 0.35;
  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .resize(48, 48, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const n = info.width * info.height;
  if (n < 4 || ch < 3) return true;

  let opaque = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i += ch) {
    const a = ch >= 4 ? data[i + 3]! : 255;
    if (a < 24) continue;
    opaque += 1;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    sumR += r;
    sumG += g;
    sumB += b;
    const lum = (r + g + b) / 3;
    sumSq += lum * lum;
  }
  if (opaque / n < minOpaqueFrac) return false;
  const meanLum = (sumR + sumG + sumB) / (3 * Math.max(1, opaque));
  const variance = sumSq / Math.max(1, opaque) - meanLum * meanLum;
  return variance < maxVariance;
}
