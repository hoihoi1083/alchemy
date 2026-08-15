import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLOCKBUSTER_DURATION_SEC,
  blockbusterImageMap,
  buildBlockbusterSceneStillPrompt,
  buildBlockbusterVideoPrompt,
  orderedBlockbusterRefFiles,
} from "../lib/blockbuster-ad-recipe";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { resolveVideoEnginePlan } from "../lib/video-engine-router";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  landingRecipesForPromotion,
  microContextForLandingRecipe,
} from "../lib/landing-recipes";

describe("blockbuster 3-ref recipe", () => {
  it("writes a 9s one-take with timed beats and image locks", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "ARC bottle",
      hasPackaging: true,
      hasSceneFrame: true,
    });
    assert.equal(BLOCKBUSTER_DURATION_SEC, 9);
    assert.match(p, /ONE-TAKE/);
    assert.match(p, /0-2s/);
    assert.match(p, /2-4s/);
    assert.match(p, /4-6s/);
    assert.match(p, /6-9s/);
    assert.match(p, /剧烈撞击/);
    assert.match(p, /朝镜头/);
    assert.match(p, /略低|低机位/);
    assert.match(p, /不得停顿|禁止定格/);
    assert.match(p, /光流连续|同一机位轨道/);
    assert.match(p, /不要凭空消失/);
    assert.match(p, /不要突然出现/);
    assert.match(p, /0-4秒严禁/);
    assert.doesNotMatch(p, /最终定格/);
    assert.doesNotMatch(p, /变成低机位仰视/);
    assert.match(p, /@Image1/);
    assert.match(p, /@Image2/);
    assert.match(p, /@Image3/);
    assert.match(p, /ARC bottle/);
    assert.match(p, /禁止硬切|不要硬切|no hard cuts/i);
    const ids = blockbusterImageMap({ hasPackaging: true, hasSceneFrame: true });
    assert.deepEqual(ids, { scene: 1, packaging: 2, hero: 3 });
    assert.match(p, new RegExp(`以@Image${ids.scene}为第一帧`));
    assert.match(p, new RegExp(`@Image${ids.hero}产品`));
    assert.deepEqual(
      orderedBlockbusterRefFiles({ hero: "H", packaging: "P", scene: "S" }),
      ["S", "P", "H"],
    );
  });

  it("concept reveal uses logo/mascot not a fake SKU", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: true,
      product: "",
      headline: "Alchemy",
      conceptIdea: "AI marketing studio",
      hasPackaging: false,
      hasSceneFrame: false,
    });
    assert.match(p, /吉祥物|Logo/);
    assert.match(p, /假冒 SKU/);
    assert.doesNotMatch(p, /@Image2/);
    assert.match(p, /0-4秒严禁/);
  });

  it("scene still is textless truck/overpass plate", () => {
    const s = buildBlockbusterSceneStillPrompt({
      conceptMode: false,
      product: "SOLAR tumbler",
    });
    assert.match(s, /textless/i);
    assert.match(s, /truck/i);
    assert.match(s, /overpass|dusk/i);
    assert.match(s, /SOLAR tumbler/);
    assert.match(s, /TOO HIGH|scraping/i);
    assert.match(s, /BEHIND the truck|looking FORWARD/i);
  });
});

describe("blockbuster video path routing", () => {
  it("wins over storyboard lock like motion poster", () => {
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
        videoCreativeMode: "blockbuster",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "blockbuster",
    );
  });

  it("engine is H3 only — no Kling stitch", () => {
    const plan = resolveVideoEnginePlan({
      blockbuster: true,
      hasReel: false,
    });
    assert.equal(plan.firstEngine, "minimax-h3");
    assert.equal(plan.allowKling, false);
    assert.equal(plan.stack, "a-poster");
  });
});

describe("blockbuster landing recipes", () => {
  it("deep-links to video-only not storyboard", () => {
    assert.equal(isLandingRecipeId("product-blockbuster-9s"), true);
    assert.equal(isLandingRecipeId("concept-blockbuster-9s"), true);
    const product = LANDING_RECIPES["product-blockbuster-9s"];
    assert.equal(product.workflowMode, "video-only");
    assert.equal(product.videoCreativeMode, "blockbuster");
    assert.equal(product.promotionMode, "physical");
    assert.equal(product.storyboardSceneCount, undefined);

    const concept = LANDING_RECIPES["concept-blockbuster-9s"];
    assert.equal(concept.promotionMode, "concept");
    assert.equal(concept.workflowMode, "video-only");
    assert.equal(concept.videoCreativeMode, "blockbuster");

    const productCtx = microContextForLandingRecipe("product-blockbuster-9s");
    assert.equal(productCtx.workflowMode, "video-only");
    assert.equal(productCtx.videoSubpath, "blockbuster");
    assert.equal(productCtx.combinedStyle, undefined);

    const conceptCtx = microContextForLandingRecipe("concept-blockbuster-9s", "concept");
    assert.equal(conceptCtx.videoSubpath, "blockbuster");
    assert.equal(conceptCtx.conceptSource, "assistant");

    assert.ok(landingRecipesForPromotion("physical").includes("product-blockbuster-9s"));
    assert.ok(landingRecipesForPromotion("concept").includes("concept-blockbuster-9s"));
  });
});

describe("blockbuster wizard generate wiring", () => {
  it("uses MiniMax H3 reference 9s, not Kling stitch", () => {
    const wizard = readFileSync(join(process.cwd(), "hooks/useStudioWizard.ts"), "utf8");
    const start = wizard.indexOf("async function makeBlockbusterVideo");
    const end = wizard.indexOf("async function makeMultiAngleVideo");
    assert.ok(start > 0 && end > start);
    const fn = wizard.slice(start, end);
    assert.match(fn, /BLOCKBUSTER_DURATION_SEC/);
    assert.match(fn, /generate-minimax-h3/);
    assert.match(fn, /mode", "reference"/);
    assert.match(fn, /orderedBlockbusterRefFiles/);
    assert.doesNotMatch(fn, /generate-kling-storyboard/);
    assert.match(wizard, /case "blockbuster":/);
    assert.match(wizard, /setWorkflowMode\("video-only"\)/);
  });
});
