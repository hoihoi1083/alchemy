/**
 * Client-side brush mask → transparent cutout for edit-image-2.
 * Stage coords → natural image coords.
 */

export type BrushStroke = number[];

export function paintStrokesOnMask(
  ctx: CanvasRenderingContext2D,
  strokes: BrushStroke[],
  brushSizeStage: number,
  stageW: number,
  stageH: number,
  imgW: number,
  imgH: number,
): void {
  const scaleX = imgW / stageW;
  const scaleY = imgH / stageH;
  const lineW = Math.max(2, brushSizeStage * scaleX);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lineW;

  for (const pts of strokes) {
    if (pts.length < 2) continue;
    if (pts.length < 4) {
      ctx.beginPath();
      ctx.arc(pts[0]! * scaleX, pts[1]! * scaleY, lineW / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0]! * scaleX, pts[1]! * scaleY);
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i]! * scaleX, pts[i + 1]! * scaleY);
    }
    ctx.stroke();
  }
}

export function buildBrushMaskCanvas(
  strokes: BrushStroke[],
  brushSizeStage: number,
  stageW: number,
  stageH: number,
  imgW: number,
  imgH: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, imgW, imgH);
  paintStrokesOnMask(ctx, strokes, brushSizeStage, stageW, stageH, imgW, imgH);
  return canvas;
}

/** Scale/crop a mask canvas to match target width/height. */
export function normalizeMaskToSize(
  mask: HTMLCanvasElement,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  if (mask.width === targetW && mask.height === targetH) return mask;
  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(mask, 0, 0, targetW, targetH);
  return out;
}

export type BrushCutoutResult = {
  cropDataUrl: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** Tight bbox in image pixels (for blur punch). */
  bbox: { left: number; top: number; width: number; height: number };
};

/** Extract painted pixels via destination-in; crop to bbox. */
export function cutoutFromSourceAndMask(
  source: HTMLImageElement | HTMLCanvasElement,
  mask: HTMLCanvasElement,
): BrushCutoutResult | null {
  const imgW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const imgH = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!imgW || !imgH) return null;

  const normMask = normalizeMaskToSize(mask, imgW, imgH);

  const canvas = document.createElement("canvas");
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, imgW, imgH);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(normMask, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  const data = ctx.getImageData(0, 0, imgW, imgH);
  let minX = imgW;
  let minY = imgH;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3]! < 16) continue;
    const px = (i / 4) % imgW;
    const py = Math.floor(i / 4 / imgW);
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(imgW - left, maxX - minX + 1 + pad * 2);
  const height = Math.min(imgH - top, maxY - minY + 1 + pad * 2);

  const crop = document.createElement("canvas");
  crop.width = width;
  crop.height = height;
  crop.getContext("2d")!.drawImage(canvas, left, top, width, height, 0, 0, width, height);

  return {
    cropDataUrl: crop.toDataURL("image/png"),
    xPct: (left / imgW) * 100,
    yPct: (top / imgH) * 100,
    wPct: (width / imgW) * 100,
    hPct: (height / imgH) * 100,
    bbox: { left, top, width, height },
  };
}

/** Local fallback — mild blur only (heavy blur looked like a broken slab). */
export async function blurPunchBackground(
  backgroundDataUrl: string,
  bbox: { left: number; top: number; width: number; height: number },
): Promise<string> {
  const img = await loadImage(backgroundDataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const { left, top, width, height } = bbox;
  // Sample average colour from a ring around the hole
  const ring = Math.max(4, Math.round(Math.min(width, height) * 0.1));
  const sample = document.createElement("canvas");
  const sw = Math.min(w, width + ring * 2);
  const sh = Math.min(h, height + ring * 2);
  const sx = Math.max(0, left - ring);
  const sy = Math.max(0, top - ring);
  sample.width = sw;
  sample.height = sh;
  const sctx = sample.getContext("2d")!;
  sctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const holeL = left - sx;
  const holeT = top - sy;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (x >= holeL && x < holeL + width && y >= holeT && y < holeT + height) continue;
      const i = (y * sw + x) * 4;
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
      n += 1;
    }
  }
  ctx.fillStyle = n
    ? `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`
    : "#f3f4f6";
  ctx.fillRect(left, top, width, height);

  // Very light soft edge
  const patch = document.createElement("canvas");
  patch.width = width;
  patch.height = height;
  const pctx = patch.getContext("2d")!;
  pctx.filter = "blur(4px)";
  pctx.drawImage(img, left, top, width, height, 0, 0, width, height);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(patch, left, top);
  ctx.globalAlpha = 1;
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    // Relative same-origin URLs (proxy) need cookies — skip crossOrigin there.
    if (/^https?:\/\//i.test(url)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header?.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const bin = atob(b64 ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Same-origin proxy so Konva export is not CORS-tainted. */
export function canvasDisplayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return url;
  if (/^https?:\/\//i.test(url)) {
    return `/api/proxy-canvas-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Sample dominant opaque colour + rough boldness from a crop for live text. */
export async function sampleTextStyleFromCrop(
  cropUrl: string,
): Promise<{ fill: string; fontBold: boolean }> {
  try {
    const img = await loadImage(canvasDisplayUrl(cropUrl) ?? cropUrl);
    const w = Math.min(64, img.naturalWidth);
    const h = Math.min(64, img.naturalHeight);
    if (!w || !h) return { fill: "#111827", fontBold: true };
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    let dark = 0;
    let light = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      if (a < 80) continue;
      const rr = data[i]!;
      const gg = data[i + 1]!;
      const bb = data[i + 2]!;
      const lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
      // Skip near-white / near-bg
      if (lum > 245 || lum < 12) continue;
      r += rr;
      g += gg;
      b += bb;
      n += 1;
      if (lum < 128) dark += 1;
      else light += 1;
    }
    if (n < 8) return { fill: "#111827", fontBold: true };
    const toHex = (v: number) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0");
    const fill = `#${toHex(r / n)}${toHex(g / n)}${toHex(b / n)}`;
    // Heuristic: more dark pixels → bold ink
    const fontBold = dark >= light * 0.55;
    return { fill, fontBold };
  } catch {
    return { fill: "#111827", fontBold: true };
  }
}
