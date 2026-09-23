import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSocialFrameBreakStillPrompt,
  buildSocialFrameBreakVideoPrompt,
  buildSocialFrameBreakReferenceVideoPrompt,
  clampSocialFrameBreakDurationSec,
  formatSocialFrameOnScreenPreview,
  resolveSocialFrameBreakScheme,
  resolveSocialFrameWords,
  sanitizeSocialFrameBrand,
  sanitizeSocialFrameCaption,
  socialFrameBreakDurationOptions,
  socialFrameBreakInputsReady,
  SOCIAL_FRAME_BREAK_MOTION_REF_SRC,
} from "../lib/social-frame-break";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { isIdentityVideoRecipeMode } from "../lib/recipe-path-ux";

describe("social-frame-break", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("social-frame-break"), true);
    assert.equal(videoModeHidesAutoDuration("social-frame-break"), true);
    assert.equal(isIdentityVideoRecipeMode("social-frame-break"), true);
    assert.deepEqual(socialFrameBreakDurationOptions(), ["8", "10"]);
    assert.equal(clampSocialFrameBreakDurationSec("auto"), 10);
    assert.equal(clampSocialFrameBreakDurationSec("8"), 8);
    assert.equal(clampSocialFrameBreakDurationSec(14), 10);
  });

  it("resolves popout-wave scheme", () => {
    assert.equal(
      resolveSocialFrameBreakScheme({ pick: "popout-wave" }),
      "popout-wave",
    );
    assert.equal(resolveSocialFrameBreakScheme({ pick: "auto" }), "popout-wave");
  });

  it("sanitizes brand and caption words", () => {
    assert.equal(sanitizeSocialFrameBrand("  Alchemy AI Lab  "), "Alchemy AI Lab");
    assert.equal(sanitizeSocialFrameCaption(""), "");
    const words = resolveSocialFrameWords({
      business: "Alchemy AI Lab",
      headline: "Create without the wait",
      subline: "Try Ultra",
    });
    assert.equal(words.brand, "Alchemy AI Lab");
    assert.equal(words.caption, "Create without the wait");
    assert.equal(words.subCaption, "Try Ultra");
    assert.equal(
      formatSocialFrameOnScreenPreview({
        business: "Alchemy AI Lab",
        headline: "Create without the wait",
      }),
      "Alchemy AI Lab · Create without the wait",
    );
  });

  it("builds still and video prompts that keep pop-out + identity", () => {
    const still = buildSocialFrameBreakStillPrompt({
      scheme: "popout-wave",
      product: "ninja character",
      business: "Alchemy AI Lab",
      headline: "Create with Alchemy",
      frame: "start",
      hasProductSku: true,
    });
    assert.match(still, /Instagram|CHARACTER|Alchemy AI Lab|Create with Alchemy/i);
    assert.match(still, /16:9|landscape|desktop/i);
    assert.match(still, /PRE-JUMP|INSIDE|inside/i);
    assert.match(still, /FORBIDDEN|disembodied|hands/i);
    assert.match(still, /SKU|HOLDS|hold/i);
    assert.match(still, /Pikachu/i);

    const end = buildSocialFrameBreakStillPrompt({
      scheme: "popout-wave",
      product: "ninja character",
      business: "Alchemy AI Lab",
      headline: "Create with Alchemy",
      frame: "end",
    });
    assert.match(end, /JUMPED|feet|white/i);

    const video = buildSocialFrameBreakVideoPrompt({
      scheme: "popout-wave",
      product: "ninja character",
      business: "Alchemy AI Lab",
      headline: "Create with Alchemy",
      durationSec: 10,
      hasProductSku: true,
    });
    assert.match(video, /JUMP|jump-out|Alchemy AI Lab|same character/i);
    assert.match(video, /HARD LOCK|Pikachu|SKU/i);
    assert.doesNotMatch(video, /MINIMAL delta/);
  });

  it("builds reference-to-video prompt with Image 1 winning over Video 1", () => {
    const r2v = buildSocialFrameBreakReferenceVideoPrompt({
      scheme: "popout-wave",
      product: "ninja character",
      business: "Alchemy AI Lab",
      headline: "Create with Alchemy",
      durationSec: 10,
      hasProductSku: true,
      hasLogo: true,
      plateAsImage1: false,
    });
    assert.match(r2v, /Video 1|POP-OUT|JUMP/i);
    assert.match(r2v, /Image 1|CHARACTER/i);
    assert.match(r2v, /Image 2|PRODUCT SKU|HOLDS/i);
    assert.match(r2v, /AUDIO|native H3/i);
    assert.match(r2v, /INSTRUMENTAL ONLY|no singing|no voice in ANY language/i);
    assert.match(r2v, /Alchemy AI Lab/);
    assert.match(r2v, /Never let Video 1 identity win/i);
    assert.match(SOCIAL_FRAME_BREAK_MOTION_REF_SRC, /popout-motion-ref/);
  });

  it("wizard primary path uses character+motion R2V (cropped ref), still morph fallback", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    const fn = src.slice(
      src.indexOf("async function makeSocialFrameBreakVideo"),
      src.indexOf("async function generateWetGlassRevealKeyframe"),
    );
    assert.match(fn, /buildSocialFrameBreakReferenceVideoPrompt/);
    assert.match(fn, /plateAsImage1:\s*false/);
    assert.match(fn, /SOCIAL_FRAME_BREAK_MOTION_REF_SRC/);
    assert.match(fn, /mode", "reference"/);
    assert.match(fn, /reference_images/);
    assert.match(fn, /buildSocialFrameBreakVideoPrompt/);
  });

  it("gates product vs concept inputs", () => {
    assert.equal(
      socialFrameBreakInputsReady({
        conceptMode: true,
        hasCharacter: true,
        hasProductSku: false,
      }),
      true,
    );
    assert.equal(
      socialFrameBreakInputsReady({
        conceptMode: false,
        hasCharacter: true,
        hasProductSku: false,
      }),
      false,
    );
    assert.equal(
      socialFrameBreakInputsReady({
        conceptMode: false,
        hasCharacter: true,
        hasProductSku: true,
      }),
      true,
    );
  });

  it("has product + concept landing recipes", () => {
    assert.equal(isLandingRecipeId("product-social-frame-break-10s"), true);
    assert.equal(isLandingRecipeId("concept-social-frame-break-10s"), true);
    assert.equal(
      LANDING_RECIPES["product-social-frame-break-10s"].videoCreativeMode,
      "social-frame-break",
    );
    assert.equal(
      LANDING_RECIPES["concept-social-frame-break-10s"].videoCreativeMode,
      "social-frame-break",
    );
  });

  it("maps to video generation kind and wires wizard", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: false,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 0,
        cinematicScenesLength: 0,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "social-frame-break",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "social-frame-break",
    );
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "social-frame-break":/);
    assert.match(src, /makeSocialFrameBreakVideo/);
    assert.match(src, /clampSocialFrameBreakDurationSec/);
    assert.match(src, /socialFrameSchemePick/);
  });
});
