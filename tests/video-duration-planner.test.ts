import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePlannerDurationSec,
  videoDurationPlannerBlock,
} from "../lib/video-duration-planner";

describe("resolvePlannerDurationSec", () => {
  it("resolves auto and explicit values", () => {
    assert.equal(resolvePlannerDurationSec("auto"), 8);
    assert.equal(resolvePlannerDurationSec("auto", 6), 6);
    assert.equal(resolvePlannerDurationSec("6"), 6);
    assert.equal(resolvePlannerDurationSec(undefined), 8);
  });
});

describe("videoDurationPlannerBlock", () => {
  it("includes exact output seconds for DeepSeek", () => {
    const block = videoDurationPlannerBlock(6).join("\n");
    assert.match(block, /EXACTLY 6 seconds/);
    assert.match(block, /standalone complete/);
  });

  it("uses tighter pacing copy for 4s clips", () => {
    const block = videoDurationPlannerBlock(4).join("\n");
    assert.match(block, /ONE visual beat/);
  });
});
