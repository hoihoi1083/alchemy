import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildWebBoundaryBreakStillPrompt,
  buildWebBoundaryBreakVideoPrompt,
  clampWebBoundaryBreakDurationSec,
  resolveWebBoundaryBreakScheme,
  resolveWebBoundaryNavLabels,
  webBoundaryBreakUsesSinglePlate,
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
    assert.equal(clampWebBoundaryBreakDurationSec("auto"), 8);
    assert.equal(clampWebBoundaryBreakDurationSec("8"), 8);
    assert.equal(clampWebBoundaryBreakDurationSec(14), 10);
  });

  it("hold-through uses single plate for stable H3 morph", () => {
    assert.equal(webBoundaryBreakUsesSinglePlate("hold-through"), true);
    assert.equal(webBoundaryBreakUsesSinglePlate("shelf-reach"), false);
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

  it("resolves nav labels from business like Social drip handle", () => {
    assert.deepEqual(
      resolveWebBoundaryNavLabels({
        business: "Social Drip",
        headline: "Summer drop",
      }),
      {
        left: "SUMMER DROP",
        brand: "SOCIAL DRIP",
        search: "SEARCH",
        account: "ACCOUNT",
      },
    );
    assert.equal(
      resolveWebBoundaryNavLabels({ headline: "Anker Power" }).brand,
      "ANKER POWER",
    );
  });

  it("builds layered web-UI still and video prompts", () => {
    const still = buildWebBoundaryBreakStillPrompt({
      scheme: "shelf-reach",
      product: "vintage brick phone",
      business: "Social Drip",
      frame: "start",
    });
    assert.match(still, /SOCIAL DRIP/);
    assert.match(still, /nav|COLLECTION|网页|boundary|Z-ORDER/i);
    assert.match(still, /3:4/);
    assert.match(still, /power bank stays power bank|IMAGE 1/i);
    assert.match(still, /gibberish|ADD TO CART/i);

    const endEdit = buildWebBoundaryBreakStillPrompt({
      scheme: "shelf-reach",
      product: "portable power bank",
      frame: "end",
      editingStartPlate: true,
    });
    assert.match(endEdit, /START PLATE EDIT|inpaint|ground truth/i);

    const video = buildWebBoundaryBreakVideoPrompt({
      scheme: "hold-through",
      product: "portable power bank",
      business: "Social Drip",
      durationSec: 8,
      singlePlate: true,
    });
    assert.match(video, /SOCIAL DRIP/);
    assert.match(video, /8/);
    assert.match(video, /Hold through|web|nav/i);
    assert.match(video, /IN FRONT|same person|micro-motion/i);
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
