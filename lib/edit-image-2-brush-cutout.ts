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

export type BrushCutoutResult = {
  cropDataUrl: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  /** Tight bbox in image pixels (for blur punch). */
  bbox: { left: number; top: number; width: number; height: number };
};

/** Extract painted pixels from source; transparent elsewhere; crop to bbox. */
export function cutoutFromSourceAndMask(
  source: HTMLImageElement | HTMLCanvasElement,
  mask: HTMLCanvasElement,
): BrushCutoutResult | null {
  const imgW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const imgH = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!imgW || !imgH || mask.width !== imgW || mask.height !== imgH) return null;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imgW;
  srcCanvas.height = imgH;
  const sctx = srcCanvas.getContext("2d")!;
  sctx.drawImage(source, 0, 0);

  const src = sctx.getImageData(0, 0, imgW, imgH);
  const mctx = mask.getContext("2d")!;
  const maskData = mctx.getImageData(0, 0, imgW, imgH);

  let minX = imgW;
  let minY = imgH;
  let maxX = -1;
  let maxY = -1;
  const out = sctx.createImageData(imgW, imgH);

  for (let i = 0; i < src.data.length; i += 4) {
    const covered = maskData.data[i]! > 128;
    if (!covered) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
      continue;
    }
    out.data[i] = src.data[i]!;
    out.data[i + 1] = src.data[i + 1]!;
    out.data[i + 2] = src.data[i + 2]!;
    out.data[i + 3] = src.data[i + 3]!;
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

  const full = document.createElement("canvas");
  full.width = imgW;
  full.height = imgH;
  full.getContext("2d")!.putImageData(out, 0, 0);

  const crop = document.createElement("canvas");
  crop.width = width;
  crop.height = height;
  crop.getContext("2d")!.drawImage(full, left, top, width, height, 0, 0, width, height);

  return {
    cropDataUrl: crop.toDataURL("image/png"),
    xPct: (left / imgW) * 100,
    yPct: (top / imgH) * 100,
    wPct: (width / imgW) * 100,
    hPct: (height / imgH) * 100,
    bbox: { left, top, width, height },
  };
}

/** Local fallback when FLUX erase is unavailable — blur the masked bbox on the background. */
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
  const patch = document.createElement("canvas");
  patch.width = width;
  patch.height = height;
  const pctx = patch.getContext("2d")!;
  pctx.filter = "blur(18px)";
  pctx.drawImage(img, left, top, width, height, 0, 0, width, height);
  ctx.drawImage(patch, left, top);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
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
