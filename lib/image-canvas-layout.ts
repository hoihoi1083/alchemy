import type { ImageCanvasLayer } from "@/lib/image-canvas-layers";

/** Default left margin for carousel-style blocks (%). */
export const CANVAS_LEFT = 10;

/** Vertical gap between stacked insertions (%). */
export const INSERT_ROW_GAP = 7;

/** Y position for the next element — stacks below existing layers. */
export function nextInsertY(layers: ImageCanvasLayer[], fallbackY = 14): number {
  if (!layers.length) return fallbackY;
  let maxBottom = 0;
  for (const layer of layers) {
    const halfH =
      layer.kind === "shape"
        ? layer.hPct / 2
        : layer.kind === "logo"
          ? layer.hPct / 2
          : 3.5;
    maxBottom = Math.max(maxBottom, layer.yPct + halfH);
  }
  return Math.min(90, maxBottom + INSERT_ROW_GAP);
}

/** Logo box % sizes that preserve source aspect on a typical 9:16 frame. */
export function logoPctFromAspect(
  aspect: number,
  imageAspect: number,
  targetWidthPct = 20,
): { wPct: number; hPct: number } {
  const safeAspect = aspect > 0 ? aspect : 1;
  const wPct = targetWidthPct;
  const hPct = (wPct / safeAspect) * imageAspect;
  return { wPct, hPct: Math.min(24, Math.max(4, hPct)) };
}

/** Fit natural image pixels inside a box (preview + burn). */
export function fitImageInBox(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number,
): { w: number; h: number; offsetX: number; offsetY: number } {
  const nw = naturalW > 0 ? naturalW : 1;
  const nh = naturalH > 0 ? naturalH : 1;
  const scale = Math.min(boxW / nw, boxH / nh);
  const w = nw * scale;
  const h = nh * scale;
  return { w, h, offsetX: (boxW - w) / 2, offsetY: (boxH - h) / 2 };
}
