import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BULLET_PRODUCT_ELEVATE_DURATION_SEC,
  buildBulletProductElevateStillPrompt,
  buildBulletProductElevateVideoPrompt,
} from "../lib/bullet-product-elevate";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  microContextForLandingRecipe,
} from "../lib/landing-recipes";
import { isRecipeOwnedVideoMode } from "../lib/creative-workflow";
import { buildIntakeTemplateCards } from "../lib/intake-template-styles";
import { applyIntakeVideoStyle } from "../lib/apply-intake-video-style";

describe("bullet-product-elevate recipe", () => {
  it("builds lifestyle start / freeze end stills and timed video prompt", () => {
    const start = buildBulletProductElevateStillPrompt({
      product: "pink handbag",
      frame: "start",
    });
    assert.match(start, /walk|walking|lifestyle/i);
    assert.match(start, /@Image1|IMAGE 1/i);

    const end = buildBulletProductElevateStillPrompt({
      product: "pink handbag",
      frame: "end",
    });
    assert.match(end, /bullet|freeze|float/i);

    const video = buildBulletProductElevateVideoPrompt({
      product: "pink handbag",
      durationSec: BULLET_PRODUCT_ELEVATE_DURATION_SEC,
    });
    assert.match(video, new RegExp(String(BULLET_PRODUCT_ELEVATE_DURATION_SEC)));
    assert.match(video, /bullet time|Bullet-time|orbit/i);
  });

  it("is recipe-owned and dual-grid landing recipes exist", () => {
    assert.equal(isRecipeOwnedVideoMode("bullet-product-elevate"), true);
    assert.ok(isLandingRecipeId("product-bullet-elevate-8s"));
    assert.ok(isLandingRecipeId("concept-bullet-elevate-8s"));
    assert.equal(
      LANDING_RECIPES["product-bullet-elevate-8s"].videoCreativeMode,
      "bullet-product-elevate",
    );
    assert.equal(
      LANDING_RECIPES["concept-bullet-elevate-8s"].promotionMode,
      "concept",
    );
    assert.equal(
      microContextForLandingRecipe("product-bullet-elevate-8s").videoSubpath,
      "bullet_product_elevate",
    );
    assert.equal(
      microContextForLandingRecipe("concept-bullet-elevate-8s", "concept")
        .videoSubpath,
      "bullet_product_elevate",
    );
  });

  it("appears on product and concept video Template cards", () => {
    const copy = {
      pathQuickTitle: "Quick",
      pathQuickVideoDesc: "Q",
      pathReferenceVideoTitle: "Ref",
      pathReferenceVideoDesc: "R",
      sceneReelTitle: "Scene",
      sceneReelDesc: "S",
      videoCreativeModes: {
        "motion-poster": { title: "MP", description: "d" },
        "impact-poster": { title: "IP", description: "d" },
        blockbuster: { title: "BB", description: "d" },
        "vacuum-inflate": { title: "VI", description: "d" },
        "creative-motion": { title: "CM", description: "d" },
        "hand-throw-scene": { title: "HT", description: "d" },
        "product-explode": { title: "PE", description: "d" },
        "bullet-product-elevate": {
          title: "Bullet elevate",
          description: "BT",
        },
        "social-drip": { title: "SD", description: "d" },
        "ecom-orbit": { title: "EO", description: "d" },
        "object-lock": { title: "OL", description: "d" },
        "macro-snap": { title: "MS", description: "d" },
        "luxury-tabletop": { title: "LT", description: "d" },
        "beauty-mv": { title: "BM", description: "d" },
        "imitate-ad": { title: "IA", description: "d" },
        "neon-on-real": { title: "NR", description: "d" },
        "food-bullet-time": { title: "FB", description: "d" },
        "c4d-motion": { title: "C4", description: "d" },
        "h3-showreel": { title: "SR", description: "d" },
        "h3-sphere-mg": { title: "SP", description: "d" },
        "h3-logo-mg": { title: "LM", description: "d" },
        "h3-movie-title": { title: "MT", description: "d" },
        "h3-lifestyle": { title: "LS", description: "d" },
      },
      visualStyles: {
        "explosion-unbox": { title: "EU", description: "d" },
      },
      storyboardRecipes: {},
    };
    const product = buildIntakeTemplateCards({
      workflowMode: "video-only",
      isConcept: false,
      copy,
    });
    const concept = buildIntakeTemplateCards({
      workflowMode: "video-only",
      isConcept: true,
      copy,
    });
    assert.ok(product.some((c) => c.id === "bullet_product_elevate"));
    assert.ok(concept.some((c) => c.id === "bullet_product_elevate"));
  });

  it("applyIntake maps subpath to creative mode", () => {
    const calls: string[] = [];
    applyIntakeVideoStyle("bullet_product_elevate", {
      isConcept: false,
      setVideoSubpath: () => {},
      wizard: {
        applyPrimaryPathVideoOnly: () => {},
        applyPrimaryPathConceptVideo: () => {},
        onVideoCreativeModeChange: (m) => calls.push(m),
      },
    });
    assert.deepEqual(calls, ["bullet-product-elevate"]);
  });

  it("wizard generation switch includes the new kind", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "bullet-product-elevate":/);
    assert.match(src, /makeBulletProductElevateVideo/);
  });
});
