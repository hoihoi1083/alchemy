import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTypeBehindCutoutStillPrompt,
  buildTypeBehindCutoutVideoPrompt,
  clampTypeBehindCutoutDurationSec,
  formatTypeBehindOnScreenPreview,
  resolveTypeBehindCutoutDialect,
  resolveTypeBehindWords,
  sanitizeTypeBehindWord,
  typeBehindCutoutDurationOptions,
  typeBehindCutoutMotionStrength,
} from "../lib/type-behind-cutout";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("type-behind-cutout", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("type-behind-cutout"), true);
    assert.equal(videoModeHidesAutoDuration("type-behind-cutout"), true);
    assert.deepEqual(typeBehindCutoutDurationOptions(), ["8", "10"]);
    assert.equal(clampTypeBehindCutoutDurationSec("auto"), 8);
    assert.equal(clampTypeBehindCutoutDurationSec("8"), 8);
    assert.equal(clampTypeBehindCutoutDurationSec(14), 10);
  });

  it("resolves City run / Minimal / Impact dialects", () => {
    assert.equal(
      resolveTypeBehindCutoutDialect({ pick: "city-run" }),
      "city-run",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({ pick: "minimal-run" }),
      "minimal-run",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({ pick: "impact-end" }),
      "impact-end",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({
        pick: "auto",
        headline: "impact punch ending",
      }),
      "impact-end",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({
        pick: "auto",
        conceptIdea: "minimal cream void",
      }),
      "minimal-run",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({
        pick: "auto",
        product: "city street run",
      }),
      "city-run",
    );
    assert.equal(
      resolveTypeBehindCutoutDialect({ pick: "auto" }),
      "city-run",
    );
  });

  it("sanitizes giant-type words", () => {
    assert.equal(sanitizeTypeBehindWord("  move  fast!! "), "MOVE FAST");
    assert.equal(sanitizeTypeBehindWord("城市奔跑"), "城市奔跑");
    assert.equal(sanitizeTypeBehindWord(""), "");
    assert.equal(sanitizeTypeBehindWord("Brighten Your Skin"), "BRIGHTEN Y");
  });

  it("picks short punch words from long headlines", () => {
    const city = resolveTypeBehindWords({
      headline: "Brighten Your Skin with Vitamin C Serum",
      dialect: "city-run",
    });
    assert.equal(city.startWord, "BRIGHTEN");
    assert.equal(city.endWord, "SKIN");
    assert.ok(city.startWord.length <= 10);

    const keep = resolveTypeBehindWords({
      headline: "KEEP MOVING",
      dialect: "city-run",
    });
    assert.equal(keep.startWord, "KEEP");
    assert.equal(keep.endWord, "MOVING");

    const minimal = resolveTypeBehindWords({
      headline: "Brighten Your Skin with Vitamin C Serum",
      dialect: "minimal-run",
    });
    assert.equal(minimal.startWord, "BRIGHTEN");
    assert.equal(minimal.endWord, "BRIGHTEN");

    assert.equal(
      formatTypeBehindOnScreenPreview({
        headline: "Power Anywhere: The Portable Power Station That Keeps You",
        dialect: "city-run",
      }),
      "POWER → ANYWHERE",
    );
  });

  it("builds still and video prompts that keep type behind + identity", () => {
    const still = buildTypeBehindCutoutStillPrompt({
      dialect: "city-run",
      product: "vintage brick phone",
      business: "Social Drip",
      headline: "KEEP MOVING",
      frame: "start",
    });
    assert.match(still, /KEEP|BEHIND|Z-ORDER|cutout/i);
    assert.match(still, /3:4/);
    assert.match(still, /IMAGE 1|identity|power bank stays power bank/i);
    assert.match(still, /behind/i);
    assert.match(still, /presenter|holding|PRODUCT STAGING/i);
    assert.match(still, /MID-JOG|brisk street run|jog/i);
    assert.match(still, /TYPE READABILITY|55%|readable|ONE horizontal/i);
    assert.match(still, /night street|wet asphalt/i);
    assert.match(still, /Do NOT float a lone packshot|FORBIDDEN:.*living-room|tabletop/i);

    const concept = buildTypeBehindCutoutStillPrompt({
      dialect: "city-run",
      product: "street model",
      headline: "OFF SCRIPT",
      frame: "start",
      conceptMode: true,
    });
    assert.match(concept, /CONCEPT STAGING|person|figure/i);
    assert.match(concept, /jog|run/i);
    assert.doesNotMatch(concept, /PRODUCT STAGING/);

    const impact = buildTypeBehindCutoutStillPrompt({
      dialect: "impact-end",
      product: "vintage brick phone",
      headline: "BRIGHTEN",
      frame: "end",
    });
    assert.match(impact, /END CUT|IMPACT|night street|wet asphalt/i);
    assert.match(impact, /FORBIDDEN: living-room tabletop/i);
    assert.doesNotMatch(
      impact,
      /Rooftop \/ city skyline dusk plate OR deep charcoal/i,
    );

    const endEdit = buildTypeBehindCutoutStillPrompt({
      dialect: "city-run",
      product: "portable power bank",
      headline: "KEEP MOVING",
      frame: "end",
      editingStartPlate: true,
    });
    assert.match(endEdit, /START PLATE EDIT|inpaint|ground truth/i);
    assert.match(endEdit, /RUN|mid-stride|jogging/i);

    const cityVideo = buildTypeBehindCutoutVideoPrompt({
      dialect: "city-run",
      product: "vintage brick phone",
      headline: "KEEP MOVING",
      durationSec: 8,
      promptExtra: "Show a close-up of the serum bottle then apply to skin",
    });
    assert.match(cityVideo, /CITY RUN|jog|run toward camera|locomotion/i);
    assert.match(cityVideo, /Dialect wins|ignore demo/i);
    assert.doesNotMatch(cityVideo, /MINIMAL delta/);
    assert.equal(typeBehindCutoutMotionStrength("city-run"), 78);
    assert.equal(typeBehindCutoutMotionStrength("minimal-run"), 52);

    const video = buildTypeBehindCutoutVideoPrompt({
      dialect: "minimal-run",
      product: "portable power bank",
      business: "Social Drip",
      headline: "CLEAN",
      durationSec: 8,
    });
    assert.match(video, /8/);
    assert.match(video, /Minimal|BEHIND|behind/i);
    assert.match(video, /same person|identity|SKU|presenter/i);
    assert.match(video, /readable|cover the word/i);
  });

  it("has concept + product landing recipes at 8s", () => {
    assert.ok(isLandingRecipeId("product-type-behind-cutout-8s"));
    assert.ok(isLandingRecipeId("concept-type-behind-cutout-8s"));
    assert.equal(
      LANDING_RECIPES["product-type-behind-cutout-8s"].videoCreativeMode,
      "type-behind-cutout",
    );
    assert.equal(
      LANDING_RECIPES["product-type-behind-cutout-8s"].duration,
      "8",
    );
  });

  it("resolves generation kind and wires wizard", () => {
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
        videoCreativeMode: "type-behind-cutout",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "type-behind-cutout",
    );
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "type-behind-cutout":/);
    assert.match(src, /makeTypeBehindCutoutVideo/);
    assert.match(src, /clampTypeBehindCutoutDurationSec/);
    assert.match(src, /typeBehindDialectPick/);
  });
});
