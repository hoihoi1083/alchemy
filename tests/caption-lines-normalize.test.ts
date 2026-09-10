import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCaptionLine, parseCaptionLinesInput } from "../lib/pipeline/caption-lines";

describe("normalizeCaptionLine", () => {
  it("preserves freeform position, style, spokenText, and stylePreset for burn", () => {
    const line = normalizeCaptionLine(
      {
        startSec: 0.5,
        endSec: 2.5,
        text: "Hello",
        spokenText: "Hello there",
        position: "bottom",
        stylePreset: "classic",
        xPct: 42,
        yPct: 78,
        style: {
          fill: "#fff",
          stroke: "#000",
          strokeWidth: 2,
          fontSizeScale: 1.2,
          shadowColor: "#000",
          shadowBlur: 4,
        },
      },
      10,
      0,
    );
    assert.equal(line.text, "Hello");
    assert.equal(line.spokenText, "Hello there");
    assert.equal(line.stylePreset, "classic");
    assert.equal(line.xPct, 42);
    assert.equal(line.yPct, 78);
    assert.equal(line.style?.fill, "#fff");
    assert.equal(line.style?.fontSizeScale, 1.2);
  });

  it("clamps pct and drops empty optional fields", () => {
    const line = normalizeCaptionLine(
      { startSec: 0, endSec: 1, text: "Hi", xPct: 200, yPct: -5, spokenText: "  " },
      8,
      0,
    );
    assert.equal(line.xPct, 100);
    assert.equal(line.yPct, 0);
    assert.equal(line.spokenText, undefined);
  });

  it("parseCaptionLinesInput keeps drag coords through the burn parser", () => {
    const lines = parseCaptionLinesInput(
      [{ startSec: 0, endSec: 2, text: "A", xPct: 50, yPct: 80, stylePreset: "pop" }],
      12,
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0]!.xPct, 50);
    assert.equal(lines[0]!.yPct, 80);
    assert.equal(lines[0]!.stylePreset, "pop");
  });
});
