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
  h3ShotRecipeNeedsHeroPhoto,
  h3ShotRecipeNeedsLifestyleStill,
  h3ShotRecipeToSubpath,
  isH3ShotRecipeMode,
  parseH3ShowreelSchemePick,
  parseH3SphereMgSchemePick,
  resolveH3ShowreelScheme,
  resolveH3SphereMgScheme,
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
      "c4d-motion",
      "h3-showreel",
      "h3-sphere-mg",
      "h3-movie-title",
      "h3-lifestyle",
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
      assert.match(
        p,
        /一镜|环绕|锁定|仿拍|霓虹|子弹|飞溅|C4D|三维|黑场|秀场|球体|标题|多格|生活/,
      );
      assert.equal(typeof H3_SHOT_RECIPE_DURATION_SEC[mode], "number");
      const still = buildH3ShotRecipeStillPrompt({
        mode,
        conceptMode: false,
        product: "SOLAR tumbler",
        showreelAspect: mode === "h3-showreel" ? "9:16" : undefined,
      });
      assert.match(still, /9:16|16:9/);
      assert.match(still, /textless/i);
      assert.match(still, /SOLAR tumbler/);
    }
    assert.equal(h3ShotRecipeNeedsReel("imitate-ad"), true);
    assert.equal(h3ShotRecipeNeedsReel("neon-on-real"), true);
    assert.equal(h3ShotRecipeNeedsReel("h3-showreel"), true);
    assert.equal(h3ShotRecipeNeedsReel("h3-sphere-mg"), false);
    assert.equal(h3ShotRecipeNeedsReel("h3-movie-title"), false);
    assert.equal(h3ShotRecipeNeedsReel("h3-lifestyle"), false);
    assert.equal(h3ShotRecipeNeedsReel("ecom-orbit"), false);
    assert.equal(h3ShotRecipeNeedsReel("food-bullet-time"), false);
    assert.equal(h3ShotRecipeNeedsReel("c4d-motion"), false);
    assert.equal(h3ShotRecipeNeedsHeroPhoto("neon-on-real"), false);
    assert.equal(h3ShotRecipeNeedsHeroPhoto("c4d-motion"), true);
    assert.equal(h3ShotRecipeNeedsLifestyleStill("h3-lifestyle"), true);
    assert.equal(h3ShotRecipeNeedsLifestyleStill("food-bullet-time"), true);
    assert.equal(h3ShotRecipeNeedsLifestyleStill("c4d-motion"), false);
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
    const c4d = buildH3ShotRecipePrompt({
      mode: "c4d-motion",
      conceptMode: false,
      product: "ARC sneakers",
    });
    assert.match(c4d, /C4D|黑场|三维/);
    assert.match(c4d, /ARC sneakers/);
    assert.match(c4d, /@Image1/);
    const c4dStill = buildH3ShotRecipeStillPrompt({
      mode: "c4d-motion",
      conceptMode: false,
      product: "ARC sneakers",
    });
    assert.match(c4dStill, /black void|C4D/i);
    assert.match(c4dStill, /ARC sneakers/);
    const showreel = buildH3ShotRecipePrompt({
      mode: "h3-showreel",
      conceptMode: false,
      product: "NOVA phone",
      hasReferenceVideo: true,
      showreelScheme: "abstract-morph",
    });
    assert.match(showreel, /秀场|Abstract morph|@Video1/);
    assert.match(showreel, /NOVA phone/);
    assert.match(showreel, /动能大字|kinetic/);
    const showreelCar = buildH3ShotRecipePrompt({
      mode: "h3-showreel",
      conceptMode: false,
      product: "ARC EV sedan",
      hasReferenceVideo: true,
      showreelScheme: "car-cinematic",
    });
    assert.match(showreelCar, /Car cinematic|汽车|夜色|光轨/);
    const showreelKb = buildH3ShotRecipePrompt({
      mode: "h3-showreel",
      conceptMode: false,
      product: "mech keyboard",
      hasReferenceVideo: true,
      showreelScheme: "keyboard-tech",
    });
    assert.match(showreelKb, /Keyboard tech|键帽|RGB/);
    assert.equal(parseH3ShowreelSchemePick("car-cinematic"), "car-cinematic");
    assert.equal(parseH3ShowreelSchemePick("nope"), "auto");
    assert.equal(
      resolveH3ShowreelScheme({ pick: "auto", product: "BMW sedan" }),
      "car-cinematic",
    );
    assert.equal(
      resolveH3ShowreelScheme({ pick: "auto", product: "mechanical keyboard" }),
      "keyboard-tech",
    );
    assert.equal(
      resolveH3ShowreelScheme({
        pick: "auto",
        product: "brand mark",
        conceptMode: true,
      }),
      "abstract-morph",
    );
    assert.equal(parseH3SphereMgSchemePick("neon-core"), "neon-core");
    assert.equal(parseH3SphereMgSchemePick("nope"), "auto");
    assert.equal(
      resolveH3SphereMgScheme({ pick: "auto", product: "glass perfume" }),
      "crystal-glass",
    );
    assert.equal(
      resolveH3SphereMgScheme({ pick: "auto", product: "chrome watch" }),
      "chrome-spin",
    );
    assert.equal(
      resolveH3SphereMgScheme({
        pick: "auto",
        product: "brand mark",
        conceptMode: true,
      }),
      "matte-planet",
    );
    const sphere = buildH3ShotRecipePrompt({
      mode: "h3-sphere-mg",
      conceptMode: false,
      product: "ARC bottle",
      sphereMgScheme: "matte-planet",
    });
    assert.match(sphere, /球体|Matte planet|哑光/);
    assert.match(sphere, /ARC bottle/);
    assert.match(sphere, /@Image1/);
    const sphereStill = buildH3ShotRecipeStillPrompt({
      mode: "h3-sphere-mg",
      conceptMode: false,
      product: "ARC bottle",
      sphereMgScheme: "crystal-glass",
    });
    assert.match(sphereStill, /crystal|sphere|glass/i);
    assert.match(sphereStill, /ARC bottle/);
    const movieTitle = buildH3ShotRecipePrompt({
      mode: "h3-movie-title",
      conceptMode: false,
      product: "NOVA serum",
    });
    assert.match(movieTitle, /电影标题|多格|标题/);
    assert.match(movieTitle, /NOVA serum/);
    const lifestyle = buildH3ShotRecipePrompt({
      mode: "h3-lifestyle",
      conceptMode: false,
      product: "NOVA bottle",
    });
    assert.match(lifestyle, /生活人物|生活场景/);
    assert.match(lifestyle, /NOVA bottle/);
    const showreelStill = buildH3ShotRecipeStillPrompt({
      mode: "h3-showreel",
      conceptMode: false,
      product: "NOVA phone",
      showreelAspect: "16:9",
      showreelScheme: "abstract-morph",
    });
    assert.match(showreelStill, /16:9/);
    assert.match(showreelStill, /abstract-morph|void/i);
    assert.match(showreelStill, /NOVA phone/);
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
        hasLifestyleStill: true,
      }),
      false,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "h3-lifestyle",
        promotionMode: "concept",
        hasProductPhoto: true,
        hasReferenceVideo: false,
        hasConceptHero: true,
        hasLifestyleStill: true,
      }),
      false,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "h3-showreel",
        promotionMode: "concept",
        hasProductPhoto: false,
        hasReferenceVideo: true,
        hasConceptHero: true,
        hasLifestyleStill: false,
      }),
      true,
    );
    assert.equal(
      h3ShotRecipeInputsReady({
        mode: "h3-showreel",
        promotionMode: "concept",
        hasProductPhoto: false,
        hasReferenceVideo: false,
        hasConceptHero: true,
      }),
      false,
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
    assert.equal(
      h3ShotModesForPromotion("concept").includes("food-bullet-time"),
      false,
    );
    assert.equal(
      h3ShotModesForPromotion("concept").includes("h3-lifestyle"),
      false,
    );
    assert.equal(
      h3ShotModesForPromotion("concept").length,
      H3_SHOT_RECIPE_MODES.filter(
        (m) => m !== "food-bullet-time" && m !== "h3-lifestyle",
      ).length,
    );
    assert.equal(h3ShotModesForPromotion("physical").includes("food-bullet-time"), true);
    assert.equal(h3ShotModesForPromotion("physical").includes("h3-lifestyle"), true);
    assert.equal(h3ShotModesForPromotion("concept").includes("ecom-orbit"), true);
    assert.equal(h3ShotModesForPromotion("concept").includes("c4d-motion"), true);
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
      ["product-c4d-motion-8s", "c4d-motion", "c4d_motion"],
      ["product-h3-showreel-8s", "h3-showreel", "h3_showreel"],
      ["product-h3-sphere-mg-8s", "h3-sphere-mg", "h3_sphere_mg"],
      ["product-h3-movie-title-8s", "h3-movie-title", "h3_movie_title"],
      ["product-h3-lifestyle-8s", "h3-lifestyle", "h3_lifestyle"],
      ["concept-beauty-mv-10s", "beauty-mv", "beauty_mv"],
      ["concept-imitate-ad-8s", "imitate-ad", "imitate_ad"],
      ["concept-neon-on-real-8s", "neon-on-real", "neon_on_real"],
      ["concept-c4d-motion-8s", "c4d-motion", "c4d_motion"],
      ["concept-h3-showreel-8s", "h3-showreel", "h3_showreel"],
      ["concept-h3-sphere-mg-8s", "h3-sphere-mg", "h3_sphere_mg"],
      ["concept-h3-movie-title-8s", "h3-movie-title", "h3_movie_title"],
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
    assert.match(wizard, /case "c4d-motion":/);
    assert.match(wizard, /case "h3-showreel":/);
    assert.match(wizard, /case "h3-sphere-mg":/);
    assert.match(wizard, /case "h3-movie-title":/);
    assert.match(wizard, /case "h3-lifestyle":/);
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
    assert.match(fn, /H3_SHOWREEL_NEGATIVE|h3ShotRecipeAllowsKineticType|h3ShowreelAspect/);
    assert.match(fn, /resolveH3ShowreelScheme|h3ShowreelSchemePick/);
    assert.match(fn, /resolveH3SphereMgScheme|h3SphereMgSchemePick/);
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
