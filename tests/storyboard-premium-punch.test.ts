import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coercePremiumPunchSceneCount,
  effectiveStoryboardSceneCount,
  isPremiumPunchRecipe,
  premiumPunchDurationForSceneCount,
  storyboardRecipePlannerLines,
} from "../lib/storyboard-recipes";
import { buildStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
} from "../lib/landing-recipes";

describe("storyboard premium-punch recipe", () => {
  it("defaults premium-punch to 6 scenes / 15s when UI is auto", () => {
    assert.equal(effectiveStoryboardSceneCount("premium-punch", "auto"), "6");
    assert.equal(effectiveStoryboardSceneCount("premium-punch", "4"), "4");
    assert.equal(effectiveStoryboardSceneCount("premium-punch", "5"), "6");
    assert.equal(coercePremiumPunchSceneCount("auto"), "6");
    assert.equal(premiumPunchDurationForSceneCount("6"), 15);
    assert.equal(premiumPunchDurationForSceneCount("4"), 12);
    assert.equal(isPremiumPunchRecipe("premium-punch"), true);
    assert.equal(isPremiumPunchRecipe("classic-tvc"), false);
  });

  it("injects 6-beat punch arc with float/frontal category adapt", () => {
    const lines = storyboardRecipePlannerLines("premium-punch", false, "6");
    const joined = lines.join("\n");
    assert.match(joined, /PREMIUM PUNCH/i);
    assert.match(joined, /EXACTLY 6 scenes/i);
    assert.match(joined, /PUNCH/i);
    assert.match(joined, /float-hero|frontal/i);
    assert.match(joined, /IMAGE 1/);

    const prompt = buildStoryboardPlanPromptForTest({
      product: "AirPods Pro",
      business: "",
      headline: "Silence the noise",
      subline: "",
      offer: "",
      storyboardBrief: "float earbuds then punch hero",
      durationSec: 15,
      sceneCountTarget: "6",
      market: "en",
      framing: "auto",
      styleHint: "",
      artStyleId: "realistic",
      storyboardRecipeId: "premium-punch",
    });
    assert.match(prompt, /EXACTLY 6 scenes/);
    assert.match(prompt, /PUNCH/i);
    assert.match(prompt, /AirPods Pro|float earbuds/i);
  });

  it("injects tight 4-beat punch arc", () => {
    const lines = storyboardRecipePlannerLines("premium-punch", false, "4");
    assert.match(lines.join("\n"), /EXACTLY 4 scenes/i);
  });

  it("landing recipe locks premium-punch storyboard id", () => {
    assert.equal(isLandingRecipeId("product-premium-punch-15s"), true);
    const def = LANDING_RECIPES["product-premium-punch-15s"];
    assert.equal(def.storyboardRecipeId, "premium-punch");
    assert.equal(def.storyboardSceneCount, "6");
    assert.equal(def.visualStyleId, "storyboard-video");
    assert.equal(def.workflowMode, "combined");
  });
});
