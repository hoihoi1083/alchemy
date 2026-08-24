import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimatePlanApproxCapacity,
  STORYBOARD_LANDING_PACK,
  TOKEN_COST,
} from "../lib/billing/token-costs";

describe("estimatePlanApproxCapacity", () => {
  it("uses 8s H3 videos and ~10s 2-scene Kling pack for estimates", () => {
    assert.equal(STORYBOARD_LANDING_PACK.totalSec, 10);
    assert.equal(STORYBOARD_LANDING_PACK.scenes, 2);
    assert.equal(STORYBOARD_LANDING_PACK.totalTokens, 698);

    const free = estimatePlanApproxCapacity("free");
    assert.equal(free.tokens, 300);
    assert.equal(free.approxImages, 4);
    assert.equal(free.approxVideos8s, 0);
    assert.equal(free.approxStoryboards, 0);
    assert.equal(free.storyboardSec, 10);

    const standard = estimatePlanApproxCapacity("standard");
    assert.equal(standard.approxImages, Math.floor(8000 / TOKEN_COST.image));
    assert.equal(standard.approxVideos8s, 15);
    assert.equal(standard.approxStoryboards, 11);

    const pro = estimatePlanApproxCapacity("pro");
    assert.equal(pro.approxImages, 246);
    assert.equal(pro.approxVideos8s, 18);
    assert.equal(pro.approxStoryboards, 22);

    const master = estimatePlanApproxCapacity("master");
    assert.equal(master.approxImages, 430);
    assert.equal(master.approxVideos8s, 33);
    assert.equal(master.approxStoryboards, 40);
  });
});
