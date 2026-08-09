import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  artStyleIdsForPicker,
  getArtStyle,
  isVideoSafeArtStyle,
  VIDEO_SAFE_ART_STYLE_IDS,
} from "../lib/art-style";
import {
  IMAGE_OUTPUT_MODES,
  imageOutputPreviewSrc,
} from "../lib/image-output-mode";
import { IMAGE_TEXT_MODES, imageTextPreviewSrc } from "../lib/image-text-mode";
import { SUBJECT_FRAMINGS, subjectFramingPreviewSrc } from "../lib/prompt-variables";
import {
  isLandingRecipeId,
  landingRecipesForPromotion,
  LANDING_RECIPE_IDS,
  LANDING_RECIPES,
  microContextForLandingRecipe,
  studioRecipeHref,
} from "../lib/landing-recipes";
import { VISUAL_STYLES } from "../lib/visual-styles";
import { resolveMicroSteps, resumeStepIndex } from "../lib/wizard-micro-steps";
import type { WizardMicroStepState } from "../lib/wizard-micro-steps";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { appendArtStyleSeedanceHintIfNeeded } from "../lib/art-style";

describe("landing-recipes", () => {
  it("exposes motion-poster and product-tvc-12s deep-links", () => {
    assert.equal(isLandingRecipeId("motion-poster"), true);
    assert.equal(isLandingRecipeId("product-tvc-12s"), true);
    assert.equal(isLandingRecipeId("concept-motion-poster"), true);
    assert.equal(isLandingRecipeId("concept-tvc-12s"), true);
    assert.equal(isLandingRecipeId("storyboard-video"), false);
    assert.match(studioRecipeHref("motion-poster"), /recipe=motion-poster/);
    assert.match(studioRecipeHref("product-tvc-12s"), /recipe=product-tvc-12s/);
    assert.match(studioRecipeHref("concept-motion-poster"), /mode=concept/);
    assert.match(studioRecipeHref("concept-tvc-12s"), /recipe=concept-tvc-12s/);
  });

  it("maps recipes to finishable wizard settings", () => {
    const poster = LANDING_RECIPES["motion-poster"];
    assert.equal(poster.workflowMode, "video-only");
    assert.equal(poster.videoCreativeMode, "motion-poster");
    assert.equal(poster.duration, "6");
    assert.equal(poster.promotionMode, "physical");

    const tvc = LANDING_RECIPES["product-tvc-12s"];
    assert.equal(tvc.workflowMode, "combined");
    assert.equal(tvc.visualStyleId, "storyboard-video");
    assert.equal(tvc.storyboardSceneCount, "4");
    assert.equal(tvc.duration, "12");

    const conceptPoster = LANDING_RECIPES["concept-motion-poster"];
    assert.equal(conceptPoster.promotionMode, "concept");
    assert.equal(conceptPoster.workflowMode, "combined");
    assert.equal(conceptPoster.videoCreativeMode, "motion-poster");
    assert.equal(conceptPoster.visualStyleId, "service-promo");

    const conceptTvc = LANDING_RECIPES["concept-tvc-12s"];
    assert.equal(conceptTvc.promotionMode, "concept");
    assert.equal(conceptTvc.visualStyleId, "storyboard-video");
    assert.equal(conceptTvc.storyboardSceneCount, "4");
    assert.deepEqual(landingRecipesForPromotion("physical"), [
      "motion-poster",
      "product-tvc-12s",
    ]);
    assert.deepEqual(landingRecipesForPromotion("concept"), [
      "concept-motion-poster",
      "concept-tvc-12s",
    ]);
  });

  it("landing recipes skip output-goal and resume at fused setup", () => {
    const stubState = {
      workflowMode: "video-only",
      promotionMode: "physical",
      visualStyleId: "product",
      imageOutputMode: "single",
      imageRefPhoto: null,
      productPhoto: null,
      referenceAd: null,
      referenceIsVideo: false,
      product: "",
      conceptIdea: "",
      headline: "",
      subline: "",
      offer: "",
      business: "",
      creativeVideoBrief: "",
      storyboardBrief: "",
      brandWebsiteUrl: "",
      brandProfile: null,
      cinematicStitchReel: false,
      cinematicSceneCount: 1,
      videoCreativeMode: "motion-poster",
      videoSettingsDuration: "6",
      referenceAnalyzeBusy: false,
      brandAnalyzeBusy: false,
      researchReelAnalyzeBusy: false,
      researchReelDownloadBusy: false,
      referenceClipLoading: false,
      imageBusy: false,
      videoBusy: false,
      imageUrl: null,
      videoUrl: null,
      promptExtra: "",
      contentResearchApplied: false,
      shipItEligible: false,
      hasGeneratedImage: false,
      storyboardGridApproved: false,
      userReferenceBrief: null,
      referenceAnalyzeNote: null,
      planProductVideoBusy: false,
      planVideoPromptBusy: false,
    } satisfies WizardMicroStepState;

    const posterCtx = microContextForLandingRecipe("motion-poster");
    assert.equal(posterCtx.videoSubpath, "motion_poster");
    const posterSteps = resolveMicroSteps(posterCtx, stubState);
    assert.equal(posterSteps[resumeStepIndex(posterSteps)]?.id, "setup.pre_video");

    const tvcCtx = microContextForLandingRecipe("product-tvc-12s");
    assert.equal(tvcCtx.combinedStyle, "storyboard");
    const tvcSteps = resolveMicroSteps(tvcCtx, {
      ...stubState,
      workflowMode: "combined",
      visualStyleId: "storyboard-video",
      videoCreativeMode: "image-to-video",
    });
    assert.equal(tvcSteps[resumeStepIndex(tvcSteps)]?.id, "setup.pre_generate");

    const conceptPosterCtx = microContextForLandingRecipe("concept-motion-poster", "concept");
    assert.equal(conceptPosterCtx.promotionMode, "concept");
    assert.equal(conceptPosterCtx.workflowMode, "combined");
    assert.equal(conceptPosterCtx.videoSubpath, "motion_poster");
    const conceptPosterSteps = resolveMicroSteps(conceptPosterCtx, {
      ...stubState,
      promotionMode: "concept",
      workflowMode: "combined",
      visualStyleId: "service-promo",
      videoCreativeMode: "motion-poster",
    });
    const conceptPosterIds = conceptPosterSteps.map((s) => s.id);
    assert.ok(conceptPosterIds.includes("setup.pre_generate"));
    assert.ok(conceptPosterIds.includes("wait.image_generate"));
    assert.ok(!conceptPosterIds.includes("wait.storyboard_generate"));
    assert.equal(
      conceptPosterSteps[resumeStepIndex(conceptPosterSteps)]?.id,
      "setup.pre_generate",
    );

    const conceptTvcCtx = microContextForLandingRecipe("concept-tvc-12s", "concept");
    assert.equal(conceptTvcCtx.combinedStyle, "storyboard");
    const conceptTvcSteps = resolveMicroSteps(conceptTvcCtx, {
      ...stubState,
      promotionMode: "concept",
      workflowMode: "combined",
      visualStyleId: "storyboard-video",
      videoCreativeMode: "image-to-video",
    });
    assert.equal(conceptTvcSteps[resumeStepIndex(conceptTvcSteps)]?.id, "setup.pre_generate");
  });
});

describe("resolveVideoGenerationKind motion-poster vs storyboard", () => {
  it("prefers motion-poster even when storyboard output is locked", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: true,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 4,
        cinematicScenesLength: 4,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "motion-poster",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "motion-poster",
    );
  });
});

describe("video-safe art styles", () => {
  it("lists film / CCD / 国风 / cinematic as video-safe", () => {
    for (const id of ["cinematic", "film", "ccd", "guofeng", "realistic"] as const) {
      assert.equal(isVideoSafeArtStyle(id), true);
    }
    assert.equal(isVideoSafeArtStyle("watercolor"), false);
    assert.deepEqual(artStyleIdsForPicker({ videoSafeOnly: true }), VIDEO_SAFE_ART_STYLE_IDS);
  });

  it("applies video-safe grade on @Video1 when user picked film", () => {
    const p =
      "Follow @Video1 shot structure. @Image1 replaces the hero product.";
    const out = appendArtStyleSeedanceHintIfNeeded(p, "film");
    assert.match(out, /film grain|analog grade/i);
  });

  it("still blocks watercolor on @Video1", () => {
    const p =
      "Follow @Video1 shot structure. @Image1 replaces the hero product.";
    assert.equal(appendArtStyleSeedanceHintIfNeeded(p, "watercolor"), p);
  });

  it("film / CCD / 国风 / cinematic use distinct preview thumbs", () => {
    const realistic = getArtStyle("realistic").previewSrc;
    for (const id of ["cinematic", "film", "ccd", "guofeng"] as const) {
      const src = getArtStyle(id).previewSrc;
      assert.notEqual(src, realistic, `${id} should not reuse realistic.png`);
      assert.match(src, new RegExp(`${id}\\.png`));
    }
  });

  it("every visual style has a unique preview thumb", () => {
    const srcs = VISUAL_STYLES.map((s) => s.previewSrc);
    assert.equal(new Set(srcs).size, srcs.length);
    for (const s of VISUAL_STYLES) {
      assert.match(s.previewSrc, new RegExp(`/visual-styles/${s.id}\\.png`));
    }
  });

  it("landing recipes have preview images", () => {
    for (const id of LANDING_RECIPE_IDS) {
      assert.match(LANDING_RECIPES[id].previewSrc, /\/recipes\//);
    }
  });

  it("image output / text / framing pickers have unique thumbs", () => {
    const outputs = IMAGE_OUTPUT_MODES.map(imageOutputPreviewSrc);
    assert.equal(new Set(outputs).size, outputs.length);
    for (const id of IMAGE_OUTPUT_MODES) {
      assert.match(imageOutputPreviewSrc(id), new RegExp(`/image-output/${id}\\.png`));
    }
    const texts = IMAGE_TEXT_MODES.map(imageTextPreviewSrc);
    assert.equal(new Set(texts).size, texts.length);
    for (const id of IMAGE_TEXT_MODES) {
      assert.match(imageTextPreviewSrc(id), new RegExp(`/image-text/${id}\\.png`));
    }
    const framings = SUBJECT_FRAMINGS.map(subjectFramingPreviewSrc);
    assert.equal(new Set(framings).size, framings.length);
    for (const id of SUBJECT_FRAMINGS) {
      assert.match(subjectFramingPreviewSrc(id), new RegExp(`/framing/${id}\\.png`));
    }
  });
});
