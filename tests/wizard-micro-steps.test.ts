import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import graph from "../lib/wizard-micro-steps.graph.json";
import {
  canProceedMicroStep,
  microStepLegacyKey,
  resolveMicroSteps,
  resolvePathId,
  resumeStepIndex,
  type WizardMicroStepState,
} from "../lib/wizard-micro-steps";
import type { MicroStepId, MicroWizardContext, MicroWizardPathId } from "../lib/wizard-micro-steps.types";

const RENDERER = fs.readFileSync("components/studio/micro-wizard/MicroStepRenderer.tsx", "utf8");
const RENDERER_CASES = new Set(
  [...RENDERER.matchAll(/case "([^"]+)":/g)].map((m) => m[1] as MicroStepId),
);

function baseState(overrides: Partial<WizardMicroStepState> = {}): WizardMicroStepState {
  return {
    workflowMode: "image-only",
    promotionMode: "physical",
    visualStyleId: "product",
    imageOutputMode: "single",
    imageRefPhoto: null,
    productPhoto: null,
    referenceAd: null,
    referenceIsVideo: false,
    product: "手鏈",
    conceptIdea: "瑜伽班",
    headline: "測試標題",
    subline: "",
    offer: "",
    business: "",
    creativeVideoBrief: "",
    storyboardBrief: "",
    brandWebsiteUrl: "",
    brandProfile: null,
    cinematicStitchReel: false,
    cinematicSceneCount: 1,
    videoCreativeMode: "product-promo",
    videoSettingsDuration: "8",
    referenceAnalyzeBusy: false,
    brandAnalyzeBusy: false,
    researchReelAnalyzeBusy: false,
    researchReelDownloadBusy: false,
    referenceClipLoading: false,
    imageBusy: false,
    videoBusy: false,
    imageUrl: null,
    videoUrl: null,
    promptExtra: "",
    contentResearchApplied: false,
    shipItEligible: false,
    hasGeneratedImage: false,
    userReferenceBrief: null,
    referenceAnalyzeNote: null,
    planProductVideoBusy: false,
    planVideoPromptBusy: false,
    ...overrides,
  };
}

const PATH_CONTEXTS: Record<MicroWizardPathId, MicroWizardContext> = {
  product_image_research: { promotionMode: "physical", workflowMode: "image-only", intakePath: "research" },
  product_image_direct: { promotionMode: "physical", workflowMode: "image-only", intakePath: "direct" },
  concept_image_research: {
    promotionMode: "concept",
    workflowMode: "image-only",
    intakePath: "research",
    conceptSource: "research",
  },
  concept_image_direct: {
    promotionMode: "concept",
    workflowMode: "image-only",
    intakePath: "direct",
    conceptSource: "assistant",
  },
  product_video_research_reel: { promotionMode: "physical", workflowMode: "video-only", intakePath: "research" },
  product_video_direct: {
    promotionMode: "physical",
    workflowMode: "video-only",
    intakePath: "direct",
    videoSubpath: "product_promo",
  },
  product_combined: { promotionMode: "physical", workflowMode: "combined", intakePath: "direct" },
  concept_video_research_reel: { promotionMode: "concept", workflowMode: "video-only", intakePath: "research" },
  concept_video_direct: {
    promotionMode: "concept",
    workflowMode: "video-only",
    intakePath: "direct",
    videoSubpath: "creative_video",
  },
  concept_combined_cinematic: {
    promotionMode: "concept",
    workflowMode: "combined",
    intakePath: "direct",
    combinedStyle: "cinematic",
  },
  concept_combined: {
    promotionMode: "concept",
    workflowMode: "combined",
    intakePath: "direct",
    conceptSource: "assistant",
    combinedStyle: "storyboard",
  },
};

describe("wizard v2 parity audit", () => {
  it("every graph step (except entry.start) has a renderer case", () => {
    const graphIds = new Set<MicroStepId>();
    for (const path of Object.values(graph.paths)) {
      if (!("steps" in path) || !path.steps) continue;
      for (const step of path.steps) {
        if (!step.id || step.id.startsWith("MERGE_") || step.id === "IMAGE_STORYBOARD_BRANCH") continue;
        graphIds.add(step.id as MicroStepId);
      }
    }
    graphIds.delete("entry.start");
    const missing = [...graphIds].filter((id) => !RENDERER_CASES.has(id)).sort();
    assert.deepEqual(missing, [], `Missing renderer for: ${missing.join(", ")}`);
  });

  for (const [pathId, ctx] of Object.entries(PATH_CONTEXTS) as Array<[MicroWizardPathId, MicroWizardContext]>) {
    it(`${pathId} resolves steps with handlers and gates`, () => {
      const state = baseState({
        promotionMode: ctx.promotionMode ?? "physical",
        workflowMode: ctx.workflowMode ?? "image-only",
        visualStyleId:
          pathId === "concept_combined_cinematic"
            ? "concept-cinematic"
            : pathId === "product_combined" || pathId === "concept_combined"
              ? "storyboard-video"
              : baseState().visualStyleId,
        promptExtra:
          ctx.intakePath === "research" && ctx.workflowMode === "image-only"
            ? "STYLE_REFERENCE_ONLY"
            : "",
      });
      assert.equal(resolvePathId(ctx, state), pathId);
      const steps = resolveMicroSteps(ctx, state);
      assert.ok(steps.length > 0, `${pathId} has no steps`);
      for (const step of steps) {
        assert.ok(RENDERER_CASES.has(step.id), `${pathId} step ${step.id} missing renderer`);
        assert.doesNotThrow(() => canProceedMicroStep(step.id, ctx, state));
      }
    });
  }

  it("fresh physical entry shows output goal before intake", () => {
    const steps = resolveMicroSteps({ promotionMode: "physical" }, baseState());
    assert.deepEqual(steps.map((s) => s.id), ["route.output_goal"]);
  });

  it("resumeStepIndex lands on first path step after routing", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    assert.equal(steps[resumeStepIndex(steps)]?.id, "setup.pre_generate");
  });

  it("product image direct fuses post-intake into setup.pre_generate like research", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("route.intake"));
    assert.ok(ids.includes("identity.product_name"));
    assert.equal(ids[ids.indexOf("setup.pre_generate") - 1], "route.intake");
    assert.ok(!ids.includes("route.primary_style"));
    assert.ok(!ids.includes("asset.reference_image"));
    assert.ok(!ids.includes("wait.reference_analyze"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("image.options"));
    assert.ok(!ids.includes("image.generate"));
    assert.ok(ids.includes("wait.image_generate"));
    assert.ok(ids.includes("image.review"));
  });

  it("product image research fuses post-intake into setup.pre_generate", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promptExtra: "STYLE_REFERENCE_ONLY",
        imageRefPhoto: {} as File,
        contentResearchApplied: true,
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("route.intake"));
    assert.ok(ids.includes("identity.product_name"));
    assert.equal(ids[ids.indexOf("setup.pre_generate") - 1], "route.intake");
    assert.ok(!ids.includes("wait.reference_analyze"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("image.options"));
    assert.ok(!ids.includes("image.generate"));
    assert.ok(ids.includes("wait.image_generate"));
    assert.ok(ids.includes("image.review"));
    const pre = steps.find((s) => s.id === "setup.pre_generate");
    assert.equal(pre?.skippable, false);
  });

  it("concept image research fuses post-research into setup.pre_generate like product", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promotionMode: "concept",
        promptExtra: "STYLE_REFERENCE_ONLY",
        imageRefPhoto: {} as File,
        contentResearchApplied: true,
        conceptIdea: "春日保養攻略",
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("identity.concept_topic"));
    assert.ok(ids.includes("route.intake"));
    assert.equal(ids[ids.indexOf("setup.pre_generate") - 1], "route.intake");
    assert.ok(!ids.includes("wait.reference_analyze"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("asset.reference_image"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("image.options"));
    assert.ok(!ids.includes("image.generate"));
    assert.ok(ids.includes("wait.image_generate"));
    assert.ok(ids.includes("image.review"));
  });

  it("concept image direct fuses into setup.pre_generate like product direct", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "direct",
      conceptSource: "assistant",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promotionMode: "concept",
        visualStyleId: "info-poster",
        conceptIdea: "私人貸款",
        headline: "快速批核",
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("identity.concept"));
    assert.ok(ids.includes("route.intake"));
    assert.equal(ids[ids.indexOf("setup.pre_generate") - 1], "route.intake");
    assert.ok(!ids.includes("route.primary_style"));
    assert.ok(!ids.includes("asset.reference_image"));
    assert.ok(!ids.includes("wait.reference_analyze"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("image.options"));
    assert.ok(!ids.includes("image.generate"));
    assert.ok(ids.includes("wait.image_generate"));
    assert.ok(ids.includes("image.review"));
  });

  it("product image direct fuses into setup.pre_generate (not discrete steps)", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("asset.reference_image"));
  });

  it("does not inject image.art_style when setup.pre_generate fuses options", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ promptExtra: "STYLE_REFERENCE_ONLY", imageRefPhoto: {} as File }),
    );
    assert.ok(steps.some((s) => s.id === "setup.pre_generate"));
    assert.ok(!steps.some((s) => s.id === "image.art_style"));
  });

  it("skips image.output_format only for model-wear on concept research", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promotionMode: "concept",
        visualStyleId: "model-wear",
        promptExtra: "STYLE_REFERENCE_ONLY",
        imageRefPhoto: {} as File,
      }),
    );
    assert.ok(!steps.some((s) => s.id === "image.output_format"));
  });

  it("path 5 video-only does not include storyboard brief", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    assert.ok(!steps.some((s) => s.id === "copy.storyboard_brief"));
    assert.ok(!steps.some((s) => s.id === "image.storyboard_scenes"));
  });

  it("path 5 combined fuses storyboard into violet setup", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ visualStyleId: "storyboard-video", promptExtra: "STYLE_REFERENCE_ONLY" }),
    );
    const ids = steps.map((s) => s.id);
    const setupIdx = ids.indexOf("setup.pre_generate");
    const waitIdx = ids.indexOf("wait.storyboard_generate");
    const reviewIdx = ids.indexOf("image.review");
    const videoSetupIdx = ids.indexOf("setup.pre_video");
    assert.ok(setupIdx >= 0);
    assert.ok(waitIdx > setupIdx);
    assert.ok(reviewIdx > waitIdx);
    assert.ok(videoSetupIdx > reviewIdx);
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("image.storyboard_scenes"));

    const withReel = resolveMicroSteps(
      ctx,
      baseState({
        visualStyleId: "storyboard-video",
        promptExtra: "STYLE_REFERENCE_ONLY",
        referenceAd: { name: "r.mp4" } as File,
        referenceIsVideo: true,
      }),
    ).map((s) => s.id);
    const refIdx = withReel.indexOf("asset.reference_video");
    const setupWithReel = withReel.indexOf("setup.pre_generate");
    assert.ok(refIdx >= 0 && refIdx < setupWithReel);
  });

  it("path 5 combined keeps fused storyboard after setup even without storyboard style yet", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const ids = resolveMicroSteps(ctx, baseState({ visualStyleId: "product" })).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("asset.reference_video"));
  });

  it("path 2 direct analyzes optional ref inside setup.pre_generate (no separate wait step)", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState({ imageRefPhoto: {} as File }));
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(!ids.includes("wait.reference_analyze"));
  });

  it("path 6 product_promo fuses style + generate into setup.pre_video", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "product_promo",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("route.video_subpath"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("video.ai_prompt"));
    assert.ok(!steps.some((s) => s.id === "copy.storyboard_brief"));
  });

  it("path 6 ugc_presenter is out of scope — fused video-only without ugc pack", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "ugc_presenter",
    };
    const state = baseState({ visualStyleId: "ugc-presenter", workflowMode: "video-only" });
    assert.equal(resolvePathId(ctx, state), "product_video_direct");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(ids.includes("wait.video_generate"));
    assert.ok(ids.includes("done.export"));
    assert.ok(!ids.includes("video.ugc_pack"));
    assert.ok(!ids.includes("image.generate"));
  });

  it("done.export stays in micro-wizard (no classic DoneStep handoff)", () => {
    assert.equal(microStepLegacyKey("done.export"), null);
    assert.equal(microStepLegacyKey("image.review"), null);
  });

  it("video-only direct without subpath lands on fused setup.pre_video", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState({ workflowMode: "video-only" }));
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("route.video_subpath"));
    assert.ok(ids.includes("route.intake"));
  });

  it("product video direct promo fuses into setup.pre_video", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "product_promo",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        workflowMode: "video-only",
        visualStyleId: "product",
        videoCreativeMode: "product-promo",
        productPhoto: {} as File,
        headline: "測試標題",
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("asset.product_photo"));
    assert.ok(!ids.includes("video.ai_prompt"));
    assert.ok(!ids.includes("video.settings"));
    assert.ok(!ids.includes("video.generate"));
    assert.ok(ids.includes("wait.video_generate"));
    assert.ok(ids.includes("done.export"));
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          productPhoto: {} as File,
          headline: "測試",
          product: "手鏈",
        }),
      ),
      null,
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          productPhoto: null,
          headline: "測試",
        }),
      ),
      "need_product_photo",
    );
  });

  it("concept video direct creative fuses into setup.pre_video", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "creative_video",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        workflowMode: "video-only",
        promotionMode: "concept",
        visualStyleId: "creative-video",
        conceptIdea: "私人貸款",
        creativeVideoBrief: "溫暖生活感運鏡",
        headline: "",
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("copy.creative_brief"));
    assert.ok(!ids.includes("video.ai_prompt"));
    assert.ok(!ids.includes("video.generate"));
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          promotionMode: "concept",
          visualStyleId: "creative-video",
          conceptIdea: "私人貸款",
          creativeVideoBrief: "溫暖運鏡",
          headline: "",
          productPhoto: null,
        }),
      ),
      null,
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          promotionMode: "concept",
          visualStyleId: "creative-video",
          conceptIdea: "私人貸款",
          creativeVideoBrief: "",
          headline: "",
        }),
      ),
      "need_creative_brief",
    );
  });

  it("blocks video plan steps while AI motion plan is busy", () => {
    assert.equal(
      canProceedMicroStep(
        "video.product_plan",
        { promotionMode: "physical", workflowMode: "video-only", videoSubpath: "product_promo" },
        baseState({ product: "serum", planProductVideoBusy: true }),
      ),
      "plan_video_busy",
    );
    assert.equal(
      canProceedMicroStep(
        "video.ai_prompt",
        { promotionMode: "concept", workflowMode: "video-only", videoSubpath: "creative_video" },
        baseState({
          promotionMode: "concept",
          workflowMode: "video-only",
          visualStyleId: "creative-video",
          planVideoPromptBusy: true,
        }),
      ),
      "plan_video_busy",
    );
  });

  it("product video research reel video-only fuses into setup.pre_video", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "research",
    };
    const state = baseState({
      workflowMode: "video-only",
      visualStyleId: "product",
      productPhoto: {} as File,
      headline: "測試",
      promptExtra: "Style reference (reel). Match layout only. Do NOT copy reference subject matter.",
      contentResearchApplied: true,
    });
    assert.equal(resolvePathId(ctx, state), "product_video_research_reel");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("video.generate"));
    assert.ok(ids.includes("wait.video_generate"));
  });

  it("video-only research setup.pre_video requires reference reel not product photo plan", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "research",
      videoSubpath: "reference_reel",
    };
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          productPhoto: {} as File,
          headline: "測試",
          referenceAd: null,
          referenceIsVideo: false,
        }),
      ),
      "need_reference_video",
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          headline: "測試",
          referenceAd: {} as File,
          referenceIsVideo: true,
        }),
      ),
      "need_product_photo",
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_video",
        ctx,
        baseState({
          workflowMode: "video-only",
          productPhoto: {} as File,
          headline: "測試",
          referenceAd: {} as File,
          referenceIsVideo: true,
        }),
      ),
      null,
    );
  });

  it("product_combined ignores sticky ugc style — storyboard fuse only", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const state = baseState({ visualStyleId: "ugc-presenter", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("video.ugc_pack"));
    assert.ok(!ids.includes("image.generate"));
  });

  it("product_combined uses fused violet setup not discrete storyboard handoff", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("copy.storyboard_brief"));
    assert.ok(!ids.includes("image.storyboard_scenes"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("route.primary_style"));
    assert.ok(!ids.includes("video.generate"));
    assert.equal(
      microStepLegacyKey("image.storyboard_scenes", { visualStyleId: "storyboard-video" }),
      null,
    );
  });

  it("product_combined keeps storyboard steps even if style drifted to product", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const ids = resolveMicroSteps(
      ctx,
      baseState({ visualStyleId: "product", workflowMode: "combined" }),
    ).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(ids.includes("done.export"));
  });

  it("combined research skips reel analyze without video and allows skip MP4", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const state = baseState({
      visualStyleId: "storyboard-video",
      workflowMode: "combined",
      referenceAd: null,
      referenceIsVideo: false,
      promptExtra: "STYLE_REFERENCE_ONLY",
      imageRefPhoto: { name: "ref.jpg" } as File,
    });
    const steps = resolveMicroSteps(ctx, state);
    const ids = steps.map((s) => s.id);
    assert.ok(!ids.includes("wait.reel_analyze"));
    // Image-only research: skip the MP4 step entirely.
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.equal(canProceedMicroStep("asset.reference_video", ctx, state), null);
  });

  it("skips MP4 step when referenceIsVideo flag is stuck true without a file", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const ids = resolveMicroSteps(
      ctx,
      baseState({
        visualStyleId: "storyboard-video",
        workflowMode: "combined",
        referenceAd: null,
        referenceIsVideo: true, // stale flag — no file
        promptExtra: "STYLE_REFERENCE_ONLY",
      }),
    ).map((s) => s.id);
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
  });

  it("product combined + research routes to research reel with fused storyboard", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const state = baseState({ visualStyleId: "product", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_video_research_reel");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(ids.indexOf("setup.pre_generate") < ids.indexOf("setup.pre_video"));
    assert.ok(!ids.includes("copy.storyboard_brief"));
    assert.ok(!ids.includes("image.storyboard_scenes"));
  });

  it("concept combined animate + direct is storyboard end-to-end", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      conceptSource: "assistant",
      combinedStyle: "storyboard",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "concept_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(ids.includes("done.export"));
    assert.ok(ids.indexOf("image.review") < ids.indexOf("setup.pre_video"));
  });

  it("concept combined research injects storyboard after reel setup", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "research",
      conceptSource: "research",
      combinedStyle: "storyboard",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "concept_video_research_reel");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.includes("image.review"));
    assert.ok(ids.includes("setup.pre_video"));
    assert.ok(ids.includes("done.export"));
    // Image-only research: no reel analyze. With a real MP4, analyze comes before fused setup.
    assert.ok(!ids.includes("wait.reel_analyze"));
    const withVideo = resolveMicroSteps(
      ctx,
      baseState({
        visualStyleId: "storyboard-video",
        workflowMode: "combined",
        referenceAd: { name: "r.mp4" } as File,
        referenceIsVideo: true,
      }),
    ).map((s) => s.id);
    assert.ok(withVideo.includes("asset.reference_video"));
    assert.ok(withVideo.includes("wait.reel_analyze"));
    assert.ok(withVideo.indexOf("wait.reel_analyze") < withVideo.indexOf("setup.pre_generate"));
  });

  it("combined matrix: product/concept × direct/research all stay in fused violet storyboard flow", () => {
    const matrix: Array<{
      name: string;
      ctx: MicroWizardContext;
      state?: Partial<ReturnType<typeof baseState>>;
      path: string;
    }> = [
      {
        name: "product direct",
        ctx: { promotionMode: "physical", workflowMode: "combined", intakePath: "direct" },
        path: "product_combined",
      },
      {
        name: "product research",
        ctx: { promotionMode: "physical", workflowMode: "combined", intakePath: "research" },
        path: "product_video_research_reel",
      },
      {
        name: "concept direct",
        ctx: {
          promotionMode: "concept",
          workflowMode: "combined",
          intakePath: "direct",
          conceptSource: "assistant",
          combinedStyle: "storyboard",
        },
        path: "concept_combined",
      },
      {
        name: "concept research",
        ctx: {
          promotionMode: "concept",
          workflowMode: "combined",
          intakePath: "research",
          conceptSource: "research",
          combinedStyle: "storyboard",
        },
        path: "concept_video_research_reel",
      },
    ];

    for (const row of matrix) {
      // Drifted style must still resolve as storyboard steps.
      const drifted = baseState({
        visualStyleId: "product",
        workflowMode: "combined",
        ...row.state,
      });
      assert.equal(resolvePathId(row.ctx, drifted), row.path, row.name);
      const ids = resolveMicroSteps(row.ctx, drifted).map((s) => s.id);
      assert.ok(ids.includes("setup.pre_generate"), `${row.name} setup`);
      assert.ok(ids.includes("wait.storyboard_generate"), `${row.name} wait`);
      assert.ok(ids.includes("image.review"), `${row.name} review`);
      assert.ok(ids.includes("setup.pre_video"), `${row.name} video setup`);
      assert.ok(ids.includes("done.export"), `${row.name} done`);
      assert.equal(
        microStepLegacyKey("image.storyboard_scenes", { visualStyleId: "storyboard-video" }),
        null,
        `${row.name} no handoff`,
      );
      assert.ok(
        ids.indexOf("image.review") < ids.indexOf("setup.pre_video"),
        `${row.name} order`,
      );
      assert.ok(!ids.includes("shortcut.ship_it"), `${row.name} no ship-it`);
      assert.ok(!ids.includes("image.generate"), `${row.name} no single-image generate`);
      assert.ok(!ids.includes("image.storyboard_scenes"), `${row.name} no legacy scenes step`);
      assert.ok(!ids.includes("video.generate"), `${row.name} no discrete video.generate`);
    }
  });

  it("concept combined skips cinematic stitch picker and shows topic then intake fuse", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
    };
    const state = baseState({ workflowMode: "combined", visualStyleId: "storyboard-video" });
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(!ids.includes("route.combined_style"));
    assert.ok(!ids.includes("route.concept_source"));
    assert.deepEqual(ids, ["route.output_goal", "identity.concept_topic", "route.intake"]);
  });

  it("concept combined cinematic single hands off to image step", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      combinedStyle: "cinematic",
    };
    const state = baseState({
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 1,
      cinematicStitchReel: false,
      workflowMode: "combined",
    });
    assert.equal(resolvePathId(ctx, state), "concept_combined_cinematic");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("image.storyboard_scenes"));
    assert.equal(
      microStepLegacyKey("image.storyboard_scenes", { visualStyleId: "concept-cinematic" }),
      "image",
    );
    assert.ok(ids.indexOf("copy.creative_brief") < ids.indexOf("image.storyboard_scenes"));
    assert.ok(ids.includes("done.export"));
  });

  it("physical combined product photo is gated on fused setup", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" }),
    );
    assert.ok(steps.some((s) => s.id === "setup.pre_generate"));
    assert.ok(!steps.some((s) => s.id === "asset.product_photo"));
    const blocked = canProceedMicroStep(
      "setup.pre_generate",
      ctx,
      baseState({
        visualStyleId: "storyboard-video",
        workflowMode: "combined",
        productPhoto: null,
        headline: "Hook",
      }),
    );
    assert.equal(blocked, "need_product_photo");
  });

  it("product image research keeps intake behind pre-generate for Back", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promptExtra: "STYLE_REFERENCE_ONLY",
        contentResearchApplied: true,
        imageRefPhoto: {} as File,
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.deepEqual(ids.slice(0, 4), [
      "route.output_goal",
      "identity.product_name",
      "route.intake",
      "setup.pre_generate",
    ]);
    assert.equal(steps[resumeStepIndex(steps)]?.id, "setup.pre_generate");
    assert.equal(ids[ids.indexOf("setup.pre_generate") - 1], "route.intake");
  });

  it("blocks setup.pre_generate until product photo and analyze ready", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    assert.equal(
      canProceedMicroStep(
        "setup.pre_generate",
        ctx,
        baseState({
          imageRefPhoto: {} as File,
          productPhoto: null,
          userReferenceBrief: null,
          referenceAnalyzeNote: null,
        }),
      ),
      "reference_analyzing",
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_generate",
        ctx,
        baseState({
          imageRefPhoto: {} as File,
          productPhoto: null,
          userReferenceBrief: { summary: "ok" },
        }),
      ),
      "need_product_photo",
    );
    assert.equal(
      canProceedMicroStep(
        "setup.pre_generate",
        ctx,
        baseState({
          imageRefPhoto: {} as File,
          productPhoto: {} as File,
          userReferenceBrief: { summary: "ok" },
        }),
      ),
      null,
    );
  });

  it("concept setup.pre_generate allows generate without product photo", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    assert.equal(
      canProceedMicroStep(
        "setup.pre_generate",
        ctx,
        baseState({
          promotionMode: "concept",
          conceptIdea: "春日保養攻略",
          headline: "春日保養",
          imageRefPhoto: {} as File,
          productPhoto: null,
          userReferenceBrief: { summary: "ok" },
        }),
      ),
      null,
    );
  });

  it("concept setup.pre_generate blocks when headline missing even with concept topic", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    assert.equal(
      canProceedMicroStep(
        "setup.pre_generate",
        ctx,
        baseState({
          promotionMode: "concept",
          conceptIdea: "瑜伽會籍",
          headline: "",
          imageRefPhoto: {} as File,
          productPhoto: null,
          userReferenceBrief: { summary: "ok" },
        }),
      ),
      "need_headline",
    );
  });

  it("blocks wait.reference_analyze until brief or note", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const state = baseState({ imageRefPhoto: {} as File });
    assert.equal(canProceedMicroStep("wait.reference_analyze", ctx, state), "reference_analyzing");
    assert.equal(
      canProceedMicroStep("wait.reference_analyze", ctx, {
        ...state,
        userReferenceBrief: { layout: "test" },
      }),
      null,
    );
  });

  it("concept image entry shows concept topic then intake fuse", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "concept", workflowMode: "image-only" },
      baseState({ promotionMode: "concept", workflowMode: "image-only" }),
    );
    assert.ok(!steps.some((s) => s.id === "route.concept_source"));
    assert.deepEqual(steps.map((s) => s.id), [
      "route.output_goal",
      "identity.concept_topic",
      "route.intake",
    ]);
  });

  it("concept assistant path skips platform research steps", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "direct",
      conceptSource: "assistant",
    };
    const steps = resolveMicroSteps(ctx, baseState({ promotionMode: "concept" }));
    const ids = steps.map((s) => s.id);
    assert.ok(!ids.includes("research.platform"));
    assert.ok(!ids.includes("research.pick_angle"));
    assert.ok(!ids.includes("identity.concept_topic"));
  });

  it("concept research path skips full concept assistant screen", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ promotionMode: "concept", promptExtra: "STYLE_REFERENCE_ONLY" }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(!ids.includes("identity.concept"));
    // Research already happens on route.intake fuse — no legacy research screens.
    assert.ok(!ids.includes("research.platform"));
    assert.ok(!ids.includes("research.pick_angle"));
    assert.ok(!ids.includes("wait.research_apply"));
  });

  it("product image research skips duplicate research screens after intake", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promptExtra: "STYLE_REFERENCE_ONLY\nlayout",
        contentResearchApplied: true,
        imageRefPhoto: {} as File,
      }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(!ids.includes("research.platform"));
    assert.ok(!ids.includes("research.pick_angle"));
    assert.ok(!ids.includes("wait.research_apply"));
    assert.ok(ids.includes("setup.pre_generate"));
  });

  it("concept research fuses copy into setup.pre_generate (no discrete copy.edit)", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "image-only",
      intakePath: "research",
      conceptSource: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ promotionMode: "concept", promptExtra: "STYLE_REFERENCE_ONLY" }),
    );
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("setup.pre_generate"));
    assert.ok(!ids.includes("copy.edit"));
    assert.ok(!ids.includes("research.pick_angle"));
  });

  it("concept routing after topic still needs intake fuse until path picked", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "concept", workflowMode: "image-only" },
      baseState({ promotionMode: "concept", conceptIdea: "loan offer" }),
    );
    assert.deepEqual(steps.map((s) => s.id), [
      "route.output_goal",
      "identity.concept_topic",
      "route.intake",
    ]);
  });

  it("physical entry shows product name then intake fuse", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "physical", workflowMode: "image-only" },
      baseState({ promotionMode: "physical", workflowMode: "image-only" }),
    );
    assert.deepEqual(steps.map((s) => s.id), [
      "route.output_goal",
      "identity.product_name",
      "route.intake",
    ]);
  });

  it("physical intake blocks continue until research applied or direct chosen", () => {
    const physical = { promotionMode: "physical" as const, workflowMode: "image-only" as const };
    assert.equal(
      canProceedMicroStep("route.intake", physical, baseState(physical)),
      "pick_intake",
    );
    assert.equal(
      canProceedMicroStep(
        "route.intake",
        { ...physical, intakePath: "direct" },
        baseState(physical),
      ),
      null,
    );
    assert.equal(
      canProceedMicroStep(
        "route.intake",
        { ...physical, intakePath: "research" },
        baseState(physical),
      ),
      "complete_research",
    );
    assert.equal(
      canProceedMicroStep(
        "route.intake",
        { ...physical, intakePath: "research" },
        baseState({
          ...physical,
          promptExtra:
            "Style reference (小紅書). MATCH reference visual style: layout — Do NOT copy reference subject matter.",
        }),
      ),
      null,
    );
    assert.equal(
      canProceedMicroStep(
        "route.intake",
        { ...physical, intakePath: "research" },
        baseState({ ...physical, imageRefPhoto: {} as File }),
      ),
      null,
    );
    assert.equal(
      canProceedMicroStep(
        "route.intake",
        { ...physical, intakePath: "research" },
        baseState({ ...physical, contentResearchApplied: true }),
      ),
      null,
    );
  });

  it("concept intake only requires a path tab (assistant rules differ)", () => {
    const concept = {
      promotionMode: "concept" as const,
      workflowMode: "image-only" as const,
      conceptSource: "research" as const,
      intakePath: "research" as const,
    };
    assert.equal(
      canProceedMicroStep("route.intake", concept, baseState({ promotionMode: "concept" })),
      null,
    );
  });
});
