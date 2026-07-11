import type { ImageCanvasLayer } from "@/lib/image-canvas-layers";
import { parseImageCanvasLayers } from "@/lib/image-canvas-layers";

export const IMAGE_CANVAS_DRAFT_KEY = "alchemy-image-canvas-draft";

export type ImageCanvasDraft = {
  sourceKey: string;
  layers: ImageCanvasLayer[];
  savedAt: string;
};

export function readImageCanvasDraft(sourceKey: string): ImageCanvasLayer[] | null {
  if (typeof localStorage === "undefined" || !sourceKey) return null;
  try {
    const raw = localStorage.getItem(IMAGE_CANVAS_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImageCanvasDraft;
    if (parsed.sourceKey !== sourceKey) return null;
    return parseImageCanvasLayers(parsed.layers);
  } catch {
    return null;
  }
}

export function writeImageCanvasDraft(sourceKey: string, layers: ImageCanvasLayer[]): void {
  if (typeof localStorage === "undefined" || !sourceKey) return;
  const draft: ImageCanvasDraft = {
    sourceKey,
    layers,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(IMAGE_CANVAS_DRAFT_KEY, JSON.stringify(draft));
}
