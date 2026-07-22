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
    shipItEligible: false,
    hasGeneratedImage: false,
    userReferenceBrief: null,
    referenceAnalyzeNote: null,
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
    combinedStyle: "animate",
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
    assert.equal(steps[resumeStepIndex(steps)]?.id, "route.primary_style");
  });

  it("research copy.edit is not skippable", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(ctx, baseState({ promptExtra: "STYLE_REFERENCE_ONLY" }));
    const copyEdit = steps.find((s) => s.id === "copy.edit");
    assert.ok(copyEdit);
    assert.equal(copyEdit?.skippable, false);
  });

  it("keeps image.output_format on research path when reference photo attached", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        promptExtra: "STYLE_REFERENCE_ONLY",
        imageOutputMode: "teaching-carousel",
        imageRefPhoto: {} as File,
      }),
    );
    assert.ok(steps.some((s) => s.id === "image.output_format"));
  });

  it("skips image.output_format only for model-wear style", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({
        visualStyleId: "model-wear",
        promptExtra: "STYLE_REFERENCE_ONLY",
        imageRefPhoto: {} as File,
      }),
    );
    assert.ok(!steps.some((s) => s.id === "image.output_format"));
  });

  it("does not inject duplicate image.art_style when image.options exists", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "research",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ promptExtra: "STYLE_REFERENCE_ONLY", imageRefPhoto: {} as File }),
    );
    assert.ok(steps.some((s) => s.id === "image.options"));
    assert.ok(!steps.some((s) => s.id === "image.art_style"));
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

  it("path 5 combined injects storyboard scene steps", () => {
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
    const briefIdx = ids.indexOf("copy.storyboard_brief");
    const scenesIdx = ids.indexOf("image.storyboard_scenes");
    const genIdx = ids.indexOf("wait.storyboard_generate");
    const photoIdx = ids.indexOf("asset.product_photo");
    assert.ok(briefIdx >= 0);
    assert.ok(scenesIdx > briefIdx);
    assert.ok(genIdx > scenesIdx);
    // Image research: no MP4 step. Storyboard still after product photo.
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(photoIdx >= 0 && photoIdx < scenesIdx);

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
    const scenesWithReel = withReel.indexOf("image.storyboard_scenes");
    assert.ok(refIdx >= 0 && refIdx < scenesWithReel);
  });

  it("path 5 combined injects storyboard after setup even without storyboard style yet", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    const ids = resolveMicroSteps(ctx, baseState({ visualStyleId: "product" })).map((s) => s.id);
    const scenesIdx = ids.indexOf("image.storyboard_scenes");
    const photoIdx = ids.indexOf("asset.product_photo");
    assert.ok(scenesIdx >= 0);
    assert.ok(photoIdx >= 0 && photoIdx < scenesIdx);
    assert.ok(!ids.includes("asset.reference_video"));
  });

  it("path 2 direct shows wait.reference_analyze when ref photo present", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "image-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState({ imageRefPhoto: {} as File }));
    assert.ok(steps.some((s) => s.id === "wait.reference_analyze"));
  });

  it("path 6 product_promo includes video.ai_prompt", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "product_promo",
    };
    const steps = resolveMicroSteps(ctx, baseState());
    const ids = steps.map((s) => s.id);
    const photoIdx = ids.indexOf("asset.product_photo");
    const promptIdx = ids.indexOf("video.ai_prompt");
    assert.ok(photoIdx >= 0);
    assert.ok(promptIdx > photoIdx);
    assert.ok(!steps.some((s) => s.id === "copy.storyboard_brief"));
  });

  it("path 6 ugc_presenter injects keyframe steps and ugc pack", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "ugc_presenter",
    };
    const state = baseState({ visualStyleId: "ugc-presenter", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_video_direct");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    const photoIdx = ids.indexOf("asset.product_photo");
    const genIdx = ids.indexOf("image.generate");
    const waitIdx = ids.indexOf("wait.image_generate");
    const reviewIdx = ids.indexOf("image.review");
    const packIdx = ids.indexOf("video.ugc_pack");
    const videoGenIdx = ids.indexOf("video.generate");
    assert.ok(photoIdx >= 0);
    assert.ok(genIdx > photoIdx);
    assert.ok(waitIdx > genIdx);
    assert.ok(reviewIdx > waitIdx);
    assert.ok(packIdx > reviewIdx);
    assert.ok(videoGenIdx > packIdx);
    assert.ok(!ids.includes("image.art_style"));
    assert.ok(!ids.includes("wait.video_generate"));
    assert.ok(!ids.includes("done.export"));
    assert.equal(microStepLegacyKey("video.generate", state), "video");
  });

  it("video-only direct without subpath shows route.video_subpath only", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "video-only",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(ctx, baseState({ workflowMode: "video-only" }));
    assert.deepEqual(steps.map((s) => s.id), ["route.video_subpath"]);
    assert.equal(resumeStepIndex(steps), 0);
  });

  it("product_combined ugc keeps ugc_pack before generate", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const state = baseState({ visualStyleId: "ugc-presenter", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("video.ugc_pack"));
    assert.ok(ids.includes("image.generate"));
    assert.ok(!ids.includes("image.storyboard_scenes"));
    assert.ok(ids.indexOf("video.ugc_pack") < ids.indexOf("video.generate"));
    assert.equal(microStepLegacyKey("video.generate", state), "video");
  });

  it("product_combined uses storyboard scenes not image output format", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("copy.storyboard_brief"));
    assert.ok(ids.includes("image.storyboard_scenes"));
    assert.ok(!ids.includes("image.output_format"));
    assert.ok(!ids.includes("route.primary_style"));
    assert.equal(microStepLegacyKey("image.storyboard_scenes"), "image");
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
    assert.ok(ids.includes("copy.storyboard_brief"));
    assert.ok(ids.includes("image.storyboard_scenes"));
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
    assert.ok(ids.includes("image.storyboard_scenes"));
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
    assert.ok(ids.includes("image.storyboard_scenes"));
  });

  it("product combined + research routes to research reel with storyboard inject", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "research",
    };
    // Even before style is forced to storyboard-video, path + scenes must resolve.
    const state = baseState({ visualStyleId: "product", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "product_video_research_reel");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    // No reel attached yet → MP4 step skipped on combined.
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("copy.storyboard_brief"));
    assert.ok(ids.includes("image.storyboard_scenes"));
    assert.ok(ids.includes("wait.storyboard_generate"));
    assert.ok(ids.indexOf("image.storyboard_scenes") < ids.indexOf("video.generate"));
    assert.ok(ids.indexOf("asset.product_photo") < ids.indexOf("image.storyboard_scenes"));
  });

  it("concept combined animate + direct is storyboard end-to-end", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      conceptSource: "assistant",
      combinedStyle: "animate",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "concept_combined");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(ids.includes("copy.storyboard_brief"));
    assert.ok(ids.includes("image.storyboard_scenes"));
    assert.ok(ids.includes("video.generate"));
    assert.ok(ids.includes("done.export"));
    assert.ok(ids.indexOf("image.storyboard_scenes") < ids.indexOf("video.generate"));
  });

  it("concept combined research injects storyboard after reel setup", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "research",
      conceptSource: "research",
      combinedStyle: "animate",
    };
    const state = baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" });
    assert.equal(resolvePathId(ctx, state), "concept_video_research_reel");
    const ids = resolveMicroSteps(ctx, state).map((s) => s.id);
    assert.ok(!ids.includes("asset.reference_video"));
    assert.ok(ids.includes("image.storyboard_scenes"));
    assert.ok(ids.includes("done.export"));
    // Image-only research: no reel analyze. With a real MP4, analyze comes before scenes.
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
    assert.ok(withVideo.indexOf("wait.reel_analyze") < withVideo.indexOf("image.storyboard_scenes"));
  });

  it("combined matrix: product/concept × direct/research all hand off storyboard before video", () => {
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
          combinedStyle: "animate",
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
          combinedStyle: "animate",
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
      assert.ok(ids.includes("copy.storyboard_brief"), `${row.name} brief`);
      assert.ok(ids.includes("image.storyboard_scenes"), `${row.name} scenes`);
      assert.ok(ids.includes("wait.storyboard_generate"), `${row.name} wait`);
      assert.ok(ids.includes("video.generate"), `${row.name} video`);
      assert.ok(ids.includes("done.export"), `${row.name} done`);
      assert.equal(microStepLegacyKey("image.storyboard_scenes"), "image", `${row.name} handoff`);
      assert.ok(
        ids.indexOf("image.storyboard_scenes") < ids.indexOf("video.generate"),
        `${row.name} order`,
      );
      assert.ok(!ids.includes("shortcut.ship_it"), `${row.name} no ship-it`);
      assert.ok(!ids.includes("image.generate"), `${row.name} no single-image generate`);
    }
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
    assert.equal(microStepLegacyKey("image.storyboard_scenes"), "image");
    assert.ok(ids.indexOf("copy.creative_brief") < ids.indexOf("image.storyboard_scenes"));
    assert.ok(ids.includes("done.export"));
  });

  it("physical combined product photo is not skippable", () => {
    const ctx: MicroWizardContext = {
      promotionMode: "physical",
      workflowMode: "combined",
      intakePath: "direct",
    };
    const steps = resolveMicroSteps(
      ctx,
      baseState({ visualStyleId: "storyboard-video", workflowMode: "combined" }),
    );
    const photo = steps.find((s) => s.id === "asset.product_photo");
    assert.ok(photo);
    assert.equal(photo?.skippable, false);
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

  it("concept image entry shows concept source before identity", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "concept", workflowMode: "image-only" },
      baseState({ promotionMode: "concept", workflowMode: "image-only" }),
    );
    assert.deepEqual(steps.map((s) => s.id), ["route.concept_source"]);
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
    assert.ok(ids.includes("research.platform"));
    assert.ok(ids.includes("research.pick_angle"));
  });

  it("concept research copy.edit is not skippable", () => {
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
    const copyEdit = steps.find((s) => s.id === "copy.edit");
    assert.ok(copyEdit);
    assert.equal(copyEdit?.skippable, false);
  });

  it("concept routing shows assistant identity after source pick", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "concept", workflowMode: "image-only", conceptSource: "assistant" },
      baseState({ promotionMode: "concept" }),
    );
    assert.deepEqual(steps.map((s) => s.id), ["identity.concept"]);
  });

  it("concept routing shows topic identity after research source pick", () => {
    const steps = resolveMicroSteps(
      { promotionMode: "concept", workflowMode: "image-only", conceptSource: "research" },
      baseState({ promotionMode: "concept" }),
    );
    assert.deepEqual(steps.map((s) => s.id), ["identity.concept_topic"]);
  });
});
