import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePhotoDoodleDialect,
  PHOTO_DOODLE_DIALECT_IDS,
  photoDoodleDialectClause,
} from "../lib/photo-doodle";
import { isLockedSinglePosterStyle } from "../lib/visual-styles";
import {
  buildPhotoDoodleImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { shouldPlanSingleImageAd } from "../lib/single-image-plan";
import { visualStyleAllowedForPromotion } from "../lib/promotion-styles";
import { conceptCopyFocusKeyForStyle } from "../lib/concept-copy-focus";

describe("photo-doodle style", () => {
  it("has four dialects and resolves cues", () => {
    assert.equal(PHOTO_DOODLE_DIALECT_IDS.length, 4);
    assert.equal(resolvePhotoDoodleDialect("auto", "neon nightlife cassette"), "city-pop");
    assert.equal(resolvePhotoDoodleDialect("auto", "mountain flower travel"), "nature-frame");
    assert.equal(resolvePhotoDoodleDialect("auto", "streetwear fashion model"), "people-orbit");
    assert.equal(resolvePhotoDoodleDialect("auto", "commute coffee crosswalk"), "commute");
  });

  it("is locked single still for product and concept", () => {
    assert.equal(isLockedSinglePosterStyle("photo-doodle"), true);
    assert.equal(shouldPlanSingleImageAd("photo-doodle"), false);
    assert.equal(visualStyleAllowedForPromotion("photo-doodle", "physical"), true);
    assert.equal(visualStyleAllowedForPromotion("photo-doodle", "concept"), true);
    assert.equal(conceptCopyFocusKeyForStyle("photo-doodle"), "photo-doodle");
  });

  it("resolves specialized prompt mode with photo-doodle DNA", () => {
    assert.equal(resolveImagePromptMode("photo-doodle", "promo-ai"), "photo-doodle");
    const vars = buildPromptVariables({
      product: "Sneakers",
      headline: "RUSH HOUR",
      subline: "WALK WITH ME",
      market: "en",
      framing: "auto",
      artStyle: "realistic",
    });
    const prompt = buildPhotoDoodleImagePrompt(vars, "commute");
    assert.match(prompt, /PHOTO-DOODLE|实景插画/);
    assert.match(prompt, /COMMUTE STREET/);
    assert.match(prompt, /Single 9:16/);
    assert.match(photoDoodleDialectClause("city-pop"), /CITY POP/);
  });
});
