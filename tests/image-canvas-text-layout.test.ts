import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captionBlockLineYs,
  maxCharsPerLine,
  planCaptionBurnText,
  wrapCaptionTextForVideo,
  wrapTextToLines,
  wrappedLineCount,
} from "../lib/image-canvas-text-layout";

describe("image-canvas-text-layout", () => {
  it("wraps long latin text within box width", () => {
    const fontSize = 18;
    const boxW = 200;
    const lines = wrapTextToLines(
      "Headlinesdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf",
      boxW,
      fontSize,
    );
    assert.ok(lines.length > 1);
    for (const line of lines) {
      assert.ok(line.length <= maxCharsPerLine(boxW, fontSize, line) + 2);
    }
  });

  it("honours manual newlines", () => {
    const lines = wrapTextToLines("Line one\nLine two", 400, 18);
    assert.deepEqual(lines, ["Line one", "Line two"]);
  });

  it("counts wrapped lines for preview height", () => {
    const count = wrappedLineCount("abcdefghijklmnopqrstuvwxyz", 80, 18);
    assert.ok(count > 1);
  });

  it("wrapCaptionTextForVideo wraps long English onto next rows", () => {
    const lines = wrapCaptionTextForVideo(
      "Rejuvenate your skin in just 55 minutes with a special discount offer today",
      1080,
    );
    assert.ok(lines.length >= 2);
    assert.ok(lines.every((l) => l.length > 0));
  });

  it("wrapCaptionTextForVideo wraps long Chinese onto next rows", () => {
    const lines = wrapCaptionTextForVideo(
      "只需五十五分鐘即可煥活肌膚並享受專業水療護理體驗立即預約",
      1080,
    );
    assert.ok(lines.length >= 2);
  });

  it("bottom multi-line block stays above bottom safe margin", () => {
    const height = 1920;
    const fontSize = 56;
    const lineHeight = Math.round(fontSize * 1.35);
    const ys = captionBlockLineYs({
      position: "bottom",
      lineCount: 4,
      frameHeight: height,
      fontSize,
      lineHeight,
    });
    assert.equal(ys.length, 4);
    assert.ok(ys[0]! < ys[3]!);
    const halfGlyph = fontSize * 0.55;
    const maxBottom = height - Math.round(height * 0.08);
    assert.ok(ys[3]! + halfGlyph <= maxBottom + 1);
  });

  it("planCaptionBurnText shrinks font when wrap is tall", () => {
    const long =
      "Special offer today only rejuvenate your skin in fifty five minutes with professional spa care and limited discount";
    const plan = planCaptionBurnText(long, 720, 1280, { position: "bottom" });
    assert.ok(plan.lines.length >= 2);
    assert.ok(plan.lineYs.length === plan.lines.length);
    assert.ok(plan.lineYs.every((y) => y > 0 && y < 1280));
    const block = plan.lines.length * plan.fontSize * 1.35;
    assert.ok(block <= 1280 * 0.32 + plan.fontSize);
  });
});
