/**
 * Nano Banana / image-edit models treat transparent pixels as opaque gray/black.
 * For text-layer rewrites we flatten onto a magenta plate, then restore alpha.
 */

import sharp from "sharp";
import {
  keyUniformBackground,
  keyingLooksUseful,
  plateLooksUniform,
} from "@/lib/edit-image-2-text-matte";

/** Unlikely poster-text color; reserved as “empty / transparent”. */
export const EDIT_CHROMA = { r: 255, g: 0, b: 255 } as const;

function dist2(
  r: number,
  g: number,
  b: number,
  ref: { r: number; g: number; b: number },
): number {
  const dr = r - ref.r;
  const dg = g - ref.g;
  const db = b - ref.b;
  return dr * dr + dg * dg + db * db;
}

/** Fraction of pixels with alpha below `alphaMax` (0–1). */
export async function transparentPixelRatio(
  buf: Buffer,
  alphaMax = 250,
): Promise<number> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  if (!n) return 0;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < alphaMax) clear += 1;
  }
  return clear / n;
}

/**
 * True when the crop is a cutout (glyphs on alpha) rather than a photo plate.
 */
export async function cropNeedsChromaFlatten(buf: Buffer): Promise<boolean> {
  const ratio = await transparentPixelRatio(buf);
  return ratio >= 0.12;
}

/** Composite RGBA crop over solid magenta for models that destroy alpha. */
export async function flattenTransparentForEdit(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Could not read crop size for chroma flatten.");
  const overlay = await sharp(buf).ensureAlpha().png().toBuffer();
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { ...EDIT_CHROMA },
    },
  })
    .composite([{ input: overlay, blend: "over" }])
    .png()
    .toBuffer();
}

/** Punch near-magenta pixels back to transparent. */
export async function restoreTransparencyFromChroma(
  buf: Buffer,
  opts?: { threshold?: number },
): Promise<Buffer> {
  const threshold = opts?.threshold ?? 48;
  const thr2 = threshold * threshold;
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (dist2(out[i]!, out[i + 1]!, out[i + 2]!, EDIT_CHROMA) <= thr2) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * If the model still painted a flat gray/white plate, key it like text matte.
 */
export async function keyFlatPlateIfUseful(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  if (!plateLooksUniform(rgba, info.width, info.height)) return buf;
  const keyed = keyUniformBackground(rgba, info.width, info.height);
  let opaque = 0;
  for (let i = 3; i < keyed.data.length; i += 4) {
    if (keyed.data[i]! >= 12) opaque += 1;
  }
  const remaining = opaque / Math.max(1, info.width * info.height);
  if (!keyingLooksUseful(keyed.keyedRatio, remaining)) return buf;
  return sharp(Buffer.from(keyed.data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Prepare crop for edit + restore alpha afterward when input was transparent.
 */
export async function prepareCropForModelEdit(cropBuf: Buffer): Promise<{
  modelInput: Buffer;
  restoreChroma: boolean;
}> {
  if (await cropNeedsChromaFlatten(cropBuf)) {
    return {
      modelInput: await flattenTransparentForEdit(cropBuf),
      restoreChroma: true,
    };
  }
  return { modelInput: await sharp(cropBuf).png().toBuffer(), restoreChroma: false };
}

export async function finishCropAfterModelEdit(
  editedBuf: Buffer,
  opts: { restoreChroma: boolean; width: number; height: number },
): Promise<Buffer> {
  let fitted = await sharp(editedBuf)
    .resize(opts.width, opts.height, { fit: "fill" })
    .png()
    .toBuffer();
  if (opts.restoreChroma) {
    fitted = await restoreTransparencyFromChroma(fitted);
  }
  // Safety net: gray plate still opaque → key uniform corners.
  fitted = await keyFlatPlateIfUseful(fitted);
  return fitted;
}
