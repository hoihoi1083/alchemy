import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCampaignPlanPromptForTest } from "../lib/campaign-plan";
import {
  buildCampaignSlideImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { resolveReferenceStrategy } from "../lib/reference-strategy";

describe("campaign style-only reference prompts", () => {
  it("campaign + style ref only → style-only strategy", () => {
    const s = resolveReferenceStrategy({
      promotionMode: "concept",
      imageOutputMode: "campaign",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: true,
    });
    assert.equal(s.kind, "style-only");
    assert.equal(s.referenceImageMode, "style-only");
    assert.equal(s.sendPixelsToFal, true);
  });

  it("buildCampaignSlideImagePrompt includes style-only block when referenceImageMode is style-only", () => {
    const vars = buildPromptVariables({
      product: "手串",
      business: "泰享珠寶",
      headline: "手串佩戴有講究",
      subline: "戴對才能顯品味",
      offer: "",
      market: "hk",
      framing: "auto",
      extra: "USER REFERENCE (match content + style): cream background, symmetrical layout",
      artStyle: "realistic",
    });
    const mode = resolveImagePromptMode("product", "promo-ai", {
      promotionMode: "physical",
      workflowMode: "image-only",
    });
    const prompt = buildCampaignSlideImagePrompt(
      vars,
      {
        role: "hero",
        title: "主打",
        headline: "手串佩戴有講究",
        subline: "",
        composition: "Hero — symmetrical infographic layout",
      },
      { theme: "手串文化", visualDna: "cream bg, black/red type" },
      mode,
      null,
      0,
      3,
      false,
      { referenceImageMode: "style-only" },
    );
    assert.match(prompt, /STYLE-ONLY REFERENCE|Match IMAGE 1 palette/i);
    assert.match(prompt, /手串佩戴有講究/);
    assert.match(prompt, /Layout:/);
    assert.match(prompt, /designed social-card structure/i);
    assert.doesNotMatch(prompt, /Layout note \(secondary to IMAGE 1\)/);
  });

  it("campaign slide prompt injects research carousel frame refs", () => {
    const vars = buildPromptVariables({
      product: "維他命 C 精華",
      business: "",
      headline: "3 個月真實變化",
      subline: "半臉實驗",
      offer: "",
      market: "hk",
      framing: "auto",
      artStyle: "realistic",
    });
    const mode = resolveImagePromptMode("product", "promo-ai", {
      promotionMode: "physical",
      workflowMode: "image-only",
    });
    const prompt = buildCampaignSlideImagePrompt(
      vars,
      {
        role: "selling-points",
        title: "賣點",
        headline: "半臉實驗數據",
        subline: "細紋下降",
        composition: "Edu tip card with product",
      },
      { theme: "維C", visualDna: "clean clinical skincare" },
      mode,
      null,
      1,
      3,
      true,
      {
        referenceImageMode: "style-only",
        hasProductPhoto: true,
        productName: "維他命 C 精華",
        carouselSlideRef: {
          index: 2,
          sceneSummary: "Scientific tip card",
          layoutStyle: "title top, proof chips, product bottom",
          colorPalette: "white orange",
          typographyStyle: "bold sans headline",
          mood: "bright clinical",
          composition: "Scientific tip card",
          stagingPose: "product lower third",
        },
      },
    );
    assert.match(prompt, /Reference frame 2 layout/i);
    assert.match(prompt, /Scientific tip card|title top/i);
    assert.match(prompt, /Typography: bold sans headline/i);
  });

  it("campaign planner research path asks for designed layouts and carousel vision", () => {
    const prompt = buildCampaignPlanPromptForTest({
      visualStyleId: "product",
      campaignTheme: "",
      product: "維他命 C 精華",
      business: "",
      headline: "3 個月真實變化",
      subline: "半臉實驗",
      offer: "留言獲取連結",
      hasProductPhoto: true,
      hasStyleReference: true,
      referenceStrategyKind: "style-only",
      promptExtra:
        "Style reference (Instagram): clean clinical. Match visual style / layout energy only — promote user product. Do NOT copy reference subject matter.",
      carouselSlides: [
        {
          index: 1,
          sceneSummary: "Hero cover",
          layoutStyle: "hero cover",
          colorPalette: "white purple",
          typographyStyle: "bold sans",
          mood: "fresh",
          composition: "Centered product with big hook",
          stagingPose: "centered bottle",
        },
        {
          index: 2,
          sceneSummary: "Edu tip",
          layoutStyle: "edu tip",
          colorPalette: "white orange",
          typographyStyle: "editorial",
          mood: "clinical",
          composition: "Title + body + product",
          stagingPose: "product lower third",
        },
      ],
    });
    assert.match(prompt, /designed social-card|edu\/info card|edu selling-points/i);
    assert.match(prompt, /Reference carousel vision|map campaign slide N/i);
    assert.match(prompt, /Centered product with big hook|Title \+ body/i);
  });

  it("campaign planner treats typed name as claim when product photo is present", () => {
    const prompt = buildCampaignPlanPromptForTest({
      visualStyleId: "product",
      campaignTheme: "",
      product: "便攜電源",
      business: "",
      headline: "一電在手",
      subline: "",
      offer: "",
      hasProductPhoto: true,
      hasReferenceLayout: true,
    });
    assert.match(prompt, /claim \/ copy only/i);
    assert.match(prompt, /IMAGE 1 pixels/);
    assert.match(prompt, /power bank or charging station/i);
    assert.doesNotMatch(prompt, /^Product: 便攜電源$/m);
  });

  it("model-wear campaign slides use lifestyle model prompt, not promo product catalog", () => {
    const vars = buildPromptVariables({
      product: "金砂石手鏈",
      business: "",
      headline: "璀璨時刻，由你演繹",
      subline: "捕捉每一刻的閃耀",
      offer: "",
      market: "hk",
      framing: "auto",
      artStyle: "realistic",
    });
    const mode = resolveImagePromptMode("model-wear", "promo-ai", {
      promotionMode: "physical",
      workflowMode: "image-only",
    });
    assert.equal(mode, "model-wear");
    const prompt = buildCampaignSlideImagePrompt(
      vars,
      {
        role: "selling-points",
        title: "Selling points",
        headline: "天然金砂石 · 手工打磨",
        subline: "時尚百搭",
        composition: "Feature lifestyle — wrist detail",
      },
      { theme: "金砂石手鏈", visualDna: "warm lifestyle jewelry" },
      mode,
      null,
      1,
      3,
      true,
      { visualStyleId: "model-wear", hasProductPhoto: true, productName: "金砂石手鏈" },
    );
    assert.match(prompt, /MODEL WEAR|real person/i);
    assert.match(prompt, /SERIES MODEL-WEAR LOCK|wearing or using/i);
    assert.doesNotMatch(prompt, /Do NOT invent a one-off photoreal model-wear/i);
  });

  it("campaign planner requires unique headlines and model-wear compositions", () => {
    const prompt = buildCampaignPlanPromptForTest({
      visualStyleId: "model-wear",
      campaignTheme: "",
      product: "金砂石手鏈",
      business: "",
      headline: "璀璨時刻",
      subline: "天然金砂石",
      offer: "立即選購",
      hasProductPhoto: true,
    });
    assert.match(prompt, /Every slide\.headline MUST be unique/i);
    assert.match(prompt, /MODEL WEAR style/i);
    assert.match(prompt, /real person wearing/i);
  });
});
