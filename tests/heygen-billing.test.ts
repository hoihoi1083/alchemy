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
  it("bills ~82 tokens per audio second ($0.10/s at 75% Master yearly)", () => {
    assert.equal(HEYGEN_TOKENS_PER_SEC, 82);
    assert.equal(estimateHeygenPresenterTokens(8), 656);
    assert.equal(estimateHeygenPresenterTokens(10.2), 902);
    assert.equal(estimateHeygenPresenterTokens(3), 328); // min 4s
  });

  it("estimates speech length for affordability pre-check", () => {
    assert.ok(estimateSpeechDurationSec("Hello world this is a short line.", "en") >= 4);
    assert.ok(estimateSpeechDurationSec("粉白雪花手串，清新脱俗，戴出仙氣。", "hk") >= 4);
  });

  it("storyboard scene matches 1K image cost", () => {
    assert.equal(TOKEN_COST.storyboard_scene, 65);
    assert.equal(TOKEN_COST.storyboard_batch, 260);
  });

  it("480p Seedance rate tracks fal pixel formula at 75% Master yearly", () => {
    assert.equal(VIDEO_TOKENS_PER_SEC["480p"], 113);
  });
});
