import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimatePlanApproxCapacity,
  STORYBOARD_LANDING_PACK,
} from "../lib/billing/token-costs";

describe("estimatePlanApproxCapacity", () => {
  it("uses ~10s storyboard pack (2×5s Kling + stills) for video estimates", () => {
    assert.equal(STORYBOARD_LANDING_PACK.totalSec, 10);
    assert.equal(STORYBOARD_LANDING_PACK.scenes, 2);
    assert.equal(STORYBOARD_LANDING_PACK.totalTokens, 272);

    const free = estimatePlanApproxCapacity("free");
    assert.equal(free.tokens, 500);
    assert.equal(free.approxImages, 20);
    assert.equal(free.approxStoryboards, 1);
    assert.equal(free.storyboardSec, 10);

    const standard = estimatePlanApproxCapacity("standard");
    assert.equal(standard.approxImages, 120);
    assert.equal(standard.approxStoryboards, 11);

    const pro = estimatePlanApproxCapacity("pro");
    assert.equal(pro.approxImages, 320);
    assert.equal(pro.approxStoryboards, 29);

    const master = estimatePlanApproxCapacity("master");
    assert.equal(master.approxImages, 640);
    assert.equal(master.approxStoryboards, 58);
  });
});
