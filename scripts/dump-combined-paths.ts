/**
 * Dump resolved micro-step sequences for product/concept combined paths.
 * Run: npx tsx scripts/dump-combined-paths.ts
 */
import {
  resolvePathId,
  resolveMicroSteps,
  microStepLegacyKey,
  type WizardMicroStepState,
} from "../lib/wizard-micro-steps";
import type { MicroWizardContext } from "../lib/wizard-micro-steps.types";
import type { VisualStyleId } from "../lib/visual-styles";

function base(over: Partial<WizardMicroStepState> = {}): WizardMicroStepState {
  return {
    product: "手鍊",
    conceptIdea: "職場成長",
    headline: "標題",
    subline: "",
    offer: "",
    business: "",
    promptExtra: "",
    productPhoto: { name: "p.jpg" } as File,
    imageRefPhoto: null,
    referenceAd: null,
    referenceIsVideo: false,
    contentResearchApplyRef: null,
    researchReelDownloadBusy: false,
    researchReelAnalyzeBusy: false,
    referenceAnalyzeBusy: false,
    imageBusy: false,
    videoBusy: false,
    storyboardBrief: "brief",
    creativeVideoBrief: "brief",
    visualStyleId: "storyboard-video" as VisualStyleId,
    templateId: "x",
    workflowMode: "combined",
    imageCreativeMode: "promo-ai",
    videoCreativeMode: "product-promo",
    imageOutputMode: "single",
    cinematicSceneCount: 1,
    cinematicStitchReel: false,
    userReferenceBrief: "",
    shipItEligible: false,
    ...over,
  } as WizardMicroStepState;
}

const cases: Array<{
  name: string;
  ctx: MicroWizardContext;
  state?: Partial<WizardMicroStepState>;
}> = [
  {
    name: "A physical + combined + direct (storyboard)",
    ctx: { promotionMode: "physical", workflowMode: "combined", intakePath: "direct" },
    state: { visualStyleId: "storyboard-video" },
  },
  {
    name: "B physical + combined + direct (UGC)",
    ctx: { promotionMode: "physical", workflowMode: "combined", intakePath: "direct" },
    state: { visualStyleId: "ugc-presenter" },
  },
  {
    name: "C physical + combined + research",
    ctx: { promotionMode: "physical", workflowMode: "combined", intakePath: "research" },
    state: { visualStyleId: "storyboard-video" },
  },
  {
    name: "D concept + combined + animate + direct",
    ctx: {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      conceptSource: "assistant",
      combinedStyle: "animate",
    },
    state: { visualStyleId: "storyboard-video" },
  },
  {
    name: "E concept + combined + animate + research",
    ctx: {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "research",
      conceptSource: "research",
      combinedStyle: "animate",
    },
    state: { visualStyleId: "storyboard-video" },
  },
  {
    name: "F1 concept + combined + cinematic single",
    ctx: {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      combinedStyle: "cinematic",
    },
    state: {
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 1,
      cinematicStitchReel: false,
    },
  },
  {
    name: "F2 concept + combined + cinematic stitch×3",
    ctx: {
      promotionMode: "concept",
      workflowMode: "combined",
      intakePath: "direct",
      combinedStyle: "cinematic",
    },
    state: {
      visualStyleId: "concept-cinematic",
      cinematicSceneCount: 3,
      cinematicStitchReel: true,
    },
  },
];

for (const c of cases) {
  const state = base(c.state);
  const pathId = resolvePathId(c.ctx, state);
  const steps = resolveMicroSteps(c.ctx, state);
  const ids = steps.map((s) => s.id);
  console.log(`\n=== ${c.name} ===`);
  console.log(`path: ${pathId}`);
  console.log(`steps (${ids.length}):\n  ${ids.join("\n  → ")}`);
  const imageStep = steps.find(
    (s) =>
      s.id === "image.storyboard_scenes" ||
      s.id === "image.generate" ||
      s.legacyStepKey === "image",
  );
  console.log(
    `image handoff: ${imageStep?.id ?? "(none)"} legacy=${
      imageStep
        ? (imageStep.legacyStepKey ?? microStepLegacyKey(imageStep.id, state as never))
        : "-"
    }`,
  );
  console.log(`done.export: ${ids.includes("done.export")}`);
}
