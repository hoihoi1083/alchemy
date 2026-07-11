import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDigestSegmentStarts } from "../lib/reference-video-prepare";

describe("computeDigestSegmentStarts", () => {
  it("returns single start for short clips", () => {
    assert.deepEqual(computeDigestSegmentStarts(12), [0]);
  });

  it("spreads segments across a 3-minute reel", () => {
    const starts = computeDigestSegmentStarts(180);
    assert.equal(starts.length, 5);
    assert.ok(starts[0] < 10, "hook near start");
    assert.ok(starts[4] > 150, "closing beat near end");
    assert.ok(starts[2] > 70 && starts[2] < 110, "middle beat near center");
    for (let i = 1; i < starts.length; i++) {
      assert.ok(starts[i] > starts[i - 1], "monotonic");
    }
  });
});
