import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPromoImagePrompt,
  buildStoryboardSceneImagePrompt,
  buildWizardImagePrompt,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { softenStoryboardStillPromptForModeration } from "../lib/seedance-moderation";
import type { VideoStoryboardPlan } from "../lib/video-storyboard-types";
import { buildStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";

const baseVars = {
  product: "60-minute facial spa",
  headline: "A 60-minute facial spa experience",
  subline: "Serene spa setting",
  offer: "Book today",
  market: "en" as const,
  framing: "auto" as const,
  extra: "steam rising around face; massage on temples",
};

const plan: VideoStoryboardPlan = {
  title: "Spa reel",
  theme: "facial spa",
  visualDirection: "warm spa photoreal",
  totalDurationSec: 8,
  scenes: [
    {
      imageIndex: 1,
      role: "hook",
      startSec: 0,
      endSec: 2,
      sceneDescriptionZh: "spa hook",
      onImageCopyZh: "Relax",
      imagePrompt: "Close-up of calm face with steam rising",
    },
  ],
  seedancePrompt: "Scene 1 [0-2s]: hard cut — @Image1 spa mood",
  productionNotes: "",
};

describe("concept vs product storyboard prompts", () => {
  it("resolveImagePromptMode uses cinematic for concept storyboard (not promo-ai)", () => {
    assert.equal(
      resolveImagePromptMode("storyboard-video", "promo-ai", {
        promotionMode: "concept",
        workflowMode: "combined",
      }),
      "concept-cinematic",
    );
    assert.equal(
      resolveImagePromptMode("storyboard-video", "promo-ai", {
        promotionMode: "physical",
        workflowMode: "combined",
      }),
      "promo-ai",
    );
  });

  it("concept image 創作方向 maps to distinct layout modes (not one concept-social)", () => {
    const ctx = {
      promotionMode: "concept" as const,
      workflowMode: "image-only" as const,
    };
    assert.equal(resolveImagePromptMode("info-poster", "promo-ai", ctx), "info-poster");
    assert.equal(resolveImagePromptMode("brand-fit", "promo-ai", ctx), "brand-fit");
    assert.equal(resolveImagePromptMode("pricing-offer", "promo-ai", ctx), "pricing-offer");
    assert.equal(resolveImagePromptMode("website-launch", "promo-ai", ctx), "website-launch");

    const info = buildWizardImagePrompt(baseVars, "info-poster", null, "info-poster");
    assert.match(info, /INFO POSTER/i);
    const pricing = buildWizardImagePrompt(baseVars, "pricing-offer", null, "pricing-offer");
    assert.match(pricing, /pricing|limited-offer|CTA/i);
    const website = buildWizardImagePrompt(baseVars, "website-launch", null, "website-launch");
    assert.match(website, /LAUNCH|website or app/i);
  });

  it("concept cinematic / no-reference promo never demands IMAGE 1", () => {
    const cinematic = buildWizardImagePrompt(
      baseVars,
      "concept-cinematic",
      null,
      "storyboard-video",
    );
    assert.ok(!/IMAGE 1 IS MANDATORY/i.test(cinematic));

    const promoNoRef = buildPromoImagePrompt(baseVars, null, null, null, {
      hasReferenceImage: false,
    });
    assert.ok(!/IMAGE 1 IS MANDATORY|IMAGE 1 PIXELS ARE THE PRODUCT/i.test(promoNoRef));
    assert.ok(/Text-to-image/i.test(promoNoRef));
  });

  it("concept-social style-only borrows layout grammar, not product lock or cinematic collage default", () => {
    const prompt = buildWizardImagePrompt(
      {
        ...baseVars,
        product: "閃電貸款",
        headline: "閃電批核，告別等待",
        subline: "簡化流程，即時周轉",
        offer: "立即申請",
      },
      "concept-social",
      null,
      "concept-social",
      null,
      {
        hasReferenceImage: true,
        referenceImageMode: "style-only",
      },
    );
    assert.match(prompt, /STYLE-ONLY REFERENCE/i);
    assert.match(prompt, /design grammar|callout|info density|layout family/i);
    assert.match(prompt, /Do NOT invent a generic cinematic collage/i);
    assert.doesNotMatch(prompt, /IMAGE 1 PIXELS ARE THE PRODUCT/i);
    assert.doesNotMatch(prompt, /white infographic template, edu-carousel flyer/i);
  });

  it("concept text-only storyboard stills skip IMAGE 1 mandatory", () => {
    const prompt = buildStoryboardSceneImagePrompt(plan.scenes[0]!, plan, baseVars, {
      conceptTextOnly: true,
      textless: true,
      hasProductImage: false,
    });
    assert.ok(!/IMAGE 1 IS MANDATORY|IMAGE 1 PIXELS ARE THE PRODUCT/i.test(prompt));
    assert.ok(/mid-shot|Service still safety/i.test(prompt));
    assert.ok(!/Close-up of calm face with steam rising/i.test(prompt));
  });

  it("integrated storyboard stills include ON-IMAGE COPY", () => {
    const prompt = buildStoryboardSceneImagePrompt(plan.scenes[0]!, plan, baseVars, {
      conceptTextOnly: true,
      textless: false,
      hasProductImage: false,
    });
    assert.match(prompt, /ON-IMAGE COPY/);
    assert.match(prompt, /Relax/);
    assert.doesNotMatch(prompt, /TEXTLESS STILL/);
  });

  it("product storyboard stills keep IMAGE 1 when product photo exists", () => {
    const prompt = buildStoryboardSceneImagePrompt(plan.scenes[0]!, plan, baseVars, {
      conceptTextOnly: false,
      textless: true,
      hasProductImage: true,
    });
    assert.ok(/IMAGE 1 (IS MANDATORY|PIXELS ARE THE PRODUCT)/i.test(prompt));
    assert.match(prompt, /CLAIM|PIXEL LOCK/i);
  });

  it("layout-transfer storyboard uses IMAGE 2 as layout shell, IMAGE 1 as product", () => {
    const prompt = buildStoryboardSceneImagePrompt(plan.scenes[0]!, plan, baseVars, {
      referenceConcept: true,
      textless: true,
      hasProductImage: true,
    });
    assert.match(prompt, /layout shell as IMAGE 2/i);
    assert.match(prompt, /IMAGE 1 = product hero/i);
    assert.doesNotMatch(prompt, /layout shell as IMAGE 1/i);
  });

  it("style-only single promo does not use product IMAGE 1 pixel lock", () => {
    const prompt = buildWizardImagePrompt(
      {
        ...baseVars,
        product: "Gold bracelet",
        headline: "New drop",
      },
      "promo-ai",
      null,
      "product",
      null,
      {
        hasReferenceImage: true,
        referenceImageMode: "style-only",
      },
    );
    assert.match(prompt, /STYLE-ONLY REFERENCE/i);
    assert.doesNotMatch(prompt, /IMAGE 1 PIXELS ARE THE PRODUCT/i);
  });

  it("concept planner prompt does not require product photo edit language", () => {
    const text = buildStoryboardPlanPromptForTest({
      product: "facial spa for 60 mins",
      business: "",
      headline: "Spa experience",
      subline: "",
      offer: "",
      storyboardBrief: "close-up face steam",
      durationSec: 8,
      market: "en",
      framing: "auto",
      styleHint: "",
      conceptMode: true,
    });
    assert.ok(/CONCEPT VIDEO STORYBOARD/i.test(text));
    assert.ok(/English only|MUST be in English/i.test(text));
    assert.ok(!/edit from user's product photo/i.test(text));
  });

  it("softenStoryboardStillPromptForModeration rewrites face close-ups without spa for non-spa briefs", () => {
    const out = softenStoryboardStillPromptForModeration(
      "Close-up of calm face with steam rising; Hands applying gentle massage on temples",
      { spaBeautyBrief: false },
    );
    assert.ok(!/Close-up of calm face with steam rising/i.test(out));
    assert.ok(/mid-shot/i.test(out));
    assert.ok(!/spa guest|spa bowl|spa towel/i.test(out));
  });

  it("soften uses spa lexicon only for spa beauty briefs", () => {
    const out = softenStoryboardStillPromptForModeration(
      "Close-up of calm face with steam rising; Hands applying gentle massage on temples",
      { spaBeautyBrief: true },
    );
    assert.ok(/spa guest|spa bowl|spa towel|towel-wrapped/i.test(out));
  });

  it("soften keeps people for spa facial mid-shot (not empty room)", () => {
    const out = softenStoryboardStillPromptForModeration(
      "A serene spa room with a client lying on a treatment bed with a facial mask, an esthetician applying a serum",
    );
    assert.ok(/therapist|guest|mid-shot/i.test(out));
    assert.ok(!/empty treatment bed with neat white linens/i.test(out));
  });
});
