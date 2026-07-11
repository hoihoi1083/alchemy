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

export function effectiveTextStrokeWidth(
  stroke: string | undefined,
  fontSize: number,
  strokeWidthScale = 1,
): number {
  if (!stroke || stroke === "transparent") return 0;
  return Math.max(1, Math.round(fontSize * 0.1 * strokeWidthScale));
}
