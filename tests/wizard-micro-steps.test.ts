import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import graph from "../lib/wizard-micro-steps.graph.json";
import {
  canProceedMicroStep,
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
    referenceClipLoading: false,
    imageBusy: false,
    videoBusy: false,
    imageUrl: null,
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
          pathId === "concept_combined_cinematic" ? "concept-cinematic" : baseState().visualStyleId,
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
    assert.ok(briefIdx >= 0);
    assert.ok(scenesIdx > briefIdx);
    assert.ok(genIdx > scenesIdx);
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
