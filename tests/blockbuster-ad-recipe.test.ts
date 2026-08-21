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
      timing: "classic",
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
    assert.match(p, new RegExp(`@Image${ids.hero}照片`));
    assert.deepEqual(
      orderedBlockbusterRefFiles({ hero: "H", packaging: "P", scene: "S" }),
      ["S", "P", "H"],
    );
  });

  it("on-bridge is oncoming cab under the overpass", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "CD Capture cream",
      hasPackaging: true,
      hasSceneFrame: false,
      timing: "early-reveal",
      camera: "on-bridge",
    });
    assert.match(p, /天桥/);
    assert.match(p, /车头朝镜头|迎面/);
    assert.match(p, /禁止倒车|driving backward/);
    assert.doesNotMatch(p, /相机始终钉在货车正后方/);
    assert.doesNotMatch(p, /vanishing point|顺着公路纵深/);

    const s = buildBlockbusterSceneStillPrompt({
      conceptMode: false,
      product: "CD Capture cream",
      camera: "on-bridge",
      hasPackaging: false,
    });
    assert.match(s, /ONCOMING|cab \/ headlights toward camera/i);
    assert.doesNotMatch(s, /BEHIND the truck/);
  });

  it("bridge-down-road looks along the highway with truck driving away", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "CD Capture cream",
      hasPackaging: false,
      hasSceneFrame: false,
      timing: "early-reveal",
      camera: "bridge-down-road",
    });
    assert.match(p, /vanishing point|顺着公路纵深/);
    assert.match(p, /背对镜头|车尾/);
    assert.match(p, /素面|空白/);
    assert.doesNotMatch(p, /车头朝镜头/);

    const s = buildBlockbusterSceneStillPrompt({
      conceptMode: false,
      product: "CD Capture cream",
      camera: "bridge-down-road",
      hasPackaging: false,
    });
    assert.match(s, /DOWN THE HIGHWAY|vanishing point/i);
    assert.match(s, /drives AWAY|rear \/ roof/i);
    assert.match(s, /PLAIN blank kraft/i);
  });

  it("without packaging, video prompt demands blank boxes", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "Vitamin C serum",
      hasPackaging: false,
      hasSceneFrame: false,
      timing: "early-reveal",
      camera: "on-bridge",
    });
    assert.match(p, /素面|空白/);
    assert.match(p, /Vitamin C|假商标/);
  });

  it("behind-truck remains the default chase cam", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "ARC bottle",
      hasPackaging: true,
      hasSceneFrame: true,
      timing: "classic",
    });
    assert.match(p, /货车正后方/);
  });

  it("early-reveal shortens boxes and lengthens hero", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "CD Capture cream",
      hasPackaging: true,
      hasSceneFrame: true,
      timing: "early-reveal",
    });
    assert.match(p, /0-2s|0–2s|0-2\.5s|2-2\.5s/);
    assert.match(p, /2\.5-4\.5s|4\.5-9s|2.5/);
    assert.match(p, /0-2\.5秒严禁/);
    assert.doesNotMatch(p, /0-4秒严禁/);
  });

  it("product name is label only — hero photo pixels win", () => {
    const p = buildBlockbusterVideoPrompt({
      conceptMode: false,
      product: "vitamin C serum",
      hasPackaging: true,
      hasSceneFrame: true,
      timing: "early-reveal",
    });
    assert.match(p, /称呼仅作标签：vitamin C serum/);
    assert.match(p, /必须以@Image3照片为准/);
    assert.match(p, /禁止按品类名改成滴管瓶/);
    assert.match(p, /inventing a different bottle\/serum\/dropper/);
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
    const branded = buildBlockbusterSceneStillPrompt({
      conceptMode: false,
      product: "SOLAR tumbler",
      hasPackaging: true,
    });
    assert.match(branded, /textless/i);
    assert.match(branded, /truck/i);
    assert.match(branded, /overpass|dusk/i);
    assert.match(branded, /SOLAR tumbler/);
    assert.match(branded, /TOO HIGH|scraping/i);
    assert.match(branded, /BEHIND the truck|looking FORWARD/i);

    const blank = buildBlockbusterSceneStillPrompt({
      conceptMode: false,
      product: "SOLAR tumbler",
      hasPackaging: false,
    });
    assert.match(blank, /PLAIN blank kraft/i);
    assert.doesNotMatch(blank, /SOLAR tumbler/);
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
    assert.match(fn, /finish-blockbuster/);
    assert.match(fn, /parseBlockbusterTiming/);
    assert.doesNotMatch(fn, /generate-kling-storyboard/);
    assert.match(wizard, /case "blockbuster":/);
    assert.match(wizard, /setWorkflowMode\("video-only"\)/);
    assert.match(wizard, /early-reveal/);
  });
});
