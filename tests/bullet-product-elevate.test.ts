import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BULLET_PRODUCT_ELEVATE_DURATION_SEC,
  buildBulletProductElevateStillPrompt,
  buildBulletProductElevateVideoPrompt,
  clampBulletProductElevateDurationSec,
  bulletProductElevateDurationOptions,
} from "../lib/bullet-product-elevate";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  microContextForLandingRecipe,
} from "../lib/landing-recipes";
import { isRecipeOwnedVideoMode } from "../lib/creative-workflow";
import { buildIntakeTemplateCards } from "../lib/intake-template-styles";
import { applyIntakeVideoStyle } from "../lib/apply-intake-video-style";
import { estimateVideoPipelineTokens } from "../lib/billing/estimate-job-tokens";
import { estimateH3Tokens, TOKEN_COST } from "../lib/billing/token-costs";

describe("bullet-product-elevate recipe", () => {
  it("defaults to 10s and clamps picker to 8/10/12", () => {
    assert.equal(BULLET_PRODUCT_ELEVATE_DURATION_SEC, 10);
    assert.equal(clampBulletProductElevateDurationSec("auto"), 10);
    assert.equal(clampBulletProductElevateDurationSec(undefined), 10);
    assert.equal(clampBulletProductElevateDurationSec("8"), 8);
    assert.equal(clampBulletProductElevateDurationSec(10), 10);
    assert.equal(clampBulletProductElevateDurationSec("12"), 12);
    assert.equal(clampBulletProductElevateDurationSec("6"), 8);
    assert.equal(clampBulletProductElevateDurationSec("15"), 12);
    assert.deepEqual(bulletProductElevateDurationOptions(), ["8", "10", "12"]);
  });

  it("builds lifestyle start / freeze end stills and scales video beats", () => {
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

    const video10 = buildBulletProductElevateVideoPrompt({
      product: "pink handbag",
      durationSec: 10,
    });
    assert.match(video10, /EXACTLY 10s/);
    assert.match(video10, /0\.0–2\.5s/);
    assert.match(video10, /2\.5–4s|2\.5–4\.0s/);
    assert.match(video10, /bullet time|Bullet-time|orbit/i);

    const video8 = buildBulletProductElevateVideoPrompt({
      product: "pink handbag",
      durationSec: 8,
    });
    assert.match(video8, /EXACTLY 8s/);
    assert.match(video8, /0\.0–2s/);

    const video12 = buildBulletProductElevateVideoPrompt({
      product: "pink handbag",
      durationSec: 12,
    });
    assert.match(video12, /EXACTLY 12s/);
    assert.match(video12, /0\.0–3s/);
  });

  it("estimates tokens at 10/12s (not squashed to 8)", () => {
    const at10 = estimateVideoPipelineTokens({
      kind: "bullet-product-elevate",
      resolution: "480P",
      durationSec: 10,
      willGenerateStills: true,
    });
    assert.equal(
      at10,
      TOKEN_COST.image * 2 +
        estimateH3Tokens({ resolution: "480P", duration: 10 }),
    );
    const at12 = estimateVideoPipelineTokens({
      kind: "bullet-product-elevate",
      resolution: "480P",
      durationSec: 12,
      willGenerateStills: false,
    });
    assert.equal(
      at12,
      estimateH3Tokens({ resolution: "480P", duration: 12 }),
    );
  });

  it("is recipe-owned and dual-grid landing recipes exist", () => {
    assert.equal(isRecipeOwnedVideoMode("bullet-product-elevate"), true);
    assert.ok(isLandingRecipeId("product-bullet-elevate-10s"));
    assert.ok(isLandingRecipeId("concept-bullet-elevate-10s"));
    assert.equal(
      LANDING_RECIPES["product-bullet-elevate-10s"].videoCreativeMode,
      "bullet-product-elevate",
    );
    assert.equal(LANDING_RECIPES["product-bullet-elevate-10s"].duration, "10");
    assert.equal(
      LANDING_RECIPES["concept-bullet-elevate-10s"].promotionMode,
      "concept",
    );
    assert.equal(
      microContextForLandingRecipe("product-bullet-elevate-10s").videoSubpath,
      "bullet_product_elevate",
    );
    assert.equal(
      microContextForLandingRecipe("concept-bullet-elevate-10s", "concept")
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
        "h3-triangle-light-mg": { title: "Triangle light", description: "TL" },
        "h3-triangle-light-mg": { title: "TL", description: "d" },
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

  it("wizard generation switch includes the new kind and honors duration clamp", () => {
    const src = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    assert.match(src, /case "bullet-product-elevate":/);
    assert.match(src, /makeBulletProductElevateVideo/);
    assert.match(src, /clampBulletProductElevateDurationSec/);
  });
});
