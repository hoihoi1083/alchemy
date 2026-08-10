import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignTvcRolesToScenes,
  buildMotionPosterPrompt,
  coerceTvcShotRole,
  DEFAULT_STORYBOARD_SCENE_COUNT,
  lookBibleSummaryLine,
  localizeTvcShotRole,
  normalizeLookBible,
  storyboardTvcRolesPlannerLines,
  tvcRolesForSceneCount,
} from "../lib/shot-recipes";
import { resolveVideoGenerationKind } from "../lib/video-generation-path";
import { buildReelStoryboardPlanPromptForTest } from "../lib/video-storyboard-plan";
import { LANDING_RECIPES } from "../lib/landing-recipes";
import type { ResearchReelAnalysis } from "../lib/reel-analysis-types";

describe("shot-recipes", () => {
  it("defaults storyboard scene count to 4", () => {
    assert.equal(DEFAULT_STORYBOARD_SCENE_COUNT, 4);
    assert.match(
      storyboardTvcRolesPlannerLines(4).join("\n"),
      /Prefer EXACTLY 4 scenes/,
    );
  });

  it("builds motion poster prompt that locks product and forbids HOOK rewrite", () => {
    const p = buildMotionPosterPrompt({
      product: "jade bottle",
      headline: "Calm night",
      durationSec: 6,
      mode: "loop",
      dialect: "card-warp",
    });
    assert.match(p, /Motion poster|動態海報/i);
    assert.match(p, /@Image1/);
    assert.match(p, /FORBIDDEN/);
    assert.match(p, /TEXTLESS FRAME/i);
    assert.match(p, /3D|card warp|paper/i);
    assert.doesNotMatch(p, /HOOK→DEMO→CTA invent/i);
    assert.match(p, /HERO MOTION REQUIRED/i);
    assert.match(p, /Dialect motions/i);
  });

  it("start-end poster prompt interpolates typed Image 2", () => {
    const p = buildMotionPosterPrompt({
      product: "jade bottle",
      headline: "Calm night",
      durationSec: 6,
      mode: "start-end",
      dialect: "light-sweep",
    });
    assert.match(p, /Image 2/i);
    assert.match(p, /typed end poster|exact headline|首尾帧/i);
    assert.match(p, /masthead/i);
    assert.doesNotMatch(p, /TEXTLESS FRAME/);
  });

  it("builds concept motion poster without SKU packshot language", () => {
    const p = buildMotionPosterPrompt({
      product: "spa facial",
      headline: "Deep calm",
      durationSec: 6,
      mode: "loop",
      conceptMode: true,
      dialect: "scene-breathe",
    });
    assert.match(p, /CONCEPT \/ SERVICE/i);
    assert.match(p, /Designed motion poster|textless poster/i);
    assert.doesNotMatch(p, /logo geometry/i);
    assert.match(p, /FORBIDDEN/);
  });

  it("normalizes look bible", () => {
    const b = normalizeLookBible({
      palette: "black gold",
      lighting: "rim",
      materials: "matte",
      negatives: "no CG",
    });
    assert.match(lookBibleSummaryLine(b), /Palette: black gold/);
  });

  it("hard-maps padded scene-N roles onto TVC vocabulary", () => {
    assert.deepEqual(tvcRolesForSceneCount(4), [
      "establish",
      "macro",
      "orbit",
      "payoff",
    ]);
    assert.equal(coerceTvcShotRole("scene-3", 2, 4), "orbit");
    const assigned = assignTvcRolesToScenes([
      { role: "scene-1" },
      { role: "weird" },
      { role: "logo" },
      { role: "payoff" },
    ]);
    assert.deepEqual(
      assigned.map((s) => s.role),
      ["establish", "macro", "logo-trace", "payoff"],
    );
  });

  it("localizes TVC role slugs and leaves unknown roles intact", () => {
    const zh = {
      establish: "開場建立",
      macro: "細節特寫",
      "logo-trace": "Logo 掃光",
      orbit: "環繞運鏡",
      lifestyle: "生活場景",
      payoff: "收束／行動",
    };
    assert.equal(localizeTvcShotRole("establish", zh), "開場建立");
    assert.equal(localizeTvcShotRole("payoff", zh), "收束／行動");
    assert.equal(localizeTvcShotRole("custom-beat", zh), "custom-beat");
  });
});

describe("reel storyboard planner parity", () => {
  it("requires lookBible + lightingEn + TVC roles like product storyboard", () => {
    const analysis: ResearchReelAnalysis = {
      durationSec: 8,
      frameCount: 1,
      visualDirection: "cool teal rim light",
      motionSummary: "push then orbit",
      seedancePrompt: "Follow @Video1",
      productionNotesZh: "",
      shots: [
        {
          index: 1,
          timeSec: 0,
          sceneSummary: "hero open",
          layoutStyle: "centered",
          motionHint: "push-in",
          subjects: "bottle",
          visibleText: "",
        },
      ],
    };
    const prompt = buildReelStoryboardPlanPromptForTest({
      analysis,
      product: "jade bottle",
      business: "",
      headline: "Calm night",
      subline: "",
      offer: "",
      promptExtra: "",
      durationSec: 12,
      sceneCountTarget: "4",
      market: "hk",
      framing: "auto",
      layoutTransfer: false,
      artStyleId: "realistic",
    });
    assert.match(prompt, /lookBible/);
    assert.match(prompt, /lightingEn/);
    assert.match(prompt, /establish/);
    assert.match(prompt, /MiniMax H3/);
    assert.match(prompt, /@Image1|product identity|OBJECT/i);
  });
});

describe("landing recipe smoke (no fal)", () => {
  it("motion-poster and product-tvc map to finishable wizard settings", () => {
    assert.equal(LANDING_RECIPES["motion-poster"].videoCreativeMode, "motion-poster");
    assert.equal(LANDING_RECIPES["motion-poster"].workflowMode, "video-only");
    assert.equal(LANDING_RECIPES["product-tvc-12s"].visualStyleId, "storyboard-video");
    assert.equal(LANDING_RECIPES["product-tvc-12s"].storyboardSceneCount, "4");
    assert.equal(LANDING_RECIPES["concept-motion-poster"].promotionMode, "concept");
    assert.equal(LANDING_RECIPES["concept-motion-poster"].workflowMode, "video-only");
    assert.equal(LANDING_RECIPES["concept-tvc-12s"].promotionMode, "concept");
  });
});

describe("resolveVideoGenerationKind motion-poster", () => {
  it("routes motion-poster creative mode to motion-poster kind", () => {
    assert.equal(
      resolveVideoGenerationKind({
        usesCompositor: false,
        isStoryboardOutput: false,
        isUgcPresenterOutput: false,
        shouldCinematicStitch: false,
        isConceptCinematicSingleOutput: false,
        cinematicSceneCount: 1,
        cinematicScenesLength: 0,
        usesProductAssistant: false,
        conceptTextVideoReady: false,
        videoCreativeMode: "motion-poster",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "motion-poster",
    );
  });

  it("wins over storyboard lock when motion-poster is selected", () => {
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
        videoCreativeMode: "motion-poster",
        useReferenceVideo: false,
        hasReferenceAd: false,
        useMultiAngleVideo: false,
      }),
      "motion-poster",
    );
  });
});
