import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMagazineCoverMorphStillPrompt,
  buildMagazineCoverMorphVideoPrompt,
  clampMagazineCoverMorphDurationSec,
  magazineCoverMorphDurationOptions,
  resolveMagazineCoverMorphDialect,
  resolveMagazineMasthead,
  sanitizeMagazineMasthead,
} from "../lib/magazine-cover-morph";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("magazine-cover-morph", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("magazine-cover-morph"), true);
    assert.equal(videoModeHidesAutoDuration("magazine-cover-morph"), true);
    assert.deepEqual(magazineCoverMorphDurationOptions(), ["6", "8"]);
    assert.equal(clampMagazineCoverMorphDurationSec("auto"), 8);
    assert.equal(clampMagazineCoverMorphDurationSec("6"), 6);
    assert.equal(clampMagazineCoverMorphDurationSec(14), 8);
  });

  it("resolves Red / Pastel / Velvet dialects", () => {
    assert.equal(
      resolveMagazineCoverMorphDialect({ pick: "red-masthead" }),
      "red-masthead",
    );
    assert.equal(
      resolveMagazineCoverMorphDialect({ pick: "pastel-dream" }),
      "pastel-dream",
    );
    assert.equal(
      resolveMagazineCoverMorphDialect({ pick: "dark-velvet" }),
      "dark-velvet",
    );
    assert.equal(
      resolveMagazineCoverMorphDialect({
        pick: "auto",
        headline: "pastel pink dream",
      }),
      "pastel-dream",
    );
    assert.equal(
      resolveMagazineCoverMorphDialect({
        pick: "auto",
        conceptIdea: "velvet leather dark",
      }),
      "dark-velvet",
    );
    assert.equal(
      resolveMagazineCoverMorphDialect({ pick: "auto" }),
      "red-masthead",
    );
  });

  it("sanitizes masthead from headline", () => {
    assert.equal(sanitizeMagazineMasthead("  aura  vis!! "), "AURA VIS");
    assert.equal(sanitizeMagazineMasthead("梦境视觉"), "梦境视觉");
    assert.equal(
      resolveMagazineMasthead({
        headline: "Dream Visual",
        dialect: "pastel-dream",
      }),
      "DREAM VISUAL",
    );
  });

  it("builds still and video prompts that keep cover + face lock", () => {
    const still = buildMagazineCoverMorphStillPrompt({
      dialect: "red-masthead",
      product: "street fashion muse",
      headline: "AURA",
      frame: "start",
      conceptMode: true,
    });
    assert.match(still, /AURA|masthead|BEHIND|Z-ORDER/i);
    assert.match(still, /3:4/);
    assert.match(still, /IMAGE 1|face/i);

    const endEdit = buildMagazineCoverMorphStillPrompt({
      dialect: "pastel-dream",
      product: "street fashion muse",
      headline: "DREAM VISUAL",
      frame: "end",
      editingStartPlate: true,
      conceptMode: true,
    });
    assert.match(endEdit, /START PLATE EDIT|wardrobe|inpaint/i);

    const video = buildMagazineCoverMorphVideoPrompt({
      dialect: "dark-velvet",
      product: "street fashion muse",
      headline: "VELVET MODE",
      durationSec: 8,
      conceptMode: true,
    });
    assert.match(video, /8/);
    assert.match(video, /outfit|masthead|VELVET MODE/i);
    assert.match(video, /same face|identity/i);
  });

  it("has concept + product landing recipes at 8s", () => {
    assert.ok(isLandingRecipeId("product-magazine-cover-morph-8s"));
    assert.ok(isLandingRecipeId("concept-magazine-cover-morph-8s"));
    assert.equal(
      LANDING_RECIPES["product-magazine-cover-morph-8s"].videoCreativeMode,
      "magazine-cover-morph",
    );
    assert.equal(
      LANDING_RECIPES["product-magazine-cover-morph-8s"].duration,
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
        videoCreativeMode: "magazine-cover-morph",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "magazine-cover-morph",
    );
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "magazine-cover-morph":/);
    assert.match(src, /makeMagazineCoverMorphVideo/);
    assert.match(src, /clampMagazineCoverMorphDurationSec/);
    assert.match(src, /magazineCoverDialectPick/);
  });
});
