import type { CaptionStylePresetId } from "@/lib/caption-burn-styles";

export type ImageTextAlign = "left" | "center" | "right";

export type ImageTextLayer = {
  id: string;
  text: string;
  /** Anchor X, 0–100% */
  xPct: number;
  /** Anchor Y, 0–100% */
  yPct: number;
  /** Text box width as % of image width */
  wPct?: number;
  align?: ImageTextAlign;
  stylePreset: CaptionStylePresetId;
  fontSizeScale?: number;
  fill?: string;
  stroke?: string;
  fontFamily?: string;
};

export function newImageTextLayer(partial?: Partial<ImageTextLayer>): ImageTextLayer {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    text: partial?.text ?? "",
    xPct: partial?.xPct ?? 50,
    yPct: partial?.yPct ?? 18,
    stylePreset: partial?.stylePreset ?? "carousel-title",
    fontSizeScale: partial?.fontSizeScale,
    fill: partial?.fill,
    stroke: partial?.stroke,
    fontFamily: partial?.fontFamily,
    align: partial?.align ?? "center",
    wPct: partial?.wPct,
  };
}

export function parseImageTextLayers(raw: unknown): ImageTextLayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const layer = item as Partial<ImageTextLayer>;
      const text = typeof layer.text === "string" ? layer.text.trim() : "";
      if (!text) return null;
      return newImageTextLayer({
        id: typeof layer.id === "string" ? layer.id : undefined,
        text,
        xPct: typeof layer.xPct === "number" ? layer.xPct : undefined,
        yPct: typeof layer.yPct === "number" ? layer.yPct : undefined,
        stylePreset: layer.stylePreset,
        fontSizeScale: typeof layer.fontSizeScale === "number" ? layer.fontSizeScale : undefined,
        fill: typeof layer.fill === "string" ? layer.fill : undefined,
        stroke: typeof layer.stroke === "string" ? layer.stroke : undefined,
        fontFamily: typeof layer.fontFamily === "string" ? layer.fontFamily : undefined,
        align: layer.align === "left" || layer.align === "right" ? layer.align : "center",
        wPct: typeof layer.wPct === "number" ? layer.wPct : undefined,
      });
    })
    .filter((layer): layer is ImageTextLayer => layer !== null)
    .slice(0, 8);
}
