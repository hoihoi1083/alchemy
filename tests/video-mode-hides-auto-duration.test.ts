import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
  VIDEO_CREATIVE_MODES,
} from "../lib/creative-workflow";

describe("videoModeHidesAutoDuration", () => {
  it("hides auto for every recipe-owned timed mode", () => {
    for (const mode of VIDEO_CREATIVE_MODES) {
      if (!isRecipeOwnedVideoMode(mode)) continue;
      assert.equal(
        videoModeHidesAutoDuration(mode),
        true,
        `${mode} should hide auto`,
      );
    }
  });

  it("keeps auto available for freeform modes", () => {
    assert.equal(videoModeHidesAutoDuration("product-promo"), false);
    assert.equal(videoModeHidesAutoDuration("product-assistant"), false);
    assert.equal(videoModeHidesAutoDuration("image-to-video"), false);
    assert.equal(videoModeHidesAutoDuration("reference-concept"), false);
    assert.equal(videoModeHidesAutoDuration(null), false);
  });
});
