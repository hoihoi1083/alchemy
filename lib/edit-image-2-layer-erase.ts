/**
 * Punch holes in a layer crop (alpha → 0) from stage-space box / brush.
 * Used for “擦图层” — does not touch the background plate.
 */

import type { BrushStroke } from "@/lib/edit-image-2-brush-cutout";

export type StageRect = { x: number; y: number; w: number; h: number };

export type LayerStageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load layer crop"));
    img.src = src;
  });
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** Map a stage rect into crop-pixel coords for a layer sprite. */
export function stageRectToCropRect(
  stageRect: StageRect,
  layerBox: LayerStageBox,
  cropW: number,
  cropH: number,
): { left: number; top: number; width: number; height: number } | null {
  if (layerBox.w < 1 || layerBox.h < 1 || cropW < 1 || cropH < 1) return null;
  const sx0 = Math.min(stageRect.x, stageRect.x + stageRect.w);
  const sy0 = Math.min(stageRect.y, stageRect.y + stageRect.h);
  const sx1 = Math.max(stageRect.x, stageRect.x + stageRect.w);
  const sy1 = Math.max(stageRect.y, stageRect.y + stageRect.h);

  const ix0 = Math.max(sx0, layerBox.x);
  const iy0 = Math.max(sy0, layerBox.y);
  const ix1 = Math.min(sx1, layerBox.x + layerBox.w);
  const iy1 = Math.min(sy1, layerBox.y + layerBox.h);
  if (ix1 - ix0 < 2 || iy1 - iy0 < 2) return null;

  const left = Math.max(0, Math.floor(((ix0 - layerBox.x) / layerBox.w) * cropW));
  const top = Math.max(0, Math.floor(((iy0 - layerBox.y) / layerBox.h) * cropH));
  const right = Math.min(
    cropW,
    Math.ceil(((ix1 - layerBox.x) / layerBox.w) * cropW),
  );
  const bottom = Math.min(
    cropH,
    Math.ceil(((iy1 - layerBox.y) / layerBox.h) * cropH),
  );
  const width = right - left;
  const height = bottom - top;
  if (width < 2 || height < 2) return null;
  return { left, top, width, height };
}

/** Punch a rectangular hole (alpha 0) in the crop. */
export async function punchBoxInCrop(
  cropSrc: string,
  stageRect: StageRect,
  layerBox: LayerStageBox,
): Promise<string | null> {
  const img = await loadImageElement(cropSrc);
  const cropW = img.naturalWidth || img.width;
  const cropH = img.naturalHeight || img.height;
  const rect = stageRectToCropRect(stageRect, layerBox, cropW, cropH);
  if (!rect) return null;

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  ctx.clearRect(rect.left, rect.top, rect.width, rect.height);
  return canvasToPngDataUrl(canvas);
}

/**
 * Punch brush strokes (stage space) through the layer crop to transparency.
 */
export async function punchBrushInCrop(
  cropSrc: string,
  strokes: BrushStroke[],
  brushSizeStage: number,
  layerBox: LayerStageBox,
): Promise<string | null> {
  if (!strokes.length || layerBox.w < 1 || layerBox.h < 1) return null;
  const img = await loadImageElement(cropSrc);
  const cropW = img.naturalWidth || img.width;
  const cropH = img.naturalHeight || img.height;
  if (!cropW || !cropH) return null;

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const lineW = Math.max(
    2,
    (brushSizeStage / layerBox.w) * cropW,
  );
  ctx.lineWidth = lineW;

  for (const pts of strokes) {
    if (pts.length < 2) continue;
    const toCrop = (sx: number, sy: number) => ({
      x: ((sx - layerBox.x) / layerBox.w) * cropW,
      y: ((sy - layerBox.y) / layerBox.h) * cropH,
    });
    if (pts.length < 4) {
      const p = toCrop(pts[0]!, pts[1]!);
      ctx.beginPath();
      ctx.arc(p.x, p.y, lineW / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const p0 = toCrop(pts[0]!, pts[1]!);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 2; i < pts.length; i += 2) {
      const p = toCrop(pts[i]!, pts[i + 1]!);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  return canvasToPngDataUrl(canvas);
}
