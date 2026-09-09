import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBrushCutMappingBug,
  rescaleBrushStrokes,
} from "../lib/edit-image-2-brush-cutout";

/** Bounding-box area fraction (0–1). Old gate used this alone and blocked real cuts. */
function cutAreaFrac(wPct: number, hPct: number): number {
  return (wPct / 100) * (hPct / 100);
}

describe("edit-image-2 brush cut area gate", () => {
  it("a tall subject bbox can exceed 0.85 without being a mapping bug", () => {
    // 40% × 95% ≈ 0.38 — fine. 95% × 95% used to trip the old gate wrongly
    // when compared against stroke coverage.
    assert.ok(cutAreaFrac(40, 95) < 0.85);
    assert.ok(cutAreaFrac(95, 95) > 0.85);
  });

  it("rejects only when cut covers the frame but strokes did not", () => {
    assert.equal(
      isBrushCutMappingBug({
        strokeBBox: { width: 200, height: 200 },
        cutBBox: { width: 1900, height: 1900 },
        imgW: 2000,
        imgH: 2000,
      }),
      true,
    );
  });

  it("allows a large cut when strokes also covered most of the subject", () => {
    assert.equal(
      isBrushCutMappingBug({
        strokeBBox: { width: 1600, height: 1700 },
        cutBBox: { width: 1800, height: 1850 },
        imgW: 2000,
        imgH: 2000,
      }),
      false,
    );
  });

  it("old buggy gate (wPct*hPct > 65) wrongly rejected normal cuts", () => {
    assert.ok(20 * 25 > 65);
    assert.ok(cutAreaFrac(20, 25) < 0.85);
  });

  it("rescaleBrushStrokes keeps relative paint position after board resize", () => {
    const strokes = [[100, 50, 200, 50]];
    const next = rescaleBrushStrokes(strokes, 400, 300, 800, 600);
    assert.deepEqual(next, [[200, 100, 400, 100]]);
  });
});
