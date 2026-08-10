import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { USER_REFERENCE_LAYOUT_TRANSFER_MARKER } from "../lib/user-reference-brief";
import {
  buildReelStoryboardPlanPromptForTest,
  buildStoryboardPlanPromptForTest,
  parseVideoStoryboardPlan,
} from "../lib/video-storyboard-plan";

describe("parseVideoStoryboardPlan scene/prompt sync", () => {
  it("pads missing Scene N lines when scene_count forces more scenes", () => {
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
            onImageCopyZh: "试试 Alchemy AI Lab",
            imagePrompt: "end card still",
          },
        ],
        seedancePrompt:
          "Scene 1 [0-2s]: hook — slow push-in. Scene 2 [2-4s]: demo — handheld drift. Scene 3 [4-6s]: edit — orbit. Scene 4 [6-8s]: cta — bold push-in.",
        productionNotes: "",
      },
      8,
      "6",
    );
    assert.equal(plan.scenes.length, 6);
    assert.match(plan.seedancePrompt, /Scene\s*5/i);
    assert.match(plan.seedancePrompt, /Scene\s*6/i);
    assert.match(plan.seedancePrompt, /textless|captions/i);
  });

  it("trims to exactly 2 scenes when user selects 2", () => {
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
            imagePrompt: "hook still",
          },
          {
            imageIndex: 2,
            role: "demo",
            startSec: 2,
            endSec: 4,
            sceneDescriptionZh: "上传",
            onImageCopyZh: "上传产品图",
            imagePrompt: "demo still",
          },
          {
            imageIndex: 3,
            role: "edit",
            startSec: 4,
            endSec: 6,
            sceneDescriptionZh: "编辑",
            onImageCopyZh: "自动生成可编辑 Prompt",
            imagePrompt: "edit still",
          },
          {
            imageIndex: 4,
            role: "cta",
            startSec: 6,
            endSec: 8,
            sceneDescriptionZh: "结尾",
            onImageCopyZh: "试试 Alchemy AI Lab",
            imagePrompt: "cta still",
          },
          {
            imageIndex: 5,
            role: "extra",
            startSec: 8,
            endSec: 10,
            sceneDescriptionZh: "多余",
            onImageCopyZh: "马上试",
            imagePrompt: "extra still",
          },
        ],
        seedancePrompt:
          "Scene 1 [0-2s]: hook. Scene 2 [2-4s]: demo. Scene 3 [4-6s]: edit. Scene 4 [6-8s]: cta. Scene 5 [8-10s]: extra.",
        productionNotes: "",
      },
      8,
      "2",
    );
    assert.equal(plan.scenes.length, 2);
    assert.equal(plan.scenes[0]?.imageIndex, 1);
    assert.equal(plan.scenes[1]?.imageIndex, 2);
    assert.equal(plan.scenes[1]?.endSec, 8);
  });
});

describe("video-storyboard-plan reel analysis", () => {
  it("reel storyboard prompt maps reference shots and teaches Kling-first", () => {
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
    assert.match(prompt, /Kling/i);
    assert.doesNotMatch(prompt, /@ImageK/i);
  });
});

describe("video-storyboard-plan on-image type", () => {
  it("textless planner forbids type in imagePrompt", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      product: "serum",
      business: "",
      headline: "Glow",
      subline: "",
      offer: "",
      storyboardBrief: "",
      durationSec: 8,
      market: "hk",
      framing: "auto",
      styleHint: "",
      imageTextMode: "textless",
    });
    assert.match(prompt, /NEVER describe on-image text/i);
    assert.doesNotMatch(prompt, /MUST render exact readable on-image/i);
  });

  it("integrated planner requires on-image copy in stills", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      product: "serum",
      business: "",
      headline: "Glow",
      subline: "",
      offer: "",
      storyboardBrief: "",
      durationSec: 8,
      market: "hk",
      framing: "auto",
      styleHint: "",
      imageTextMode: "integrated",
    });
    assert.match(prompt, /MUST render exact readable on-image/i);
    assert.doesNotMatch(prompt, /NEVER describe on-image text/i);
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

  it("generic storyboard keeps category adaptation and Kling-first motion grammar", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      ...base,
      referenceStrategyKind: "none",
    });
    assert.match(prompt, /PRODUCT ADAPTATION \(critical\)/i);
    assert.match(prompt, /Never guess SKU from the product NAME/i);
    assert.match(prompt, /IMAGE 1/i);
    assert.doesNotMatch(prompt, /current guess:/i);
    assert.match(prompt, /Kling/i);
    assert.doesNotMatch(prompt, /LAYOUT TRANSFER/i);
    assert.doesNotMatch(prompt, /for Seedance API/i);
  });
});
