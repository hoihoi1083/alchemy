import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateKlingStoryboardTokens,
  klingClipTokens,
  KLING_TURBO_PRO,
} from "../lib/billing/token-costs";
import {
  klingClipDurationForScene,
  klingClipDurationForStoryboard,
  klingSceneMotionPrompt,
} from "../lib/kling-storyboard-fallback";

describe("Kling storyboard fallback billing", () => {
  it("prices 5s and 10s clips from fal Turbo Pro rates", () => {
    assert.equal(klingClipTokens(5), KLING_TURBO_PRO.tokens5s);
    assert.equal(klingClipTokens(5), 110);
    assert.equal(klingClipTokens(10), 110 + 22 * 5);
    assert.equal(klingClipTokens(10), 220);
  });

  it("estimates N scenes × clip length", () => {
    assert.equal(estimateKlingStoryboardTokens(4, 5), 440);
    assert.equal(estimateKlingStoryboardTokens(4, 10), 880);
    assert.equal(estimateKlingStoryboardTokens(1, 5), 110);
  });
});

describe("Kling storyboard clip duration helpers", () => {
  it("maps scene span to 5 or 10 seconds", () => {
    assert.equal(klingClipDurationForScene(0, 2), 5);
    assert.equal(klingClipDurationForScene(0, 5), 5);
    assert.equal(klingClipDurationForScene(0, 6), 10);
    assert.equal(klingClipDurationForScene(2, 10), 10);
  });

  it("picks default clip length from total duration / scene count", () => {
    assert.equal(klingClipDurationForStoryboard(4, 8), 5);
    assert.equal(klingClipDurationForStoryboard(2, 12), 10);
    assert.equal(klingClipDurationForStoryboard(1, 8), 10);
  });

  it("builds a motion prompt that preserves identity", () => {
    const prompt = klingSceneMotionPrompt({
      sceneIndex: 2,
      sceneCount: 4,
      sceneDescription: "女主角微笑看向鏡頭",
      theme: "週末咖啡",
    });
    assert.match(prompt, /scene 2\/4/i);
    assert.match(prompt, /週末咖啡/);
    assert.match(prompt, /女主角微笑/);
    assert.match(prompt, /Keep the same people/);
  });
});
