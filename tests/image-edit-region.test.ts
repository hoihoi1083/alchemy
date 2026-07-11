import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRegionRefinePrompt,
  clampRegion,
  parseImageEditRegions,
} from "../lib/image-edit-region";

describe("image-edit-region", () => {
  it("builds multi-zone prompt with hint image instructions", () => {
    const prompt = buildRegionRefinePrompt(
      [
        {
          id: "a",
          xPct: 10,
          yPct: 5,
          wPct: 20,
          hPct: 10,
          instruction: "Remove logo",
        },
        {
          id: "b",
          xPct: 40,
          yPct: 70,
          wPct: 30,
          hPct: 15,
          instruction: "Brighten product",
        },
      ],
      true,
    );
    assert.ok(prompt.includes("Zone 1"));
    assert.ok(prompt.includes("Zone 2"));
    assert.ok(prompt.includes("Remove logo"));
    assert.ok(prompt.includes("numbered red boxes"));
  });

  it("parses regions with instructions only", () => {
    const regions = parseImageEditRegions([
      { xPct: 0, yPct: 0, wPct: 50, hPct: 50, instruction: "Fix" },
      { instruction: "" },
    ]);
    assert.equal(regions.length, 1);
    assert.equal(regions[0].instruction, "Fix");
  });

  it("clamps region inside frame", () => {
    const r = clampRegion({
      id: "x",
      xPct: 95,
      yPct: 95,
      wPct: 50,
      hPct: 50,
      instruction: "x",
    });
    assert.ok(r.xPct + r.wPct <= 100);
    assert.ok(r.yPct + r.hPct <= 100);
  });
});
