import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildWetGlassRevealStillPrompt,
  buildWetGlassRevealVideoPrompt,
  clampWetGlassRevealDurationSec,
  resolveWetGlassRevealDialect,
  wetGlassRevealDurationOptions,
} from "../lib/wet-glass-reveal";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("wet-glass-reveal", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("wet-glass-reveal"), true);
    assert.equal(videoModeHidesAutoDuration("wet-glass-reveal"), true);
    assert.deepEqual(wetGlassRevealDurationOptions(), ["6", "8"]);
    assert.equal(clampWetGlassRevealDurationSec("auto"), 6);
    assert.equal(clampWetGlassRevealDurationSec("6"), 6);
    assert.equal(clampWetGlassRevealDurationSec(14), 8);
  });

  it("resolves Droplet / Wipe / Mono dialects", () => {
    assert.equal(
      resolveWetGlassRevealDialect({ pick: "droplet-trail" }),
      "droplet-trail",
    );
    assert.equal(
      resolveWetGlassRevealDialect({ pick: "finger-wipe" }),
      "finger-wipe",
    );
    assert.equal(
      resolveWetGlassRevealDialect({ pick: "mono-macro" }),
      "mono-macro",
    );
    assert.equal(
      resolveWetGlassRevealDialect({
        pick: "auto",
        headline: "black and white macro",
      }),
      "mono-macro",
    );
    assert.equal(
      resolveWetGlassRevealDialect({
        pick: "auto",
        conceptIdea: "finger wipe clear streak",
      }),
      "finger-wipe",
    );
    assert.equal(
      resolveWetGlassRevealDialect({
        pick: "auto",
        product: "droplet rain liquid",
      }),
      "droplet-trail",
    );
    assert.equal(
      resolveWetGlassRevealDialect({ pick: "auto" }),
      "droplet-trail",
    );
  });

  it("builds still and video prompts that keep wet glass + identity", () => {
    const still = buildWetGlassRevealStillPrompt({
      dialect: "droplet-trail",
      product: "amber perfume bottle",
      business: "Maison Glass",
      headline: "CLEAR",
      frame: "start",
    });
    assert.match(still, /glass|condensation|fog|droplet/i);
    assert.match(still, /3:4/);
    assert.match(still, /IMAGE 1|identity|locks hero/i);

    const endEdit = buildWetGlassRevealStillPrompt({
      dialect: "finger-wipe",
      product: "amber perfume bottle",
      headline: "CLEAR",
      frame: "end",
      editingStartPlate: true,
    });
    assert.match(endEdit, /START PLATE EDIT|inpaint|ground truth/i);

    const video = buildWetGlassRevealVideoPrompt({
      dialect: "mono-macro",
      product: "amber perfume bottle",
      business: "Maison Glass",
      headline: "CLEAR",
      durationSec: 6,
    });
    assert.match(video, /6/);
    assert.match(video, /mono|black|wet.?glass|reveal/i);
    assert.match(video, /identity|IMAGE 1|hero|same/i);
  });

  it("has concept + product landing recipes at 6s", () => {
    assert.ok(isLandingRecipeId("product-wet-glass-reveal-6s"));
    assert.ok(isLandingRecipeId("concept-wet-glass-reveal-6s"));
    assert.equal(
      LANDING_RECIPES["product-wet-glass-reveal-6s"].videoCreativeMode,
      "wet-glass-reveal",
    );
    assert.equal(
      LANDING_RECIPES["product-wet-glass-reveal-6s"].duration,
      "6",
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
        videoCreativeMode: "wet-glass-reveal",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "wet-glass-reveal",
    );
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "wet-glass-reveal":/);
    assert.match(src, /makeWetGlassRevealVideo/);
    assert.match(src, /clampWetGlassRevealDurationSec/);
    assert.match(src, /wetGlassDialectPick/);
  });
});
