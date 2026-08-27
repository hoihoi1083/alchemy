import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceFourOrSixSceneCount,
  effectiveStoryboardSceneCount,
  isBrandWarpRecipe,
  isCinematicAssembleRecipe,
  isProductFirstStoryboardRecipe,
  isStudioTypeRecipe,
  storyboardRecipePlannerLines,
} from "../lib/storyboard-recipes";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
} from "../lib/landing-recipes";

describe("storyboard cinematic-assemble / studio-type / brand-warp", () => {
  it("couples 4/6 scenes like premium punch", () => {
    assert.equal(effectiveStoryboardSceneCount("cinematic-assemble", "auto"), "6");
    assert.equal(effectiveStoryboardSceneCount("studio-type", "4"), "4");
    assert.equal(effectiveStoryboardSceneCount("brand-warp", "5"), "4");
    assert.equal(effectiveStoryboardSceneCount("brand-warp", "auto"), "4");
    assert.equal(effectiveStoryboardSceneCount("brand-warp", "6"), "6");
    assert.equal(coerceFourOrSixSceneCount("auto"), "6");
    assert.equal(isCinematicAssembleRecipe("cinematic-assemble"), true);
    assert.equal(isStudioTypeRecipe("studio-type"), true);
    assert.equal(isBrandWarpRecipe("brand-warp"), true);
    assert.equal(isProductFirstStoryboardRecipe("cinematic-assemble"), true);
    assert.equal(isProductFirstStoryboardRecipe("studio-type"), false);
    assert.equal(isProductFirstStoryboardRecipe("brand-warp"), false);
  });

  it("cinematic-assemble injects build arc with category adapt", () => {
    const joined = storyboardRecipePlannerLines(
      "cinematic-assemble",
      false,
      "6",
    ).join("\n");
    assert.match(joined, /CINEMATIC ASSEMBLE/i);
    assert.match(joined, /EXACTLY 6 scenes/i);
    assert.match(joined, /pizza|Food/i);
    assert.match(joined, /earbuds|electronics/i);
    assert.match(joined, /Cars|vehicles/i);
    assert.match(joined, /IMAGE 1/);
  });

  it("studio-type injects monochrome 3D type arc", () => {
    const joined = storyboardRecipePlannerLines("studio-type", true, "6").join(
      "\n",
    );
    assert.match(joined, /STUDIO TYPE/i);
    assert.match(joined, /3D typography|TYPE CARD/i);
    assert.match(joined, /monochrome|grey studio/i);
  });

  it("brand-warp injects warp → logo endcard arc", () => {
    const joined = storyboardRecipePlannerLines("brand-warp", true, "4").join(
      "\n",
    );
    assert.match(joined, /BRAND WARP/i);
    assert.match(joined, /EXACTLY 4 scenes/i);
    assert.match(joined, /warp|WARP/i);
    assert.match(joined, /chrome logo|logo endcard/i);
  });

  it("landing recipes lock storyboard ids", () => {
    assert.equal(isLandingRecipeId("product-cinematic-assemble-15s"), true);
    assert.equal(
      LANDING_RECIPES["product-cinematic-assemble-15s"].storyboardRecipeId,
      "cinematic-assemble",
    );
    assert.equal(
      LANDING_RECIPES["product-studio-type-15s"].storyboardRecipeId,
      "studio-type",
    );
    assert.equal(
      LANDING_RECIPES["concept-brand-warp-12s"].storyboardRecipeId,
      "brand-warp",
    );
    assert.equal(
      LANDING_RECIPES["concept-studio-type-15s"].storyboardRecipeId,
      "studio-type",
    );
  });
});
