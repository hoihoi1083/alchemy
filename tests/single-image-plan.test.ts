import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fallbackSingleImagePlan,
  shouldPlanSingleImageAd,
} from "@/lib/single-image-plan";
import { buildPromoImagePrompt, buildWizardImagePrompt } from "@/lib/prompt-variables";

describe("single image planner quality path", () => {
  it("plans designed poster modes only", () => {
    assert.equal(shouldPlanSingleImageAd("promo-ai"), true);
    assert.equal(shouldPlanSingleImageAd("concept-social"), true);
    assert.equal(shouldPlanSingleImageAd("info-poster"), true);
    assert.equal(shouldPlanSingleImageAd("reference-concept"), true);
    assert.equal(shouldPlanSingleImageAd("model-wear"), false);
    assert.equal(shouldPlanSingleImageAd("concept-cinematic"), true);
    assert.equal(shouldPlanSingleImageAd("promo-ai", "textless"), false);
    assert.equal(shouldPlanSingleImageAd("ugc-presenter"), false);
  });

  it("fallback plan injects visualDna and role into promo prompt", () => {
    const plan = fallbackSingleImagePlan({
      visualStyleId: "product",
      promotionMode: "physical",
      product: "Coffee beans",
      headline: "新鲜烘焙",
      subline: "每天一杯好咖啡",
      offer: "立刻下单",
      hasProductPhoto: true,
      promptMarket: "cn",
    });
    assert.ok(plan.visualDna.length > 10);
    assert.ok(plan.composition.length > 10);
    assert.equal(plan.role, "cta");

    const prompt = buildPromoImagePrompt(
      {
        product: "Coffee beans",
        market: "cn",
        framing: "auto",
        headline: "新鲜烘焙",
        subline: "每天一杯好咖啡",
        offer: "立刻下单",
      },
      null,
      null,
      plan,
    );
    assert.match(prompt, /visual DNA/i);
    assert.match(prompt, /Layout:/);
    assert.match(prompt, /Avoid:/);
    assert.match(prompt, /ANTI-CATALOG|seamless white|Canva|powerpoint|infographic/i);
    assert.match(prompt, /redesign the SETTING|Do NOT keep a blank seamless/i);
  });

  it("wizard builder passes plan into concept-social", () => {
    const plan = fallbackSingleImagePlan({
      visualStyleId: "service-promo",
      promotionMode: "concept",
      headline: "周末夜观赛",
      promptMarket: "hk",
    });
    const prompt = buildWizardImagePrompt(
      {
        product: "观赛派对",
        market: "hk",
        framing: "auto",
        headline: "周末夜观赛",
      },
      "concept-social",
      null,
      "service-promo",
      null,
      { singleImagePlan: plan },
    );
    assert.match(prompt, /SINGLE SOCIAL AD/);
    assert.match(prompt, /visual DNA/i);
  });
});
