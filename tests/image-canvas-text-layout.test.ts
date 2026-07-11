import { describe, expect, it } from "vitest";
import { maxCharsPerLine, wrapTextToLines, wrappedLineCount } from "@/lib/image-canvas-text-layout";

describe("image-canvas-text-layout", () => {
  it("wraps long latin text within box width", () => {
    const fontSize = 18;
    const boxW = 200;
    const lines = wrapTextToLines(
      "Headlinesdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf",
      boxW,
      fontSize,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(maxCharsPerLine(boxW, fontSize) + 2);
    }
  });

  it("honours manual newlines", () => {
    const lines = wrapTextToLines("Line one\nLine two", 400, 18);
    expect(lines).toEqual(["Line one", "Line two"]);
  });

  it("counts wrapped lines for preview height", () => {
    const count = wrappedLineCount("abcdefghijklmnopqrstuvwxyz", 80, 18);
    expect(count).toBeGreaterThan(1);
  });
});
