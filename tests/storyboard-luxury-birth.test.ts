import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coerceLuxuryBirthSceneCount,
  effectiveStoryboardSceneCount,
  storyboardRecipeForbidsReference,
  storyboardRecipePlannerLines,
} from "../lib/storyboard-recipes";
import { buildStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";

describe("storyboard luxury-birth recipe", () => {
  it("defaults luxury to 5 scenes when UI is auto", () => {
    assert.equal(effectiveStoryboardSceneCount("luxury-birth", "auto"), "5");
    assert.equal(effectiveStoryboardSceneCount("luxury-birth", "3"), "3");
    assert.equal(effectiveStoryboardSceneCount("luxury-birth", "4"), "5");
    assert.equal(coerceLuxuryBirthSceneCount("auto"), "5");
    assert.equal(storyboardRecipeForbidsReference("luxury-birth"), true);
    assert.equal(storyboardRecipeForbidsReference("classic-tvc"), false);
  });

  it("injects 3-beat product arc into planner prompt", () => {
    const lines = storyboardRecipePlannerLines("luxury-birth", false, "3");
    assert.match(lines.join("\n"), /luxury 3-beat PRODUCT BIRTH/i);
    assert.match(lines.join("\n"), /EXACTLY 3 scenes/i);

    const prompt = buildStoryboardPlanPromptForTest({
      product: "lipstick",
      business: "",
      headline: "Ruby awaken",
      subline: "",
      offer: "",
      storyboardBrief: "red crystal void → ruby heart",
      durationSec: 12,
      sceneCountTarget: "3",
      market: "hk",
      framing: "auto",
      styleHint: "",
      artStyleId: "realistic",
      storyboardRecipeId: "luxury-birth",
    });
    assert.match(prompt, /EXACTLY 3 scenes/);
    assert.match(prompt, /User story request: red crystal void/);
    assert.match(prompt, /FORBIDDEN: Social drip/i);
  });

  it("injects 5-beat product arc when scene count is 5", () => {
    const lines = storyboardRecipePlannerLines("luxury-birth", false, "5");
    assert.match(lines.join("\n"), /luxury 5-beat PRODUCT BIRTH/i);
    assert.match(lines.join("\n"), /EXACTLY 5 scenes/i);

    const prompt = buildStoryboardPlanPromptForTest({
      product: "lipstick",
      business: "",
      headline: "Ruby awaken",
      subline: "",
      offer: "",
      storyboardBrief: "",
      durationSec: 15,
      sceneCountTarget: "5",
      market: "hk",
      framing: "auto",
      styleHint: "",
      artStyleId: "realistic",
      storyboardRecipeId: "luxury-birth",
    });
    assert.match(prompt, /EXACTLY 5 scenes/);
    assert.match(prompt, /Scene 5 \(payoff\)/i);
  });
});
