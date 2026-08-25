import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nmsBoxes, parseBoxes, toPixelBox } from "../lib/edit-image-2-boxes";

describe("edit-image-2-boxes", () => {
  it("parses xywh objects", () => {
    const boxes = parseBoxes(
      { bboxes: [{ x: 10, y: 20, w: 30, h: 40, label: "Hello" }] },
      "text",
    );
    assert.equal(boxes.length, 1);
    assert.equal(boxes[0]!.label, "Hello");
    assert.equal(boxes[0]!.w, 30);
  });

  it("parses [x1,y1,x2,y2] with parallel labels", () => {
    const boxes = parseBoxes(
      {
        results: {
          bboxes: [[0.1, 0.2, 0.5, 0.6]],
          labels: ["Sale"],
          scores: [0.9],
        },
      },
      "text",
    );
    assert.equal(boxes.length, 1);
    assert.equal(boxes[0]!.label, "Sale");
    assert.equal(boxes[0]!.score, 0.9);
    const px = toPixelBox(boxes[0]!, 1000, 1000);
    assert.equal(px.left, 100);
    assert.equal(px.width, 400);
  });

  it("parses quads", () => {
    const boxes = parseBoxes(
      {
        quad_boxes: [[10, 10, 50, 10, 50, 40, 10, 40]],
        labels: ["Tab"],
      },
      "object",
    );
    assert.equal(boxes.length, 1);
    assert.equal(boxes[0]!.w, 40);
    assert.equal(boxes[0]!.h, 30);
  });

  it("runs object NMS", () => {
    const items = [
      { px: { left: 0, top: 0, width: 100, height: 100 }, score: 0.5 },
      { px: { left: 5, top: 5, width: 100, height: 100 }, score: 0.9 },
      { px: { left: 200, top: 200, width: 50, height: 50 }, score: 0.8 },
    ];
    const kept = nmsBoxes(items, 0.5);
    assert.equal(kept.length, 2);
    assert.equal(kept[0]!.score, 0.9);
  });
});
