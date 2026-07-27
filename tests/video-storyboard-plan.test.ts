import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { USER_REFERENCE_LAYOUT_TRANSFER_MARKER } from "../lib/user-reference-brief";
import {
  buildReelStoryboardPlanPromptForTest,
  buildStoryboardPlanPromptForTest,
  parseVideoStoryboardPlan,
} from "../lib/video-storyboard-plan";

describe("parseVideoStoryboardPlan scene/prompt sync", () => {
  it("pads missing @ImageN refs when scene_count forces more scenes", () => {
    const plan = parseVideoStoryboardPlan(
      {
        title: "Demo",
        theme: "alchemy",
        visualDirection: "clean",
        totalDurationSec: 8,
        scenes: [
          {
            imageIndex: 1,
            role: "hook",
            startSec: 0,
            endSec: 2,
            sceneDescriptionZh: "开场",
            onImageCopyZh: "不用写 Prompt",
            imagePrompt: "gradient upload icon still",
          },
          {
            imageIndex: 2,
            role: "demo",
            startSec: 2,
            endSec: 4,
            sceneDescriptionZh: "上传",
            onImageCopyZh: "上传产品图",
            imagePrompt: "phone upload still",
          },
          {
            imageIndex: 3,
            role: "edit",
            startSec: 4,
            endSec: 6,
            sceneDescriptionZh: "编辑",
            onImageCopyZh: "自动生成可编辑 Prompt",
            imagePrompt: "laptop edit still",
          },
          {
            imageIndex: 4,
            role: "cta",
            startSec: 6,
            endSec: 8,
            sceneDescriptionZh: "结尾",
            onImageCopyZh: "试试 alchemy.ai",
            imagePrompt: "end card still",
          },
        ],
        seedancePrompt:
          "Scene 1 [0-2s]: hard cut — @Image1 hook. Scene 2 [2-4s]: hard cut — @Image2 demo. Scene 3 [4-6s]: hard cut — @Image3 edit. Scene 4 [6-8s]: hard cut — @Image4 cta.",
        productionNotes: "",
      },
      8,
      "6",
    );
    assert.equal(plan.scenes.length, 6);
    assert.match(plan.seedancePrompt, /@Image5/i);
    assert.match(plan.seedancePrompt, /@Image6/i);
  });
});

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
