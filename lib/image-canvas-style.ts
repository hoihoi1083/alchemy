import { CAPTION_STYLE_PRESETS, type CaptionStylePresetId } from "@/lib/caption-burn-styles";
import type { ImageCanvasTextLayer } from "@/lib/image-canvas-layers";

/** Apply preset colors and scale to a text layer (fixes “preset selected but no visual change”). */
export function applyTextStylePreset(
  layer: ImageCanvasTextLayer,
  presetId: CaptionStylePresetId,
): Partial<ImageCanvasTextLayer> {
  const preset = CAPTION_STYLE_PRESETS[presetId];
  return {
    stylePreset: presetId,
    fill: preset.fill,
    stroke: preset.stroke,
    fontSizeScale: preset.fontSizeScale,
    fontFamily: preset.fontFamily,
  };
}

/**
 * Single scale factor for preview + burn.
 * Do NOT multiply preset × layer — applyTextStylePreset copies preset onto the layer.
 */
export function effectiveLayerFontSizeScale(
  layer: Pick<ImageCanvasTextLayer, "fontSizeScale" | "stylePreset">,
): number {
  const preset = CAPTION_STYLE_PRESETS[layer.stylePreset];
  const scale = layer.fontSizeScale ?? preset?.fontSizeScale ?? 1;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** Font size in px for a given image/stage width — same formula in Konva preview and burn. */
export function canvasTextFontSizePx(
  imageWidth: number,
  layer: Pick<ImageCanvasTextLayer, "fontSizeScale" | "stylePreset">,
): number {
  return Math.max(12, Math.round(imageWidth * 0.052 * effectiveLayerFontSizeScale(layer)));
}

export function effectiveTextStrokeWidth(
  stroke: string | undefined,
  fontSize: number,
  strokeWidthScale = 1,
): number {
  if (!stroke || stroke === "transparent") return 0;
  return Math.max(1, Math.round(fontSize * 0.1 * strokeWidthScale));
}
