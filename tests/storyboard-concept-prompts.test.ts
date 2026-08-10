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

  it("softenStoryboardStillPromptForModeration rewrites face close-ups", () => {
    const out = softenStoryboardStillPromptForModeration(
      "Close-up of calm face with steam rising; Hands applying gentle massage on temples",
    );
    assert.ok(!/Close-up of calm face with steam rising/i.test(out));
    assert.ok(/mid-shot|steam bowl|towel|spa/i.test(out));
  });

  it("soften keeps people for spa facial mid-shot (not empty room)", () => {
    const out = softenStoryboardStillPromptForModeration(
      "A serene spa room with a client lying on a treatment bed with a facial mask, an esthetician applying a serum",
    );
    assert.ok(/therapist|guest|mid-shot/i.test(out));
    assert.ok(!/empty treatment bed with neat white linens/i.test(out));
  });
});
