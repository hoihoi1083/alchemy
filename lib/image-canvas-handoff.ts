import type { ImageCanvasLayer } from "@/lib/image-canvas-layers";

export const IMAGE_CANVAS_HANDOFF_KEY = "alchemy-image-canvas-handoff";

export type ImageCanvasHandoff = {
  imageUrl: string;
  label?: string;
  initialLayers?: ImageCanvasLayer[];
};

/** Prefer same-origin pipeline paths for server burn. */
export function normalizeImageCanvasHandoffUrl(url: string): string {
  const trimmed = url.trim();
  const marker = "/api/pipeline-files/";
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) return trimmed.slice(idx);
  return trimmed;
}

export function readImageCanvasHandoff(): ImageCanvasHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IMAGE_CANVAS_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImageCanvasHandoff;
    if (!parsed?.imageUrl?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeImageCanvasHandoff(handoff: ImageCanvasHandoff): void {
  sessionStorage.setItem(
    IMAGE_CANVAS_HANDOFF_KEY,
    JSON.stringify({
      ...handoff,
      imageUrl: normalizeImageCanvasHandoffUrl(handoff.imageUrl),
    }),
  );
}

export function clearImageCanvasHandoff(): void {
  sessionStorage.removeItem(IMAGE_CANVAS_HANDOFF_KEY);
}
