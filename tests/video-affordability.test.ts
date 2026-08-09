import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateStoryboardVideoAffordability } from "../lib/video-affordability";

const base = {
  h3Cost: 1140,
  klingCost: 440,
  seedanceCost: 2520,
  allowKling: true,
  klingCanHitDuration: true,
  firstEngine: "minimax-h3" as const,
};

describe("evaluateStoryboardVideoAffordability", () => {
  it("runs H3 when balance covers it", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: 2000,
        hasReel: false,
      }),
      { action: "run-h3" },
    );
  });

  it("offers Kling when balance fits stitch but not H3", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: 896,
        hasReel: false,
      }),
      { action: "offer-kling", balance: 896, h3Cost: 1140, klingCost: 440 },
    );
  });

  it("runs Kling when user already chose it", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: 896,
        hasReel: false,
        preferEngine: "kling",
      }),
      { action: "run-kling" },
    );
  });

  it("upgrades when neither H3 nor Kling fits", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: 200,
        hasReel: false,
      }),
      { action: "upgrade", balance: 200, required: 1140 },
    );
  });

  it("never offers Kling on a research reel path", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: 896,
        hasReel: true,
        firstEngine: "seedance",
      }),
      { action: "upgrade", balance: 896, required: 1140 },
    );
  });

  it("billing-off (null balance) runs the requested engine", () => {
    assert.deepEqual(
      evaluateStoryboardVideoAffordability({
        ...base,
        balance: null,
        hasReel: false,
      }),
      { action: "run-h3" },
    );
  });
});
