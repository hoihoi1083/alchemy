import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateHeygenPresenterTokens,
  estimateSpeechDurationSec,
  HEYGEN_TOKENS_PER_SEC,
  TOKEN_COST,
  VIDEO_TOKENS_PER_SEC,
} from "../lib/billing/token-costs";

describe("HeyGen presenter billing", () => {
  it("bills ~30 tokens per audio second ($0.10/s)", () => {
    assert.equal(HEYGEN_TOKENS_PER_SEC, 30);
    assert.equal(estimateHeygenPresenterTokens(8), 240);
    assert.equal(estimateHeygenPresenterTokens(10.2), 330);
    assert.equal(estimateHeygenPresenterTokens(3), 120); // min 4s
  });

  it("estimates speech length for affordability pre-check", () => {
    assert.ok(estimateSpeechDurationSec("Hello world this is a short line.", "en") >= 4);
    assert.ok(estimateSpeechDurationSec("粉白雪花手串，清新脱俗，戴出仙氣。", "hk") >= 4);
  });

  it("storyboard scene covers Nano Banana 1K", () => {
    assert.equal(TOKEN_COST.storyboard_scene, 26);
    assert.equal(TOKEN_COST.storyboard_batch, 104);
  });

  it("480p Seedance rate tracks fal pixel formula", () => {
    assert.equal(VIDEO_TOKENS_PER_SEC["480p"], 42);
  });
});
