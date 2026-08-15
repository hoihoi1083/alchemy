import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildH3ShotRecipePrompt,
  buildH3ShotRecipeStillPrompt,
  H3_SHOT_RECIPE_DURATION_SEC,
  H3_SHOT_RECIPE_MODES,
  h3ShotRecipeNeedsReel,
  h3ShotRecipeToSubpath,
  isH3ShotRecipeMode,
} from "../lib/h3-shot-recipes";
import { h3ShotRecipeInputsReady, h3ShotModesForPromotion } from "../lib/recipe-path-ux";
import { isRecipeOwnedVideoMode } from "../lib/creative-workflow";
import {
  physicalVideoOnlyNeedsUploadedPhoto,
  resolveVideoGenerationKind,
  storyboardBlocksRecipeVideo,
} from "../lib/video-generation-path";
import { resolveVideoEnginePlan } from "../lib/video-engine-router";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  microContextForLandingRecipe,
} from "../lib/landing-recipes";

const KIND_INPUT = {
  usesCompositor: false,
  isStoryboardOutput: true,
  isUgcPresenterOutput: false,
  shouldCinematicStitch: false,
  isConceptCinematicSingleOutput: false,
  cinematicSceneCount: 4,
  cinematicScenesLength: 4,
  usesProductAssistant: false,
  conceptTextVideoReady: false,
  useReferenceVideo: false,
  hasReferenceAd: false,
  useMultiAngleVideo: false,
} as const;

describe("H3 shot recipes", () => {
  it("covers all H3 shot modes with identity lock and timed beats", () => {
    assert.deepEqual([...H3_SHOT_RECIPE_MODES], [
      "ecom-orbit",
      "object-lock",
      "macro-snap",
      "luxury-tabletop",
      "beauty-mv",
      "imitate-ad",
      "neon-on-real",
      "food-bullet-time",
    ]);
    for (const mode of H3_SHOT_RECIPE_MODES) {
      assert.equal(isH3ShotRecipeMode(mode), true);
      assert.equal(isRecipeOwnedVideoMode(mode), true);
      const p = buildH3ShotRecipePrompt({
        mode,
        conceptMode: false,
        product: "SOLAR tumbler",
        hasReferenceVideo: h3ShotRecipeNeedsReel(mode),
      });
      assert.match(p, /@Image1/);
      assert.match(p, /SOLAR tumbler/);
      assert.match(p, /一镜|环绕|锁定|仿拍|霓虹|子弹|飞溅/);
      assert.equal(typeof H3_SHOT_RECIPE_DURATION_SEC[mode], "number");
      const still = buildH3ShotRecipeStillPrompt({
        mode,
        conceptMode: false,
        product: "SOLAR tumbler",
      });
      assert.match(still, /9:16/);
      assert.match(still, /textless/i);
      assert.match(still, /SOLAR tumbler/);
    }
    assert.equal(h3ShotRecipeNeedsReel("imitate-ad"), true);
    assert.equal(h3ShotRecipeNeedsReel("neon-on-real"), true);
    assert.equal(h3ShotRecipeNeedsReel("ecom-orbit"), false);
    assert.equal(h3ShotRecipeNeedsReel("food-bullet-time"), false);
    const imitate = buildH3ShotRecipePrompt({
      mode: "imitate-ad",
      conceptMode: false,
      product: "ARC",
      hasReferenceVideo: true,
    });
    assert.match(imitate, /@Video1/);
    const neon = buildH3ShotRecipePrompt({
      mode: "neon-on-real",
      conceptMode: false,
      product: "ARC",
      hasReferenceVideo: true,
    });
    assert.match(neon, /@Video1/);
    assert.match(neon, /霓虹/);
    const food = buildH3ShotRecipePrompt({
      mode: "food-bullet-time",
      conceptMode: false,
      product: "cheese sandwich",
    });
    assert.match(food, /子弹时间|飞溅/);
    assert.match(food, /cheese sandwich/);
    const foodStill = buildH3ShotRecipeStillPrompt({
      mode: "food-bullet-time",
      conceptMode: false,
      product: "cheese sandwich",
    });
    assert.match(foodStill, /BULLET-TIME|splash|Lifestyle/i);
    const macro = buildH3ShotRecipePrompt({
      mode: "macro-snap",
      conceptMode: false,
      product: "sea salt chocolate chip cookie",
    });
    assert.match(macro, /完整产品英雄位|完整轮廓/);
    assert.match(macro, /从全貌推近|戏剧性碎裂/);
    assert.match(macro, /裂开|断裂|涌出/);
    assert.doesNotMatch(macro, /0–1\.5s：极近微距/);
    assert.doesNotMatch(macro, /液体缓慢滴落/);
    const macroWeak = buildH3ShotRecipePrompt({
      mode: "macro-snap",
      conceptMode: false,
      product: "sea salt chocolate chip cookie",
      macroSnapIntensity: "weak",
    });
    assert.match(macroWeak, /细裂纹|轻量/);
    assert.match(macroWeak, /液体缓慢滴落/);
    const macroMedium = buildH3ShotRecipePrompt({
      mode: "macro-snap",
      conceptMode: false,
      product: "sea salt chocolate chip cookie",
      macroSnapIntensity: "medium",
    });
    assert.match(macroMedium, /中等冲击|清晰可读的裂缝/);
    assert.doesNotMatch(macroMedium, /掰开或断裂成两块/);
    const macroStill = buildH3ShotRecipeStillPrompt({
      mode: "macro-snap",
      conceptMode: false,
      product: "sea salt chocolate chip cookie",
    });
    assert.match(macroStill, /Full-product|entire|silhouette/i);
    assert.doesNotMatch(macroStill, /Extreme close-up food/);
  });

  it("wins over storyboard lock and uses H3 only", () => {
    for (const mode of H3_SHOT_RECIPE_MODES) {
      assert.equal(
        resolveVideoGenerationKind({ ...KIND_INPUT, videoCreativeMode: mode }),
        mode,
      );
    }
    const plan = resolveVideoEnginePlan({
      h3ShotRecipe: true,
      hasReel: false,
    });
    assert.equal(plan.firstEngine, "minimax-h3");
    assert.equal(plan.allowKling, false);
    assert.equal(plan.stack, "a-poster");
  });

  it("blocks physical generate without uploaded photo; concept can auto-still", () => {
    for (const mode of H3_SHOT_RECIPE_MODES) {
      assert.equal(isRecipeOwnedVideoMode(mode), true);
      assert.equal(storyboardBlocksRecipeVideo(true, mode), false);
    }
    assert.equal(storyboardBlocksRecipeVideo(true, "product-assistant"), true);
    // Physical H3 no longer treats auto-still as unlock — missing photo still needs upload.
    assert.equal(
      physicalVideoOnlyNeedsUploadedPhoto({
        hasProductPhoto: false,
        hasDirectReferenceR2v: false,
        hasStoryboardScenes: false,
        hasImageOverride: false,
        canAutoStill: false,
      }),
      true,
    );
    assert.equal(
      physicalVideoOnlyNeedsUploadedPhoto({
        hasProductPhoto: true,
        hasDirectReferenceR2v: false,
        hasStoryboardScenes: false,
        hasImageOverride: false,
        canAutoStill: false,
      }),
      false,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "ecom-orbit",
        promotionMode: "physical",
        hasProductPhoto: false,
        hasReferenceVideo: false,
        hasConceptHero: true,
      }),
      false,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "ecom-orbit",
        promotionMode: "physical",
        hasProductPhoto: true,
        hasReferenceVideo: false,
        hasConceptHero: false,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "imitate-ad",
        promotionMode: "physical",
        hasProductPhoto: true,
        hasReferenceVideo: false,
        hasConceptHero: false,
      }),
      false,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "food-bullet-time",
        promotionMode: "concept",
        hasProductPhoto: false,
        hasReferenceVideo: false,
        hasConceptHero: true,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "ecom-orbit",
        promotionMode: "concept",
        hasProductPhoto: false,
        hasReferenceVideo: false,
        hasConceptHero: true,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "neon-on-real",
        promotionMode: "physical",
        hasProductPhoto: false,
        hasReferenceVideo: true,
        hasConceptHero: false,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "neon-on-real",
        promotionMode: "concept",
        hasProductPhoto: false,
        hasReferenceVideo: true,
        hasConceptHero: false,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "neon-on-real",
        promotionMode: "physical",
        hasProductPhoto: false,
        hasReferenceVideo: false,
        hasConceptHero: false,
      }),
      false,
    );
    // Recipe-ready without upload (neon) unlocks the physical video-only photo gate.
    assert.equal(
      physicalVideoOnlyNeedsUploadedPhoto({
        hasProductPhoto: false,
        hasDirectReferenceR2v: false,
        hasStoryboardScenes: false,
        hasImageOverride: false,
        canAutoStill: true,
      }),
      false,
    );
    assert.equal(h3ShotModesForPromotion("concept").length, H3_SHOT_RECIPE_MODES.length);
    assert.equal(h3ShotModesForPromotion("physical").includes("food-bullet-time"), true);
    assert.equal(h3ShotModesForPromotion("concept").includes("ecom-orbit"), true);
    const wizard = readFileSync(join(process.cwd(), "hooks/useStudioWizard.ts"), "utf8");
    const start = wizard.indexOf("async function generateVideo");
    const firstNeedPhoto = wizard.indexOf("setError(m.errors.needPhoto)", start);
    assert.ok(firstNeedPhoto > start);
    assert.match(wizard, /h3ShotRecipeInputsReady/);
    assert.match(
      wizard.slice(
        wizard.indexOf("async function makeH3ShotRecipeVideo"),
        wizard.indexOf("async function makeMultiAngleVideo"),
      ),
      /promotionMode === "concept"/,
    );
  });

  it("landing recipes deep-link to video-only H3 subpaths", () => {
    const cases = [
      ["product-ecom-orbit-6s", "ecom-orbit", "ecom_orbit"],
      ["product-object-lock-6s", "object-lock", "object_lock"],
      ["product-macro-snap-6s", "macro-snap", "macro_snap"],
      ["product-luxury-tabletop-8s", "luxury-tabletop", "luxury_tabletop"],
      ["product-beauty-mv-10s", "beauty-mv", "beauty_mv"],
      ["product-imitate-ad-8s", "imitate-ad", "imitate_ad"],
      ["product-neon-on-real-8s", "neon-on-real", "neon_on_real"],
      ["product-food-bullet-time-6s", "food-bullet-time", "food_bullet_time"],
      ["concept-beauty-mv-10s", "beauty-mv", "beauty_mv"],
      ["concept-imitate-ad-8s", "imitate-ad", "imitate_ad"],
      ["concept-neon-on-real-8s", "neon-on-real", "neon_on_real"],
    ] as const;
    for (const [id, mode, subpath] of cases) {
      assert.equal(isLandingRecipeId(id), true);
      assert.equal(LANDING_RECIPES[id].workflowMode, "video-only");
      assert.equal(LANDING_RECIPES[id].videoCreativeMode, mode);
      const ctx = microContextForLandingRecipe(id);
      assert.equal(ctx.videoSubpath, subpath);
      assert.equal(ctx.workflowMode, "video-only");
      assert.equal(h3ShotRecipeToSubpath(mode), subpath);
    }
  });
});

describe("H3 shot recipe wizard wiring", () => {
  it("posts MiniMax H3 reference clips from recipe prompts", () => {
    const wizard = readFileSync(join(process.cwd(), "hooks/useStudioWizard.ts"), "utf8");
    assert.match(wizard, /async function makeH3ShotRecipeVideo/);
    assert.match(wizard, /H3_SHOT_RECIPE_DURATION_SEC/);
    assert.match(wizard, /case "ecom-orbit":/);
    assert.match(wizard, /case "imitate-ad":/);
    assert.match(wizard, /case "neon-on-real":/);
    assert.match(wizard, /case "food-bullet-time":/);
    assert.match(wizard, /makeH3ShotRecipeVideo/);
    const start = wizard.indexOf("async function makeH3ShotRecipeVideo");
    const end = wizard.indexOf("async function makeMultiAngleVideo");
    assert.ok(start > 0 && end > start);
    const fn = wizard.slice(start, end);
    assert.match(wizard, /async function generateH3ShotRecipeStill/);
    assert.match(wizard, /buildH3ShotRecipeStillPrompt/);
    assert.match(fn, /generateH3ShotRecipeStill/);
    assert.match(fn, /generate-minimax-h3/);
    assert.match(fn, /mode", "reference"/);
    assert.match(fn, /reference_images/);
    assert.match(fn, /mode !== "neon-on-real"/);
    assert.doesNotMatch(fn, /generate-kling-storyboard/);
    const genStart = wizard.indexOf("async function generateVideo");
    const genGate = wizard.slice(
      genStart,
      wizard.indexOf("setError(null)", genStart + 200),
    );
    assert.match(genGate, /h3ShotRecipeCanGenerate/);
    const micro = readFileSync(
      join(process.cwd(), "hooks/useWizardMicroStep.ts"),
      "utf8",
    );
    assert.match(micro, /subpathToH3ShotRecipe/);
    assert.match(micro, /Force creative mode to match the subpath/);
  });
});
