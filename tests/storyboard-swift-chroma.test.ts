import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceSwiftChromaSceneCount,
  effectiveStoryboardSceneCount,
  fourOrSixDurationForSceneCount,
  isProductFirstStoryboardRecipe,
  isSwiftChromaRecipe,
  storyboardRecipePlannerLines,
} from "../lib/storyboard-recipes";
import { buildStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
} from "../lib/landing-recipes";

describe("storyboard swift-chroma / 疾行幻彩 recipe", () => {
  it("defaults to 4 scenes / 12s and is not product-first", () => {
    assert.equal(effectiveStoryboardSceneCount("swift-chroma", "auto"), "4");
    assert.equal(effectiveStoryboardSceneCount("swift-chroma", "4"), "4");
    assert.equal(effectiveStoryboardSceneCount("swift-chroma", "5"), "4");
    assert.equal(effectiveStoryboardSceneCount("swift-chroma", "6"), "6");
    assert.equal(coerceSwiftChromaSceneCount("auto"), "4");
    assert.equal(fourOrSixDurationForSceneCount("4"), 12);
    assert.equal(fourOrSixDurationForSceneCount("6"), 15);
    assert.equal(isSwiftChromaRecipe("swift-chroma"), true);
    assert.equal(isProductFirstStoryboardRecipe("swift-chroma"), false);
  });

  it("injects 4-beat chase → SKU carry → vault → lockup for product", () => {
    const lines = storyboardRecipePlannerLines("swift-chroma", false, "4");
    const joined = lines.join("\n");
    assert.match(joined, /SWIFT CHROMA|疾行幻彩/i);
    assert.match(joined, /EXACTLY 4 scenes/i);
    assert.match(joined, /FULL-BODY|street chase|VAULT|GRAPHIC LOCKUP/i);
    assert.match(joined, /IMAGE 1/);
    assert.match(joined, /disembodied|packshot|FORBIDDEN/i);

    const prompt = buildStoryboardPlanPromptForTest({
      product: "portable power station",
      business: "",
      headline: "Power anywhere",
      subline: "",
      offer: "",
      storyboardBrief: "wet city neon chase",
      durationSec: 12,
      sceneCountTarget: "4",
      market: "en",
      framing: "auto",
      styleHint: "",
      artStyleId: "realistic",
      storyboardRecipeId: "swift-chroma",
    });
    assert.match(prompt, /EXACTLY 4 scenes/);
    assert.match(prompt, /疾行幻彩|SWIFT CHROMA/i);
    assert.match(prompt, /portable power station|wet city/i);
  });

  it("injects concept arc without fake SKU", () => {
    const joined = storyboardRecipePlannerLines("swift-chroma", true, "4").join(
      "\n",
    );
    assert.match(joined, /CONCEPT/i);
    assert.match(joined, /do NOT invent a fake|No fake|fake packaged/i);
    assert.match(joined, /EXACTLY 4 scenes/i);
  });

  it("injects 6-beat expanded arc", () => {
    const joined = storyboardRecipePlannerLines("swift-chroma", false, "6").join(
      "\n",
    );
    assert.match(joined, /EXACTLY 6 scenes/i);
    assert.match(joined, /VAULT|GRAPHIC LOCKUP/i);
  });

  it("landing recipes lock swift-chroma for product + concept", () => {
    assert.equal(isLandingRecipeId("product-swift-chroma-12s"), true);
    assert.equal(isLandingRecipeId("concept-swift-chroma-12s"), true);
    const product = LANDING_RECIPES["product-swift-chroma-12s"];
    assert.equal(product.storyboardRecipeId, "swift-chroma");
    assert.equal(product.storyboardSceneCount, "4");
    assert.equal(product.visualStyleId, "storyboard-video");
    assert.equal(product.workflowMode, "combined");
    assert.equal(product.promotionMode, "physical");
    const concept = LANDING_RECIPES["concept-swift-chroma-12s"];
    assert.equal(concept.storyboardRecipeId, "swift-chroma");
    assert.equal(concept.promotionMode, "concept");
  });
});
