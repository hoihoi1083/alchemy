import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateRemainingSec,
  estimateVideoJobTotalSec,
  PROGRESS_ESTIMATES,
} from "../lib/generation-progress-estimates";

describe("generation progress estimates", () => {
  it("uses longer totals for reference R2V", () => {
    assert.equal(
      estimateVideoJobTotalSec("generate", false),
      PROGRESS_ESTIMATES.videoSeedanceSec,
    );
    assert.equal(
      estimateVideoJobTotalSec("generate", false, { referenceR2v: true }),
      PROGRESS_ESTIMATES.videoReferenceR2vSec,
    );
    assert.ok(PROGRESS_ESTIMATES.videoReferenceR2vSec > 300);
  });

  it("does not collapse to ~2s after overrun", () => {
    const total = 210;
    assert.ok(estimateRemainingSec(total, 50) >= 8);
    assert.ok(estimateRemainingSec(total, 208) >= 8);
    const overrunEta = estimateRemainingSec(total, 400);
    assert.ok(overrunEta >= 45);
    assert.ok(overrunEta <= 240);
  });
});
