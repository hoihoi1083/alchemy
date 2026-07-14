import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageTokenCostFromRequest, videoTokenCostFromRequest } from "../lib/billing/charge";
import {
  TOKEN_COST,
  estimateImageTokens,
  estimateVideoTokens,
} from "../lib/billing/token-costs";

describe("billing Phase 1 action costs", () => {
  it("maps generate-image request modes to catalog costs", () => {
    assert.equal(imageTokenCostFromRequest({}), TOKEN_COST.image);
    assert.equal(imageTokenCostFromRequest({ numImages: 2 }), TOKEN_COST.image_ab);
    assert.equal(
      imageTokenCostFromRequest({ imageOutputMode: "campaign" }),
      TOKEN_COST.campaign,
    );
    assert.equal(
      imageTokenCostFromRequest({ imageOutputMode: "teaching-carousel" }),
      TOKEN_COST.teaching_carousel,
    );
    assert.equal(
      imageTokenCostFromRequest({ multipartMode: "refine-logo" }),
      TOKEN_COST.image,
    );
  });

  it("prices storyboard / cinematic by scene count", () => {
    assert.equal(estimateImageTokens({ mode: "storyboard", sceneCount: 4 }), 80);
    assert.equal(estimateImageTokens({ mode: "storyboard", sceneCount: 3 }), 60);
  });

  it("prices video from resolution + duration", () => {
    assert.equal(
      videoTokenCostFromRequest({ resolution: "480p", fast: true, duration: 8 }),
      520,
    );
    assert.equal(
      estimateVideoTokens({ resolution: "720p", fast: true, duration: 8 }),
      600,
    );
    assert.equal(TOKEN_COST.music, 30);
    assert.equal(TOKEN_COST.voiceover, 5);
  });
});
