import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferImpactPosterTone,
  resolveImpactPosterEffect,
  resolveImpactPosterTone,
  buildImpactPosterStillPrompt,
  buildImpactPosterVideoPrompt,
  impactPosterMotionStrength,
} from "../lib/impact-poster";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { LANDING_RECIPES, isLandingRecipeId } from "../lib/landing-recipes";

describe("impact-poster", () => {
  it("infers fiery tone for spicy snack copy", () => {
    assert.equal(
      inferImpactPosterTone({ product: "Spicy chips", headline: "CRUNCH hot" }),
      "fiery",
    );
  });

  it("resolves tone/effect picks and defaults", () => {
    assert.equal(resolveImpactPosterTone({ pick: "cyber" }), "cyber");
    assert.equal(
      resolveImpactPosterEffect({ pick: "auto", tone: "fiery" }),
      "shatter-burst",
    );
    assert.equal(
      resolveImpactPosterEffect({
        pick: "auto",
        tone: "fiery",
        excludeId: "shatter-burst",
      }),
      "energy-rays",
    );
    assert.ok(impactPosterMotionStrength("lightning-pulse") >= 80);
  });

  it("builds still/video prompts with 大透视 impact language", () => {
    const still = buildImpactPosterStillPrompt({
      tone: "premium",
      effect: "energy-rays",
      product: "AirPods Pro",
      headline: "SOUND FUTURE",
      frame: "end",
    });
    assert.match(still, /IMPACT POSTER|大透视/);
    assert.match(still, /AirPods Pro/);
    assert.match(still, /SOUND FUTURE/);

    const video = buildImpactPosterVideoPrompt({
      tone: "cyber",
      effect: "lightning-pulse",
      product: "Headphones",
    });
    assert.match(video, /IMPACT POSTER/i);
    assert.match(video, /thrust|lunge|greater/i);
  });

  it("wins resolveVideoGenerationKind and landing recipes lock mode", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: true,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 0,
        cinematicScenesLength: 0,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "impact-poster",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "impact-poster",
    );
    assert.equal(isLandingRecipeId("product-impact-poster-6s"), true);
    assert.equal(
      LANDING_RECIPES["product-impact-poster-6s"].videoCreativeMode,
      "impact-poster",
    );
    assert.equal(
      LANDING_RECIPES["concept-impact-poster-6s"].videoCreativeMode,
      "impact-poster",
    );
  });
});
