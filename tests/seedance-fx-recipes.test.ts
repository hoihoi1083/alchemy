import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVacuumInflateStillPrompt,
  buildVacuumInflateVideoPrompt,
  VACUUM_INFLATE_DURATION_SEC,
} from "../lib/vacuum-inflate";
import {
  buildCreativeMotionStillPrompt,
  buildCreativeMotionVideoPrompt,
  CREATIVE_MOTION_DURATION_SEC,
  CREATIVE_MOTION_SCHEME_IDS,
  parseCreativeMotionSchemePick,
  resolveCreativeMotionScheme,
} from "../lib/creative-motion";
import {
  buildHandThrowSceneStillPrompt,
  buildHandThrowSceneVideoPrompt,
  HAND_THROW_SCENE_DURATION_SEC,
} from "../lib/hand-throw-scene";
import {
  buildProductExplodeStillPrompt,
  buildProductExplodeVideoPrompt,
  PRODUCT_EXPLODE_DURATION_SEC,
} from "../lib/product-explode";
import {
  isLandingRecipeId,
  LANDING_RECIPES,
  microContextForLandingRecipe,
} from "../lib/landing-recipes";
import {
  isRecipeOwnedVideoMode,
  recipeUsesSilentSeedance,
} from "../lib/creative-workflow";

describe("vacuum-inflate Seedance recipe", () => {
  it("builds flat→inflated stills and a 4s video prompt", () => {
    const start = buildVacuumInflateStillPrompt({
      product: "ARC pouch",
      frame: "start",
    });
    const end = buildVacuumInflateStillPrompt({
      product: "ARC pouch",
      frame: "end",
    });
    assert.match(start, /vacuum|flat|wrinkl/i);
    assert.match(end, /INFLAT|plump|air|bubble/i);
    assert.match(start, /ARC pouch/);
    assert.match(end, /ARC pouch/);
    assert.match(start, /@Image1/);
    assert.match(start, /foil sachet|do NOT convert/i);
    const video = buildVacuumInflateVideoPrompt({ product: "ARC pouch" });
    assert.match(video, /Image 1/);
    assert.match(video, /Image 2/);
    assert.match(video, /VISIBLE/i);
    assert.match(video, new RegExp(String(VACUUM_INFLATE_DURATION_SEC)));
  });

  it("keeps a rigid SKU as the hero inside the wrap, not a replacement pack", () => {
    const start = buildVacuumInflateStillPrompt({
      product: "orange smartphone",
      frame: "start",
    });
    const video = buildVacuumInflateVideoPrompt({
      product: "orange smartphone",
    });
    assert.match(start, /orange smartphone/);
    assert.match(start, /@Image1/);
    assert.match(start, /transparent|clear|film|bubble/i);
    assert.match(start, /phone, bottle, box, device/);
    assert.match(video, /orange smartphone/);
    assert.match(video, /sachet|different SKU/i);
  });
});

describe("creative-motion Seedance recipe", () => {
  it("covers all schemes with identity lock", () => {
    assert.equal(CREATIVE_MOTION_SCHEME_IDS.length, 6);
    for (const scheme of CREATIVE_MOTION_SCHEME_IDS) {
      const start = buildCreativeMotionStillPrompt({
        scheme,
        product: "LIMELIGHT tube",
        frame: "start",
      });
      const end = buildCreativeMotionStillPrompt({
        scheme,
        product: "LIMELIGHT tube",
        frame: "end",
      });
      assert.match(start, /LIMELIGHT tube/);
      assert.match(end, /LIMELIGHT tube/);
      assert.match(start, /START|start/i);
      const video = buildCreativeMotionVideoPrompt({
        scheme,
        product: "LIMELIGHT tube",
      });
      assert.match(video, /Image 1/);
      assert.match(video, /Image 2/);
      assert.match(video, new RegExp(String(CREATIVE_MOTION_DURATION_SEC)));
    }
    assert.equal(parseCreativeMotionSchemePick("cap-rays"), "cap-rays");
    assert.equal(parseCreativeMotionSchemePick("nope"), "auto");
    assert.equal(
      resolveCreativeMotionScheme({ pick: "auto", product: "lemon tea" }),
      "juice-burst",
    );
  });
});

describe("hand-throw-scene Seedance recipe", () => {
  it("builds palm miniature → real scene stills and a 6s video prompt", () => {
    const start = buildHandThrowSceneStillPrompt({
      product: "ARC tower",
      frame: "start",
    });
    const end = buildHandThrowSceneStillPrompt({
      product: "ARC tower",
      frame: "end",
    });
    assert.match(start, /palm|miniature|MINIATURE/i);
    assert.match(end, /FULL-SCALE|real-world|scenic/i);
    assert.match(start, /IMAGE 1 pixels are the ONLY identity/i);
    assert.match(start, /never swap category/i);
    const nameVsPhoto = buildHandThrowSceneStillPrompt({
      product: "Vitamin C serum",
      frame: "start",
    });
    assert.match(nameVsPhoto, /NAME VS PHOTO/);
    assert.match(nameVsPhoto, /Vitamin C serum/);
    assert.match(nameVsPhoto, /@Image1/);
    assert.doesNotMatch(nameVsPhoto, /MINIATURE model of Vitamin C serum/i);
    const video = buildHandThrowSceneVideoPrompt({ product: "Vitamin C serum" });
    assert.match(video, /NAME VS PHOTO/);
    assert.match(video, /Image 1/);
    assert.match(video, /Image 2/);
    assert.match(video, new RegExp(String(HAND_THROW_SCENE_DURATION_SEC)));
  });
});

describe("product-explode H3 recipe", () => {
  it("builds intact → floating-parts stills and a 4s video prompt", () => {
    const start = buildProductExplodeStillPrompt({
      product: "LIMELIGHT buds",
      frame: "start",
    });
    const end = buildProductExplodeStillPrompt({
      product: "LIMELIGHT buds",
      frame: "end",
    });
    assert.match(start, /intact|packshot|hero|assembled/i);
    assert.match(start, /SEATED|wells/i);
    assert.doesNotMatch(start, /floating slightly above the case/i);
    assert.match(end, /explod|teardown|assembly axes/i);
    assert.match(end, /NOT unboxing|empty shell/i);
    assert.match(end, /never swap to earbuds\/power bank/i);
    assert.match(end, /liquid-metal|mercury/i);
    assert.match(start, /LIMELIGHT buds/);
    assert.match(end, /LIMELIGHT buds/);
    const video = buildProductExplodeVideoPrompt({ product: "LIMELIGHT buds" });
    assert.match(video, /Image 1/);
    assert.match(video, /Image 2/);
    assert.match(video, /TEARDOWN|assembly axes/i);
    assert.match(video, /FORBIDDEN|unboxing|third earbud/i);
    assert.match(video, new RegExp(String(PRODUCT_EXPLODE_DURATION_SEC)));
    const stillNameVsPhoto = buildProductExplodeStillPrompt({
      product: "Vitamin C serum",
      frame: "start",
    });
    assert.match(stillNameVsPhoto, /NAME VS PHOTO/);
    assert.match(stillNameVsPhoto, /Vitamin C serum/);
    assert.match(stillNameVsPhoto, /@Image1/);
    assert.doesNotMatch(stillNameVsPhoto, /same Vitamin C serum outer shell/);
    const endStill = buildProductExplodeStillPrompt({
      product: "Vitamin C serum",
      frame: "end",
    });
    assert.match(endStill, /never swap to earbuds\/power bank/i);
  });
});

describe("Seedance fx landing recipes", () => {
  it("deep-links vacuum + creative-motion + hand-throw + explode to video-only", () => {
    for (const id of [
      "product-vacuum-inflate-4s",
      "product-creative-motion-4s",
      "product-hand-throw-scene-6s",
      "product-web-boundary-break-10s",
      "product-product-explode-4s",
      "concept-vacuum-inflate-4s",
      "concept-creative-motion-4s",
      "concept-hand-throw-scene-6s",
      "concept-web-boundary-break-10s",
      "concept-product-explode-4s",
    ] as const) {
      assert.equal(isLandingRecipeId(id), true);
      assert.equal(LANDING_RECIPES[id].workflowMode, "video-only");
      assert.equal(isRecipeOwnedVideoMode(LANDING_RECIPES[id].videoCreativeMode), true);
      const ctx = microContextForLandingRecipe(id);
      assert.equal(ctx.workflowMode, "video-only");
      assert.ok(ctx.videoSubpath);
    }
    assert.equal(LANDING_RECIPES["product-vacuum-inflate-4s"].videoCreativeMode, "vacuum-inflate");
    assert.equal(
      LANDING_RECIPES["product-creative-motion-4s"].videoCreativeMode,
      "creative-motion",
    );
    assert.equal(
      LANDING_RECIPES["product-hand-throw-scene-6s"].videoCreativeMode,
      "hand-throw-scene",
    );
    assert.equal(
      LANDING_RECIPES["product-product-explode-4s"].videoCreativeMode,
      "product-explode",
    );
    assert.equal(LANDING_RECIPES["product-vacuum-inflate-4s"].duration, "4");
    assert.equal(LANDING_RECIPES["product-creative-motion-4s"].duration, "4");
    assert.equal(LANDING_RECIPES["product-hand-throw-scene-6s"].duration, "6");
    assert.equal(LANDING_RECIPES["product-product-explode-4s"].duration, "4");
    assert.equal(
      microContextForLandingRecipe("product-hand-throw-scene-6s").videoSubpath,
      "hand_throw_scene",
    );
    assert.equal(
      microContextForLandingRecipe("product-product-explode-4s").videoSubpath,
      "product_explode",
    );
  });

  it("marks H3-first FX as native audio (Seedance fallback mixes BGM in the wizard)", () => {
    assert.equal(recipeUsesSilentSeedance("product-explode"), false);
    assert.equal(recipeUsesSilentSeedance("social-drip"), false);
    assert.equal(recipeUsesSilentSeedance("blockbuster"), false);
    assert.equal(recipeUsesSilentSeedance("vacuum-inflate"), false);
    assert.equal(recipeUsesSilentSeedance("creative-motion"), false);
    assert.equal(recipeUsesSilentSeedance("hand-throw-scene"), false);
    assert.equal(recipeUsesSilentSeedance("web-boundary-break"), false);
    assert.equal(recipeUsesSilentSeedance("motion-poster"), false);
    assert.equal(recipeUsesSilentSeedance("h3-lifestyle"), false);
  });

  it("start-end FX try MiniMax H3 then Seedance fallback", () => {
    const wizard = readFileSync(
      join(process.cwd(), "hooks/useStudioWizard.ts"),
      "utf8",
    );
    const helper = wizard.slice(
      wizard.indexOf("async function generateStartEndFxVideo"),
      wizard.indexOf("async function makeVacuumInflateVideo"),
    );
    assert.match(helper, /generate-minimax-h3/);
    assert.match(helper, /\/api\/generate"/);
    assert.match(helper, /addBgm/);
    assert.match(helper, /401|402|403/);
    for (const [name, until] of [
      ["makeVacuumInflateVideo", "async function generateCreativeMotionKeyframe"],
      ["makeCreativeMotionVideo", "async function generateHandThrowSceneKeyframe"],
      ["makeHandThrowSceneVideo", "async function generateProductExplodeKeyframe"],
      ["makeProductExplodeVideo", "async function makeImageToVideo"],
    ] as const) {
      const start = wizard.indexOf(`async function ${name}`);
      const end = wizard.indexOf(until, start);
      assert.ok(start >= 0 && end > start, name);
      assert.match(wizard.slice(start, end), /generateStartEndFxVideo/);
    }
  });
});