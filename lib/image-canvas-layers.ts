import type { CaptionStylePresetId } from "@/lib/caption-burn-styles";
import { newImageTextLayer, type ImageTextLayer } from "@/lib/image-text-overlay-types";

export type ImageShapeKind =
  | "rect"
  | "capsule"
  | "circle"
  | "line"
  | "arrow"
  | "badge"
  | "button"
  | "check-badge";

export type ImageShapeLayer = {
  id: string;
  kind: "shape";
  shape: ImageShapeKind;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  color: string;
  /** Stroke / border color — defaults to `color` when omitted. */
  strokeColor?: string;
  strokeWidth: number;
  fillOpacity: number;
  cornerRadius?: number;
};

export type ImageCanvasTextLayer = ImageTextLayer & { kind: "text" };

export type ImageLogoLayer = {
  id: string;
  kind: "logo";
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  url: string;
  /** width / height of source image — keeps aspect when resizing. */
  aspectRatio?: number;
};

export type ImageCanvasLayer = ImageCanvasTextLayer | ImageShapeLayer | ImageLogoLayer;

export function newImageLogoLayer(partial?: Partial<ImageLogoLayer>): ImageLogoLayer {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    kind: "logo",
    xPct: partial?.xPct ?? 78,
    yPct: partial?.yPct ?? 82,
    wPct: partial?.wPct ?? 18,
    hPct: partial?.hPct ?? 10,
    url: partial?.url ?? "",
    aspectRatio: partial?.aspectRatio,
  };
}

export function newImageShapeLayer(partial?: Partial<ImageShapeLayer>): ImageShapeLayer {
  const shape = partial?.shape ?? "rect";
  const defaults: Partial<ImageShapeLayer> =
    shape === "button"
      ? { color: "#ffffff", strokeColor: "#6b5344", strokeWidth: 2, fillOpacity: 1, cornerRadius: 4 }
      : shape === "capsule"
        ? { color: "#6b5344", strokeWidth: 0, fillOpacity: 1 }
        : shape === "badge"
          ? { color: "#e8e4df", strokeColor: "#d1d5db", strokeWidth: 1, fillOpacity: 0.92, cornerRadius: 6 }
          : shape === "check-badge"
            ? { color: "#6b5344", strokeWidth: 1.5, fillOpacity: 0.12 }
            : shape === "line"
              ? { strokeWidth: 2, fillOpacity: 0 }
              : {};
  return {
    id: partial?.id ?? crypto.randomUUID(),
    kind: "shape",
    shape,
    xPct: partial?.xPct ?? 20,
    yPct: partial?.yPct ?? 20,
    wPct: partial?.wPct ?? 25,
    hPct: partial?.hPct ?? 8,
    color: partial?.color ?? defaults.color ?? "#ef4444",
    strokeColor: partial?.strokeColor ?? defaults.strokeColor,
    strokeWidth: partial?.strokeWidth ?? defaults.strokeWidth ?? 4,
    fillOpacity: partial?.fillOpacity ?? defaults.fillOpacity ?? 0.15,
    cornerRadius: partial?.cornerRadius ?? defaults.cornerRadius,
  };
}

export function newImageCanvasTextLayer(partial?: Partial<ImageTextLayer>): ImageCanvasTextLayer {
  return { kind: "text", ...newImageTextLayer(partial) };
}

export function parseImageCanvasLayers(raw: unknown): ImageCanvasLayer[] {
  if (!Array.isArray(raw)) return [];
  const layers: ImageCanvasLayer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.kind === "shape") {
      layers.push(
        newImageShapeLayer({
          id: typeof row.id === "string" ? row.id : undefined,
          shape: row.shape as ImageShapeKind,
          xPct: typeof row.xPct === "number" ? row.xPct : undefined,
          yPct: typeof row.yPct === "number" ? row.yPct : undefined,
          wPct: typeof row.wPct === "number" ? row.wPct : undefined,
          hPct: typeof row.hPct === "number" ? row.hPct : undefined,
          color: typeof row.color === "string" ? row.color : undefined,
          strokeColor: typeof row.strokeColor === "string" ? row.strokeColor : undefined,
          strokeWidth: typeof row.strokeWidth === "number" ? row.strokeWidth : undefined,
          fillOpacity: typeof row.fillOpacity === "number" ? row.fillOpacity : undefined,
          cornerRadius: typeof row.cornerRadius === "number" ? row.cornerRadius : undefined,
        }),
      );
      continue;
    }
    if (row.kind === "logo") {
      layers.push(
        newImageLogoLayer({
          id: typeof row.id === "string" ? row.id : undefined,
          url: typeof row.url === "string" ? row.url : "",
          xPct: typeof row.xPct === "number" ? row.xPct : undefined,
          yPct: typeof row.yPct === "number" ? row.yPct : undefined,
          wPct: typeof row.wPct === "number" ? row.wPct : undefined,
          hPct: typeof row.hPct === "number" ? row.hPct : undefined,
          aspectRatio: typeof row.aspectRatio === "number" ? row.aspectRatio : undefined,
        }),
      );
      continue;
    }
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text && row.kind !== "text") continue;
    if (text) {
      layers.push(
        newImageCanvasTextLayer({
          id: typeof row.id === "string" ? row.id : undefined,
          text,
          xPct: typeof row.xPct === "number" ? row.xPct : undefined,
          yPct: typeof row.yPct === "number" ? row.yPct : undefined,
          wPct: typeof row.wPct === "number" ? row.wPct : undefined,
          align: row.align === "left" || row.align === "right" ? row.align : undefined,
          stylePreset: row.stylePreset as CaptionStylePresetId,
          fontSizeScale: typeof row.fontSizeScale === "number" ? row.fontSizeScale : undefined,
          fill: typeof row.fill === "string" ? row.fill : undefined,
          stroke: typeof row.stroke === "string" ? row.stroke : undefined,
          fontFamily: typeof row.fontFamily === "string" ? row.fontFamily : undefined,
        }),
      );
    }
  }
  return layers.slice(0, 24);
}
