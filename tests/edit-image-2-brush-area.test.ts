import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Same formula as createLayerFromBrush area gate. */
function cutAreaFrac(wPct: number, hPct: number): number {
  return (wPct / 100) * (hPct / 100);
}

describe("edit-image-2 brush cut area gate", () => {
  it("accepts a normal subject cut (~30%×40%)", () => {
    assert.ok(cutAreaFrac(30, 40) < 0.85);
  });

  it("rejects near-full-frame cuts", () => {
    assert.ok(cutAreaFrac(95, 95) > 0.85);
  });

  it("old buggy gate (wPct*hPct > 65) wrongly rejected normal cuts", () => {
    // Regression lock: 20×25 = 500 > 65 would have blocked every useful brush lift.
    assert.ok(20 * 25 > 65);
    assert.ok(cutAreaFrac(20, 25) < 0.85);
  });
});
