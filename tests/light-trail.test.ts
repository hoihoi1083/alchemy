import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveLightTrailDialect,
  LIGHT_TRAIL_DIALECT_IDS,
  lightTrailDialectClause,
} from "../lib/light-trail";
import { isLockedSinglePosterStyle } from "../lib/visual-styles";
import {
  buildLightTrailImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { shouldPlanSingleImageAd } from "../lib/single-image-plan";
import {
  conceptStyleAllowsTextOnlyImage,
  visualStyleAllowedForPromotion,
} from "../lib/promotion-styles";
import { conceptCopyFocusKeyForStyle } from "../lib/concept-copy-focus";

describe("light-trail style", () => {
  it("has four dialects and resolves cues", () => {
    assert.equal(LIGHT_TRAIL_DIALECT_IDS.length, 4);
    assert.equal(resolveLightTrailDialect("auto", "mask hero armor"), "mask-beam");
    assert.equal(resolveLightTrailDialect("auto", "profile shoulder"), "profile-shear");
    assert.equal(resolveLightTrailDialect("auto", "portrait eyes close-up"), "eye-slash");
    assert.equal(resolveLightTrailDialect("auto", "team cast crew"), "cast-streak");
  });

  it("is locked single still for product and concept", () => {
    assert.equal(isLockedSinglePosterStyle("light-trail"), true);
    assert.equal(shouldPlanSingleImageAd("light-trail"), false);
    assert.equal(visualStyleAllowedForPromotion("light-trail", "physical"), true);
    assert.equal(visualStyleAllowedForPromotion("light-trail", "concept"), true);
    assert.equal(conceptStyleAllowsTextOnlyImage("light-trail"), true);
    assert.equal(conceptCopyFocusKeyForStyle("light-trail"), "light-trail");
  });

  it("resolves specialized prompt mode with light-trail DNA", () => {
    assert.equal(resolveImagePromptMode("light-trail", "promo-ai"), "light-trail");
    const vars = buildPromptVariables({
      product: "Sneakers",
      headline: "NIGHT CREW",
      subline: "MOVE FAST",
      market: "en",
      framing: "auto",
      artStyle: "realistic",
    });
    const prompt = buildLightTrailImagePrompt(vars, "cast-streak");
    assert.match(prompt, /LIGHT-TRAIL|动感光轨/);
    assert.match(prompt, /CAST STREAK/);
    assert.match(prompt, /crimson|CRIMSON/i);
    assert.match(prompt, /Single 9:16/);
    assert.match(lightTrailDialectClause("eye-slash"), /EYE SLASH/);
  });
});
