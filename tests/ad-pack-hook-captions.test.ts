import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { layoutHookSplitCaptions } from "../lib/ad-pack-hook-captions";

describe("layoutHookSplitCaptions", () => {
  it("places hook top and voiceover bottom for the full clip", () => {
    const lines = layoutHookSplitCaptions(
      "招財轉運的秘密",
      "太陽石手串，為你帶來好運與正能量。",
      6,
    );
    assert.equal(lines.length, 2);
    assert.deepEqual(lines[0], {
      startSec: 0,
      endSec: 6,
      text: "招財轉運的秘密",
      position: "top",
    });
    assert.deepEqual(lines[1], {
      startSec: 0,
      endSec: 6,
      text: "太陽石手串，為你帶來好運與正能量。",
      position: "bottom",
    });
  });

  it("falls back to a single bottom line when hook and body are identical", () => {
    const lines = layoutHookSplitCaptions("同一行", "同一行", 8);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.position, "bottom");
  });
});
