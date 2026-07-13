import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  maxCharsPerLine,
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
      assert.ok(line.length <= maxCharsPerLine(boxW, fontSize) + 2);
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
});
