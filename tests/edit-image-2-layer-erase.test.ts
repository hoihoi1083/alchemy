import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stageRectToCropRect } from "../lib/edit-image-2-layer-erase";

describe("edit-image-2 layer erase coords", () => {
  it("maps intersecting stage box into crop pixels", () => {
    const rect = stageRectToCropRect(
      { x: 50, y: 40, w: 40, h: 30 },
      { x: 40, y: 30, w: 100, h: 80 },
      200,
      160,
    );
    assert.ok(rect);
    assert.equal(rect!.left, 20); // (50-40)/100 * 200
    assert.equal(rect!.top, 20); // (40-30)/80 * 160
    assert.equal(rect!.width, 80); // 40/100 * 200
    assert.equal(rect!.height, 60); // 30/80 * 160
  });

  it("returns null when box misses the layer", () => {
    assert.equal(
      stageRectToCropRect(
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 50, y: 50, w: 100, h: 100 },
        100,
        100,
      ),
      null,
    );
  });
});
