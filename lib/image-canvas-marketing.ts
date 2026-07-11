import {
  newImageCanvasTextLayer,
  newImageShapeLayer,
  type ImageCanvasLayer,
} from "@/lib/image-canvas-layers";
import { CANVAS_LEFT, nextInsertY } from "@/lib/image-canvas-layout";

export const CAROUSEL_BROWN = "#6b5344";
export const CAROUSEL_BROWN_DARK = "#4a3728";
export const CAROUSEL_BROWN_TEXT = "#5c4033";

/** Building-block types users add one at a time (not a full auto-layout). */
export type MarketingBlockId =
  | "title"
  | "capsule-label"
  | "bullet-item"
  | "cta-button"
  | "divider-line"
  | "slide-number";

/**
 * Insert a single building block below existing layers.
 * Each block uses aligned anchors so shape + text line up.
 */
export function buildMarketingBlock(
  blockId: MarketingBlockId,
  existingLayers: ImageCanvasLayer[],
  text?: string,
): ImageCanvasLayer[] {
  const y = nextInsertY(existingLayers);

  switch (blockId) {
    case "title":
      return [
        newImageCanvasTextLayer({
          text: text ?? "主標題 | 副標題",
          xPct: CANVAS_LEFT,
          yPct: y,
          wPct: 80,
          align: "left",
          stylePreset: "carousel-title",
          fill: CAROUSEL_BROWN_DARK,
          stroke: "transparent",
          fontSizeScale: 1.12,
        }),
      ];

    case "capsule-label": {
      const wPct = 72;
      const cx = CANVAS_LEFT + wPct / 2;
      return [
        newImageShapeLayer({
          shape: "capsule",
          xPct: cx,
          yPct: y,
          wPct,
          hPct: 5.5,
          color: CAROUSEL_BROWN,
          strokeColor: CAROUSEL_BROWN,
          strokeWidth: 0,
          fillOpacity: 1,
        }),
        newImageCanvasTextLayer({
          text: text ?? "膠囊標籤文字",
          xPct: CANVAS_LEFT,
          yPct: y,
          wPct,
          align: "left",
          stylePreset: "carousel-white",
          fill: "#ffffff",
          stroke: "transparent",
          fontSizeScale: 0.9,
        }),
      ];
    }

    case "bullet-item": {
      const iconCx = CANVAS_LEFT + 2.5;
      const textLeft = CANVAS_LEFT + 7;
      return [
        newImageShapeLayer({
          shape: "check-badge",
          xPct: iconCx,
          yPct: y,
          wPct: 5,
          hPct: 3.2,
          color: CAROUSEL_BROWN,
          strokeColor: CAROUSEL_BROWN,
          strokeWidth: 1.5,
          fillOpacity: 0.12,
        }),
        newImageCanvasTextLayer({
          text: text ?? "重點說明：材質、功效或賣點",
          xPct: textLeft,
          yPct: y,
          wPct: 82,
          align: "left",
          stylePreset: "carousel-body",
          fill: CAROUSEL_BROWN_TEXT,
          stroke: "transparent",
          fontSizeScale: 0.88,
        }),
      ];
    }

    case "cta-button": {
      const wPct = 34;
      const cx = 100 - CANVAS_LEFT - wPct / 2;
      return [
        newImageShapeLayer({
          shape: "button",
          xPct: cx,
          yPct: y,
          wPct,
          hPct: 5.5,
          color: CAROUSEL_BROWN,
          strokeColor: CAROUSEL_BROWN,
          strokeWidth: 2,
          fillOpacity: 1,
          cornerRadius: 4,
        }),
        newImageCanvasTextLayer({
          text: text ?? "了解詳情",
          xPct: cx,
          yPct: y,
          wPct: wPct - 2,
          align: "center",
          stylePreset: "carousel-cta",
          fill: CAROUSEL_BROWN_TEXT,
          stroke: "transparent",
          fontSizeScale: 0.9,
        }),
      ];
    }

    case "divider-line": {
      const lineW = 22;
      return [
        newImageShapeLayer({
          shape: "line",
          xPct: 24,
          yPct: y,
          wPct: lineW,
          hPct: 0.4,
          color: CAROUSEL_BROWN,
          strokeWidth: 1.5,
          fillOpacity: 0,
        }),
        newImageCanvasTextLayer({
          text: text ?? "品牌或系列名",
          xPct: 50,
          yPct: y,
          wPct: 32,
          align: "center",
          stylePreset: "carousel-body",
          fill: CAROUSEL_BROWN_TEXT,
          stroke: "transparent",
          fontSizeScale: 0.82,
        }),
        newImageShapeLayer({
          shape: "line",
          xPct: 76,
          yPct: y,
          wPct: lineW,
          hPct: 0.4,
          color: CAROUSEL_BROWN,
          strokeWidth: 1.5,
          fillOpacity: 0,
        }),
      ];
    }

    case "slide-number": {
      const wPct = 9;
      const cx = CANVAS_LEFT + wPct / 2;
      return [
        newImageShapeLayer({
          shape: "badge",
          xPct: cx,
          yPct: y,
          wPct,
          hPct: 4.5,
          color: "#e8e4df",
          strokeColor: "#d1d5db",
          strokeWidth: 1,
          fillOpacity: 0.92,
          cornerRadius: 6,
        }),
        newImageCanvasTextLayer({
          text: text ?? "01",
          xPct: cx,
          yPct: y,
          wPct,
          align: "center",
          stylePreset: "carousel-body",
          fill: "#6b7280",
          stroke: "transparent",
          fontSizeScale: 0.75,
        }),
      ];
    }

    default:
      return [];
  }
}
