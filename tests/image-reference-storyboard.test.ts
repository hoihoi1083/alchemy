import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConceptImageVision } from "../lib/concept-image-vision";
import {
  researchImageAnalysisFromConceptVision,
  pinStoryboardPlanToImageReference,
} from "../lib/image-reference-storyboard";
import {
  buildImageReferenceStoryboardPlanPromptForTest,
  buildStoryboardPlanPromptForTest,
} from "../lib/video-storyboard-plan";
import { storyboardReferenceAdaptedRolesPlannerLines } from "../lib/shot-recipes";
import { CONTENT_RESEARCH_STYLE_PREFIX } from "../lib/content-research-promote";

describe("image-reference-storyboard", () => {
  it("maps concept vision to a single beat analysis", () => {
    const vision: ConceptImageVision = {
      sceneSummary: "XHS lifestyle flat lay",
      topic: "skincare routine",
      subjects: "hands, bottles",
      visibleText: "Morning glow",
      contentType: "lifestyle-photo",
      layoutStyle: "top text band, center hero",
      colorPalette: "warm beige",
      typographyStyle: "soft sans",
      mood: "cozy home",
      motionHints: "slow drift",
      sceneEssay: "A cozy desk with skincare bottles.",
    };
    const analysis = researchImageAnalysisFromConceptVision(vision);
    assert.equal(analysis.source, "single");
    assert.equal(analysis.beats.length, 1);
    assert.match(analysis.visualDirection, /warm beige/i);
  });

  it("pins storyboard prompts to reference beat shells", () => {
    const analysis = researchImageAnalysisFromConceptVision({
      sceneSummary: "Carousel cover",
      topic: "fitness",
      subjects: "trainer",
      visibleText: "",
      contentType: "social-carousel",
      layoutStyle: "bold headline top",
      colorPalette: "neon green",
      typographyStyle: "condensed",
      mood: "energetic",
      motionHints: "punch in",
      sceneEssay: "Gym poster layout.",
    });
    const pinned = pinStoryboardPlanToImageReference(
      {
        title: "t",
        theme: "old",
        visualDirection: "generic",
        lookBible: { palette: "", lighting: "", materials: "", negatives: "" },
        totalDurationSec: 8,
        scenes: [
          {
            imageIndex: 1,
            role: "hook",
            startSec: 0,
            endSec: 2,
            sceneDescriptionZh: "開場",
            onImageCopyZh: "試試",
            imagePrompt: "generic office still",
          },
        ],
        seedancePrompt: "Scene 1",
        productionNotes: "",
      },
      analysis,
      "User gym promo",
    );
    assert.equal(pinned.theme, "User gym promo");
    assert.match(pinned.scenes[0]?.imagePrompt ?? "", /REFERENCE BEAT 1/i);
    assert.match(pinned.visualDirection, /neon green/i);
    assert.match(pinned.lookBible?.palette ?? "", /neon green/i);
    assert.match(pinned.lookBible?.lighting ?? "", /energetic/i);
  });

  it("builds product layout-transfer image reference planner prompt", () => {
    const prompt = buildImageReferenceStoryboardPlanPromptForTest({
      analysis: researchImageAnalysisFromConceptVision({
        sceneSummary: "Product ad cover",
        topic: "power bank",
        subjects: "gadget on desk",
        visibleText: "Charge fast",
        contentType: "product-ad",
        layoutStyle: "center hero + bottom CTA band",
        colorPalette: "black gold",
        typographyStyle: "bold sans",
        mood: "premium",
        motionHints: "orbit",
        sceneEssay: "Premium desk ad.",
      }),
      product: "Acme Power Bank",
      business: "",
      headline: "Charge faster",
      subline: "",
      offer: "",
      promptExtra: `${CONTENT_RESEARCH_STYLE_PREFIX}xhs post)\nUSER REFERENCE: cover layout`,
      durationSec: 8,
      market: "hk",
      layoutTransfer: true,
      conceptLayoutShell: false,
      artStyleId: "realistic",
      conceptMode: false,
      imageTextMode: "textless",
    });
    assert.match(prompt, /LAYOUT TRANSFER/i);
    assert.match(prompt, /Map reference layout beats/i);
    assert.doesNotMatch(prompt, /TVC grammar/i);
  });

  it("builds concept layout-shell image reference planner prompt", () => {
    const prompt = buildImageReferenceStoryboardPlanPromptForTest({
      analysis: researchImageAnalysisFromConceptVision({
        sceneSummary: "XHS meme poster",
        topic: "office humor",
        subjects: "cartoon worker",
        visibleText: "",
        contentType: "poster",
        layoutStyle: "illustrated meme grid",
        colorPalette: "flat pastel",
        typographyStyle: "handwritten",
        mood: "playful",
        motionHints: "bounce",
        sceneEssay: "Cartoon office meme.",
      }),
      product: "Team culture workshop",
      business: "",
      headline: "Better meetings",
      subline: "",
      offer: "",
      promptExtra: `${CONTENT_RESEARCH_STYLE_PREFIX}xhs post)\nUSER REFERENCE: cover layout`,
      durationSec: 8,
      market: "hk",
      layoutTransfer: false,
      conceptLayoutShell: true,
      artStyleId: "realistic",
      conceptMode: true,
      imageTextMode: "textless",
    });
    assert.match(prompt, /CONCEPT LAYOUT SHELL/i);
    assert.match(prompt, /USER topic/i);
  });
});

describe("research-adapted storyboard plan prompt", () => {
  it("skips recipe lines when content research is active", () => {
    const prompt = buildStoryboardPlanPromptForTest({
      product: "Acme",
      business: "",
      headline: "Headline",
      subline: "",
      offer: "",
      storyboardBrief: "",
      durationSec: 8,
      market: "hk",
      framing: "auto",
      styleHint: "",
      promptExtra: `${CONTENT_RESEARCH_STYLE_PREFIX}xhs post)\nUSER REFERENCE: xhs cover`,
      storyboardRecipeId: "premium-punch",
      conceptMode: false,
      referenceStrategyKind: "layout-transfer",
    });
    assert.match(prompt, /LAYOUT TRANSFER|layout-transfer/i);
    assert.doesNotMatch(prompt, /NARRATIVE RECIPE: premium punch/i);
    assert.doesNotMatch(prompt, /TVC grammar/i);
  });

  it("uses reference-adapted role lines helper", () => {
    const lines = storyboardReferenceAdaptedRolesPlannerLines(4).join("\n");
    assert.match(lines, /REFERENCE layout/i);
    assert.doesNotMatch(lines, /establish → macro/i);
  });
});
