import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildWebBoundaryBreakStillPrompt,
  buildWebBoundaryBreakVideoPrompt,
  clampWebBoundaryBreakDurationSec,
  resolveWebBoundaryBreakScheme,
  webBoundaryBreakDurationOptions,
} from "../lib/web-boundary-break";
import {
  isRecipeOwnedVideoMode,
  videoModeHidesAutoDuration,
} from "../lib/creative-workflow";
import { isLandingRecipeId, LANDING_RECIPES } from "../lib/landing-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";

describe("web-boundary-break", () => {
  it("registers as recipe-owned mode with no auto duration", () => {
    assert.equal(isRecipeOwnedVideoMode("web-boundary-break"), true);
    assert.equal(videoModeHidesAutoDuration("web-boundary-break"), true);
    assert.deepEqual(webBoundaryBreakDurationOptions(), ["8", "10"]);
    assert.equal(clampWebBoundaryBreakDurationSec("auto"), 10);
    assert.equal(clampWebBoundaryBreakDurationSec("8"), 8);
    assert.equal(clampWebBoundaryBreakDurationSec(14), 10);
  });

  it("resolves Shelf reach / Hold through schemes", () => {
    assert.equal(
      resolveWebBoundaryBreakScheme({ pick: "shelf-reach" }),
      "shelf-reach",
    );
    assert.equal(
      resolveWebBoundaryBreakScheme({ pick: "hold-through" }),
      "hold-through",
    );
    assert.equal(
      resolveWebBoundaryBreakScheme({
        pick: "auto",
        headline: "hold through close-up",
      }),
      "hold-through",
    );
    assert.equal(
      resolveWebBoundaryBreakScheme({
        pick: "auto",
        conceptIdea: "reach shelf grab",
      }),
      "shelf-reach",
    );
    assert.equal(
      resolveWebBoundaryBreakScheme({ pick: "auto" }),
      "hold-through",
    );
  });

  it("builds layered web-UI still and video prompts", () => {
    const still = buildWebBoundaryBreakStillPrompt({
      scheme: "shelf-reach",
      product: "vintage brick phone",
      frame: "start",
    });
    assert.match(still, /nav|COLLECTION|网页|boundary|z-order/i);
    assert.match(still, /3:4/);
    assert.match(still, /phone stays phone|IMAGE 1/i);
    assert.match(still, /gibberish|illegible|ADD TO CART/i);

    const video = buildWebBoundaryBreakVideoPrompt({
      scheme: "hold-through",
      product: "vintage brick phone",
      durationSec: 10,
    });
    assert.match(video, /10/);
    assert.match(video, /Hold through|web|nav/i);
    assert.match(video, /IN FRONT|behind|nav bar/i);
  });

  it("has concept + product landing recipes at 10s", () => {
    assert.ok(isLandingRecipeId("product-web-boundary-break-10s"));
    assert.ok(isLandingRecipeId("concept-web-boundary-break-10s"));
    assert.equal(
      LANDING_RECIPES["product-web-boundary-break-10s"].videoCreativeMode,
      "web-boundary-break",
    );
    assert.equal(LANDING_RECIPES["product-web-boundary-break-10s"].duration, "10");
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
        videoCreativeMode: "web-boundary-break",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "web-boundary-break",
    );
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "web-boundary-break":/);
    assert.match(src, /makeWebBoundaryBreakVideo/);
    assert.match(src, /clampWebBoundaryBreakDurationSec/);
    assert.match(src, /webBoundarySchemePick/);
  });
});
