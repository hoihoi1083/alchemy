/**
 * Client-side helpers for selective lift: text plate keying + opaque content bbox.
 * Used so box/brush/grab cuts are transparent glyphs or tight subjects, not wallpaper boxes.
 */

import {
  keyUniformBackground,
  keyingLooksUseful,
  opaqueBBox,
  plateLooksUniform,
} from "@/lib/edit-image-2-text-matte";

export type ImageBBox = { left: number; top: number; width: number; height: number };

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load crop for keying"));
    img.src = src;
  });
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** Read RGBA from a crop URL / data URL. */
export async function readCropRgba(cropSrc: string): Promise<{
  data: Uint8ClampedArray;
  w: number;
  h: number;
} | null> {
  try {
    const img = await loadImageElement(cropSrc);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    return { data: imageData.data, w, h };
  } catch {
    return null;
  }
}

/**
 * If the crop looks like text on a uniform plate, key the plate to transparency.
 * Returns a new PNG data URL + content bbox in crop-local coords.
 */
export async function tryKeyTextCrop(cropSrc: string): Promise<{
  cropDataUrl: string;
  contentBBox: ImageBBox;
  keyedRatio: number;
} | null> {
  const rgba = await readCropRgba(cropSrc);
  if (!rgba) return null;
  const { data, w, h } = rgba;
  if (!plateLooksUniform(data, w, h)) return null;

  const keyed = keyUniformBackground(data, w, h);
  let opaque = 0;
  for (let i = 3; i < keyed.data.length; i += 4) {
    if (keyed.data[i]! >= 12) opaque += 1;
  }
  const remainingOpaqueRatio = opaque / Math.max(1, w * h);
  if (!keyingLooksUseful(keyed.keyedRatio, remainingOpaqueRatio)) return null;

  const content = opaqueBBox(keyed.data, w, h);
  if (!content || content.width < 2 || content.height < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const imageData = new ImageData(new Uint8ClampedArray(keyed.data), w, h);
  ctx.putImageData(imageData, 0, 0);

  return {
    cropDataUrl: canvasToPngDataUrl(canvas),
    contentBBox: content,
    keyedRatio: keyed.keyedRatio,
  };
}

/** Opaque content bbox inside a (possibly matted) crop, in crop-local coords. */
export async function contentBBoxFromCrop(cropSrc: string): Promise<ImageBBox | null> {
  const rgba = await readCropRgba(cropSrc);
  if (!rgba) return null;
  return opaqueBBox(rgba.data, rgba.w, rgba.h);
}

/** Map crop-local content bbox into full-image coords using the lift selection bbox. */
export function contentBBoxToImage(
  selection: ImageBBox,
  contentInCrop: ImageBBox,
  padRatio = 0.08,
): ImageBBox {
  const left = selection.left + contentInCrop.left;
  const top = selection.top + contentInCrop.top;
  const width = contentInCrop.width;
  const height = contentInCrop.height;
  const pad = Math.max(6, Math.round(Math.min(width, height) * padRatio));
  return {
    left: Math.max(0, left - pad),
    top: Math.max(0, top - pad),
    width: width + pad * 2,
    height: height + pad * 2,
  };
}
