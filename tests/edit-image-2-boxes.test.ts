import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWeakOcrLabel,
  matchOcrToLayerBox,
  mergeAdjacentTextBoxes,
  nmsBoxes,
  parseBoxes,
  toPixelBox,
} from "../lib/edit-image-2-boxes";

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

  it("flags weak OCR keyboard-smash labels", () => {
    assert.equal(isWeakOcrLabel("sadfsadfsadfsa"), true);
    assert.equal(isWeakOcrLabel("asdfasdf"), true);
    assert.equal(isWeakOcrLabel("如何成就CR7"), false);
    assert.equal(isWeakOcrLabel("C罗为什么"), false);
  });

  it("matches OCR labels onto Qwen layer boxes by containment", () => {
    const layer = { left: 100, top: 800, width: 400, height: 60 };
    const hit = matchOcrToLayerBox(layer, [
      {
        px: { left: 120, top: 810, width: 350, height: 40 },
        label: "7号 = 商业身份系统",
        score: 0.9,
      },
      {
        px: { left: 0, top: 0, width: 50, height: 20 },
        label: "noise",
        score: 0.5,
      },
    ]);
    assert.ok(hit);
    assert.equal(hit!.label, "7号 = 商业身份系统");
  });

  it("merges same-line OCR fragments into one layer", () => {
    const merged = mergeAdjacentTextBoxes([
      {
        box: { x: 10, y: 20, w: 30, h: 40, label: "7", kind: "text", score: 1 },
        px: { left: 10, top: 20, width: 30, height: 40 },
        score: 1,
      },
      {
        box: {
          x: 48,
          y: 22,
          w: 200,
          h: 36,
          label: "如何成就CR7",
          kind: "text",
          score: 1,
        },
        px: { left: 48, top: 22, width: 200, height: 36 },
        score: 1,
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.box.label, "7如何成就CR7");
    assert.equal(merged[0]!.px.left, 10);
    assert.equal(merged[0]!.px.width, 238);
  });

  it("does not glue CR7 logo onto long body copy on the same line", () => {
    const merged = mergeAdjacentTextBoxes([
      {
        box: { x: 10, y: 100, w: 80, h: 40, label: "CR7", kind: "text", score: 1 },
        px: { left: 10, top: 100, width: 80, height: 40 },
        score: 1,
      },
      {
        box: {
          x: 100,
          y: 102,
          w: 320,
          h: 36,
          label: "从俱乐部号码升级为全球身份符号",
          kind: "text",
          score: 1,
        },
        px: { left: 100, top: 102, width: 320, height: 36 },
        score: 1,
      },
    ]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0]!.box.label, "CR7");
    assert.equal(merged[1]!.box.label, "从俱乐部号码升级为全球身份符号");
  });
});
