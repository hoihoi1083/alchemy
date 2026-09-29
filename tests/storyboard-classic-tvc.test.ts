import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storyboardRecipePlannerLines } from "../lib/storyboard-recipes";
import { buildStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";
import { buildStoryboardSceneImagePrompt } from "../lib/prompt-variables";
import type { VideoStoryboardPlan } from "../lib/video-storyboard-types";

describe("storyboard classic-tvc recipe identity lock", () => {
  it("injects IMAGE 1 SKU lock into planner lines (not empty like before)", () => {
    const joined = storyboardRecipePlannerLines("classic-tvc", false, "4").join(
      "\n",
    );
    assert.match(joined, /CLASSIC TVC/i);
    assert.match(joined, /IMAGE 1 pixels ARE the only product identity/i);
    assert.match(joined, /NEVER invent a different SKU/i);
    assert.match(joined, /dropper|serum/i);
    assert.match(joined, /EXACTLY 4 scenes/i);
  });

  it("lands identity rules in the full plan prompt", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      product: "Vitamin C serum",
      business: "",
      headline: "Brighten Your Skin in 4 Weeks",
      subline: "",
      offer: "",
      storyboardBrief: "",
      durationSec: 8,
      sceneCountTarget: "4",
      market: "hk",
      framing: "auto",
      styleHint: "",
      artStyleId: "realistic",
      storyboardRecipeId: "classic-tvc",
    });
    assert.match(prompt, /CLASSIC TVC/i);
    assert.match(prompt, /IMAGE 1 pixels ARE the only product identity/i);
    assert.match(prompt, /claim labels only/i);
  });

  it("stills prompt forbids companion SKUs not in IMAGE 1", () => {
    const plan: VideoStoryboardPlan = {
      title: "t",
      theme: "Vitamin C serum",
      visualDirection: "",
      totalDurationSec: 8,
      scenes: [
        {
          imageIndex: 1,
          role: "macro",
          startSec: 0,
          endSec: 2,
          sceneDescriptionZh: "macro",
          imagePrompt: "dropper releasing a drop of serum",
        },
      ],
      seedancePrompt: "motion",
      productionNotes: "",
    };
    const prompt = buildStoryboardSceneImagePrompt(plan.scenes[0]!, plan, {
      product: "Vitamin C serum",
      market: "hk",
      framing: "auto",
      artStyle: "realistic",
    }, { hasProductImage: true });
    assert.match(prompt, /SINGLE SKU LOCK/i);
    assert.match(prompt, /PIXEL LOCK/i);
    assert.match(prompt, /IMAGE 1/);
  });
});
