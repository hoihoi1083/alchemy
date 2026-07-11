import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { USER_REFERENCE_LAYOUT_TRANSFER_MARKER } from "../lib/user-reference-brief";
import {
  buildReelStoryboardPlanPromptForTest,
  buildStoryboardPlanPromptForTest,
} from "../lib/video-storyboard-plan";

describe("video-storyboard-plan reel analysis", () => {
  it("reel storyboard prompt maps reference shots to scenes", () => {
    const prompt = buildReelStoryboardPlanPromptForTest({
      analysis: {
        durationSec: 180,
        frameCount: 4,
        shots: [
          {
            index: 1,
            timeSec: 2,
            sceneSummary: "Hook close-up",
            layoutStyle: "center hero",
            motionHint: "push in",
            subjects: "bracelet",
            visibleText: "",
          },
        ],
        visualDirection: "warm lifestyle",
        motionSummary: "fast cuts",
        seedancePrompt: "",
        productionNotesZh: "",
      },
      product: "粉水晶手串",
      business: "",
      headline: "粉晶魅力",
      subline: "",
      offer: "",
      promptExtra: "",
      durationSec: 8,
      market: "hk",
      framing: "auto",
      layoutTransfer: false,
      artStyleId: "realistic",
    });
    assert.match(prompt, /REFERENCE REEL structure/i);
    assert.match(prompt, /Hook close-up/i);
    assert.match(prompt, /@ImageK/i);
  });
});

describe("video-storyboard-plan layout transfer", () => {
  const base = {
    product: "馬達加斯加粉水晶手链",
    business: "水晶店",
    headline: "粉晶魅力",
    subline: "天然能量",
    offer: "",
    storyboardBrief: "",
    durationSec: 8,
    market: "hk",
    framing: "auto" as const,
    styleHint: "",
    brandProfile: null,
  };

  it("layout-transfer strategy plans reference shell on every scene", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      ...base,
      referenceStrategyKind: "layout-transfer",
      promptExtra: `${USER_REFERENCE_LAYOUT_TRANSFER_MARKER}: centered hero with text overlays`,
    });
    assert.match(prompt, /LAYOUT TRANSFER/i);
    assert.match(prompt, /SAME ad design grammar/i);
    assert.match(prompt, /Do NOT plan a stock product-photography sequence/i);
    assert.doesNotMatch(prompt, /wearables → wrist\/on-body, macro detail/);
  });

  it("generic storyboard keeps category adaptation template", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      ...base,
      referenceStrategyKind: "none",
    });
    assert.match(prompt, /PRODUCT ADAPTATION \(critical\)/i);
    assert.match(prompt, /wearables → wrist\/on-body/i);
    assert.doesNotMatch(prompt, /LAYOUT TRANSFER/i);
  });
});
