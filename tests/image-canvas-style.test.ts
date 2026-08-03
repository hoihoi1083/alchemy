import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canvasTextFontSizePx,
  effectiveLayerFontSizeScale,
} from "@/lib/image-canvas-style";

describe("image-canvas-style font scale", () => {
  it("uses a single scale (no preset × layer multiply)", () => {
    const layer = { stylePreset: "carousel-title" as const, fontSizeScale: 1.2 };
    assert.equal(effectiveLayerFontSizeScale(layer), 1.2);
    const px = canvasTextFontSizePx(1000, layer);
    assert.equal(px, Math.round(1000 * 0.052 * 1.2));
  });

  it("falls back to preset scale when layer scale omitted", () => {
    const layer = { stylePreset: "xhs-bold" as const };
    assert.ok(effectiveLayerFontSizeScale(layer) > 1);
  });
});
