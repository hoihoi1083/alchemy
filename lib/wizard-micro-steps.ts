/**
 * Resolve wizard v2 micro-step lists from graph + live wizard state.
 * See docs/WIZARD_MICRO_STEPS.md — Paths 1–11
 */
import graph from "@/lib/wizard-micro-steps.graph.json";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type {
  ConceptSource,
  IntakePath,
  MicroStepId,
  MicroWizardContext,
  MicroWizardPathId,
  ResolvedMicroStep,
  VideoSubpath,
} from "@/lib/wizard-micro-steps.types";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import {
  isBrandVideoStyle,
  isBrandVisualStyle,
  isStoryboardVideoStyle,
  requiresBrandProfileForImages,
} from "@/lib/visual-styles";

type GraphStep = {
  id: string;
  required?: boolean | string[];
  skippable?: boolean;
  skipWhen?: string;
  when?: string;
  legacyStepKey?: "setup" | "image" | "video" | "done";
};

export type WizardMicroStepState = {
  workflowMode: WorkflowMode;
  promotionMode: PromotionMode;
  visualStyleId: VisualStyleId;
  imageOutputMode: ImageOutputMode;
  imageRefPhoto: File | null;
  productPhoto: File | null;
  referenceAd: File | null;
  referenceIsVideo: boolean;
  product: string;
  conceptIdea: string;
  headline: string;
  subline: string;
  offer: string;
  business: string;
  creativeVideoBrief: string;
  storyboardBrief: string;
  brandWebsiteUrl: string;
  brandProfile: unknown;
  cinematicStitchReel: boolean;
  cinematicSceneCount: number;
  videoCreativeMode: string;
  videoSettingsDuration: string;
  referenceAnalyzeBusy: boolean;
  brandAnalyzeBusy: boolean;
  researchReelAnalyzeBusy: boolean;
  referenceClipLoading: boolean;
  imageBusy: boolean;
  videoBusy: boolean;
  imageUrl: string | null;
  promptExtra: string;
  shipItEligible: boolean;
  hasGeneratedImage: boolean;
  userReferenceBrief: unknown;
  referenceAnalyzeNote: string | null;
};

const ROUTING_SKIP = new Set([
  "entry.start",
  "route.output_goal",
  "route.subject",
  "route.intake",
  "route.concept_source",
]);

const ROUTING_PREFIX_IDS = new Set<MicroStepId>([
  "route.output_goal",
  "route.subject",
  "route.combined_style",
  "route.cinematic_mode",
  "cinematic.scene_count",
  "identity.product_name",
  "identity.concept",
  "identity.concept_topic",
  "route.intake",
  "route.concept_source",
  "route.video_subpath",
]);

const DIRECT_IMAGE_STYLE_PATHS = new Set<MicroWizardPathId>([
  "product_image_direct",
  "concept_image_direct",
]);

const SKIPPABLE_DEFAULT = new Set<MicroStepId>([
  "asset.reference_image",
  "copy.edit",
  "image.options",
  "image.art_style",
  "video.bgm",
  "video.settings",
  "asset.extra_kit",
  "asset.product_photo",
  "research.platform",
  "shortcut.ship_it",
  "wait.concept_plan",
]);

const REEL_PATHS = new Set<MicroWizardPathId>([
  "product_video_research_reel",
  "concept_video_research_reel",
]);

const WAIT_AUTO_ADVANCE = new Set<MicroStepId>([
  "wait.reel_download",
  "wait.reel_analyze",
  "wait.brand_analyze",
  "wait.concept_plan",
  "wait.storyboard_generate",
  "wait.video_generate",
]);

/** Graph uses single quotes; resolver historically used double — normalize before match. */
function normalizeWhenExpr(expr: string): string {
  return expr.replace(/'/g, '"');
}

function allCopyEmpty(state: WizardMicroStepState): boolean {
  return !(
    state.headline.trim() ||
    state.subline.trim() ||
    state.offer.trim() ||
    state.business.trim()
  );
}

/** Concept image / combined-animate: pick 概念助手 OR 平台研究 — not both. */
export function needsConceptSourceSplit(
  ctx: MicroWizardContext,
  state: Pick<WizardMicroStepState, "visualStyleId">,
): boolean {
  if (ctx.promotionMode !== "concept") return false;
  if (ctx.workflowMode === "image-only") return true;
  if (ctx.workflowMode === "combined") {
    const cinematic =
      ctx.combinedStyle === "cinematic" || state.visualStyleId === "concept-cinematic";
    return !cinematic && ctx.combinedStyle === "animate";
  }
  return false;
}

export function intakePathForConceptSource(source: ConceptSource): IntakePath {
  return source === "assistant" ? "direct" : "research";
}

function evalSkipWhen(
  expr: string | undefined,
  state: WizardMicroStepState,
  ctx: MicroWizardContext,
): boolean {
  if (!expr) return false;
  if (expr === "!imageRefPhoto") return !state.imageRefPhoto;
  if (expr === "allCopyEmpty") return allCopyEmpty(state);
  if (expr === "!contentResearchApplyRef") return !isContentResearchStyleExtra(state.promptExtra);
  if (expr === "referenceAd && referenceIsVideo") {
    return Boolean(state.referenceAd && state.referenceIsVideo);
  }
  if (expr === "anglePresetOutputMode") {
    // Only model-wear locks format; research ref / style extra must not hide the picker.
    return state.visualStyleId === "model-wear";
  }
  return false;
}

function evalWhen(
  expr: string | undefined,
  state: WizardMicroStepState,
  ctx: MicroWizardContext,
): boolean {
  if (!expr) return true;
  const norm = normalizeWhenExpr(expr);
  if (norm === "referenceAnalyzeBusy") return state.referenceAnalyzeBusy;
  if (norm === "cinematicStitchReel") return state.cinematicStitchReel;
  if (norm === "cinematicSceneCount > 1 || cinematicStitchReel") {
    return state.cinematicSceneCount > 1 || state.cinematicStitchReel;
  }
  if (norm === "requiresBrandProfileForImages(visualStyleId)") {
    return requiresBrandProfileForImages(state.visualStyleId);
  }
  if (norm === "isBrandVisualStyle(visualStyleId)") {
    return isBrandVisualStyle(state.visualStyleId);
  }
  if (norm === "isBrandVideoStyle(visualStyleId)") {
    return isBrandVideoStyle(state.visualStyleId);
  }
  if (norm === 'visualStyleId === "creative-video"') {
    return state.visualStyleId === "creative-video";
  }
  if (norm === 'visualStyleId === "storyboard-video"') {
    return isStoryboardVideoStyle(state.visualStyleId);
  }
  if (norm === 'imageOutputMode === "ab"') return state.imageOutputMode === "ab";
  if (norm === 'videoSubpath === "reference_reel"') {
    return ctx.videoSubpath === "reference_reel";
  }
  if (norm === 'videoSubpath === "product_promo"') {
    return ctx.videoSubpath === "product_promo";
  }
  if (norm === 'videoCreativeMode === "product-assistant"') {
    return state.videoCreativeMode === "product-assistant";
  }
  if (norm === 'visualStyleId === "ugc-presenter"') {
    return state.visualStyleId === "ugc-presenter";
  }
  if (norm === "referenceIsVideo") return state.referenceIsVideo;
  if (norm === "shipItEligible") return state.shipItEligible;
  if (norm === "research.pick_angle && !referenceAd") {
    return isContentResearchStyleExtra(state.promptExtra) && !state.referenceAd;
  }
  return true;
}

export function resolvePathId(
  ctx: MicroWizardContext,
  state: Pick<WizardMicroStepState, "visualStyleId" | "promptExtra">,
): MicroWizardPathId | null {
  const { workflowMode, promotionMode, intakePath } = ctx;
  if (!workflowMode || !promotionMode || !intakePath) return null;

  if (promotionMode === "concept" && workflowMode === "combined") {
    if (
      state.visualStyleId === "concept-cinematic" ||
      ctx.combinedStyle === "cinematic"
    ) {
      return "concept_combined_cinematic";
    }
    if (
      intakePath === "research" &&
      isStoryboardVideoStyle(state.visualStyleId)
    ) {
      return "concept_video_research_reel";
    }
    return "concept_combined";
  }

  if (promotionMode === "physical" && workflowMode === "combined") {
    if (
      intakePath === "research" &&
      isStoryboardVideoStyle(state.visualStyleId)
    ) {
      return "product_video_research_reel";
    }
    return "product_combined";
  }

  if (workflowMode === "video-only" || workflowMode === "combined") {
    if (intakePath === "research") {
      return promotionMode === "concept"
        ? "concept_video_research_reel"
        : "product_video_research_reel";
    }
    if (workflowMode === "video-only") {
      return promotionMode === "concept"
        ? "concept_video_direct"
        : "product_video_direct";
    }
  }

  if (workflowMode === "image-only" && promotionMode === "physical" && intakePath === "direct") {
    return "product_image_direct";
  }
  if (workflowMode === "image-only" && promotionMode === "concept" && intakePath === "direct") {
    return "concept_image_direct";
  }
  if (workflowMode === "image-only" && promotionMode === "physical" && intakePath === "research") {
    return "product_image_research";
  }
  if (workflowMode === "image-only" && promotionMode === "concept" && intakePath === "research") {
    return "concept_image_research";
  }

  return null;
}

function graphStepsForPath(pathId: MicroWizardPathId): GraphStep[] {
  const path = graph.paths[pathId as keyof typeof graph.paths];
  if (!path || !("steps" in path)) return [];
  return path.steps as GraphStep[];
}

function filterGraphSteps(
  steps: GraphStep[],
  state: WizardMicroStepState,
  ctx: MicroWizardContext,
): MicroStepId[] {
  const ids: MicroStepId[] = [];
  for (const step of steps) {
    const id = step.id;
    if (id.startsWith("MERGE_") || id === "IMAGE_STORYBOARD_BRANCH") continue;
    if (ROUTING_SKIP.has(id)) continue;
    if (
      ctx.intakePath &&
      (id === "identity.product_name" ||
        id === "identity.concept" ||
        id === "identity.concept_topic")
    ) {
      continue;
    }
    if (ctx.conceptSource === "research" && id === "identity.concept") continue;
    if (ctx.conceptSource === "assistant" && id === "identity.concept_topic") continue;
    if (ctx.videoSubpath && id === "route.video_subpath") continue;
    if (evalSkipWhen(step.skipWhen, state, ctx)) continue;
    if (!evalWhen(step.when, state, ctx)) continue;
    ids.push(id as MicroStepId);
  }
  return ids;
}

function expandMergedPath(
  pathId: "product_combined" | "concept_combined",
  ctx: MicroWizardContext,
  state: WizardMicroStepState,
): MicroStepId[] {
  const path = graph.paths[pathId];
  if (!path || !("merge" in path) || !path.merge) return [];

  const merge = path.merge as {
    research: MicroWizardPathId;
    direct: MicroWizardPathId;
    stopBefore?: string;
  };
  const subId = ctx.intakePath === "research" ? merge.research : merge.direct;
  const subSteps = filterGraphSteps(graphStepsForPath(subId), state, ctx);
  const stopBefore = (merge.stopBefore ?? "done.export") as MicroStepId;

  const trunk: MicroStepId[] = [];
  for (const id of subSteps) {
    if (id === stopBefore) break;
    trunk.push(id);
  }

  const tail = filterGraphSteps(graphStepsForPath(pathId), state, ctx).filter(
    (id) => id === "image.review" || id === "shortcut.ship_it" || id.startsWith("video.") || id.startsWith("wait.video") || id === "done.export",
  );

  const directSubId =
    pathId === "concept_combined" ? "concept_image_direct" : "product_image_direct";
  const styledTrunk =
    ctx.intakePath === "direct" ? injectPrimaryStyle(trunk, directSubId, state) : trunk;

  return dedupeSteps([...styledTrunk, ...tail]);
}

/** Combined research-reel paths need storyboard scene stills before video generate. */
function injectReelStoryboardBranch(
  ids: MicroStepId[],
  ctx: MicroWizardContext,
  state: WizardMicroStepState,
): MicroStepId[] {
  if (ctx.workflowMode !== "combined") return ids;
  if (!isStoryboardVideoStyle(state.visualStyleId)) return ids;
  if (ids.includes("image.storyboard_scenes")) return ids;

  const insertAt =
    ids.indexOf("copy.storyboard_brief") >= 0
      ? ids.indexOf("copy.storyboard_brief") + 1
      : ids.findIndex((id) => id === "video.settings" || id === "video.generate");
  if (insertAt < 0) return ids;

  const next = [...ids];
  next.splice(insertAt, 0, "image.storyboard_scenes", "wait.storyboard_generate");
  return dedupeSteps(next);
}

function reorderReelVideoSettings(ids: MicroStepId[]): MicroStepId[] {
  if (!ids.includes("wait.reel_analyze")) return ids;
  const without = ids.filter((id) => id !== "video.settings");
  const refIdx = without.indexOf("asset.reference_video");
  const insertAt = refIdx >= 0 ? refIdx : without.indexOf("wait.reel_analyze");
  if (insertAt < 0) return ids;
  const next: MicroStepId[] = [...without];
  next.splice(insertAt, 0, "video.settings");
  return dedupeSteps(next);
}

function injectArtStyle(ids: MicroStepId[]): MicroStepId[] {
  if (!ids.some((id) => id.startsWith("image."))) return ids;
  if (ids.includes("image.art_style")) return ids;
  // image.options already includes art style — skip duplicate step.
  if (ids.includes("image.options")) return ids;
  const optIdx = ids.indexOf("image.options");
  if (optIdx >= 0) {
    const next = [...ids];
    next.splice(optIdx, 0, "image.art_style");
    return next;
  }
  const genIdx = ids.indexOf("image.generate");
  if (genIdx >= 0) {
    const next = [...ids];
    next.splice(genIdx, 0, "image.art_style");
    return next;
  }
  return ids;
}

function dedupeSteps(ids: MicroStepId[]): MicroStepId[] {
  const seen = new Set<MicroStepId>();
  const out: MicroStepId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function resolveMicroSteps(
  ctx: MicroWizardContext,
  state: WizardMicroStepState,
): ResolvedMicroStep[] {
  const ids: MicroStepId[] = [];

  if (!ctx.workflowMode) {
    return wrapSteps(["route.output_goal"], ctx);
  }

  if (!ctx.promotionMode) {
    ids.push("route.subject");
    return wrapSteps(ids, ctx);
  }

  if (ctx.promotionMode === "concept" && ctx.workflowMode === "combined") {
    const cinematic =
      ctx.combinedStyle === "cinematic" ||
      state.visualStyleId === "concept-cinematic";
    if (!ctx.combinedStyle && !cinematic) {
      return wrapSteps(["route.combined_style"], ctx);
    }
    if (cinematic && state.visualStyleId !== "concept-cinematic") {
      ids.push("route.cinematic_mode");
    }
    if (cinematic && state.cinematicStitchReel) {
      ids.push("cinematic.scene_count");
    }
  }

  const conceptSplit = needsConceptSourceSplit(ctx, state);

  if (conceptSplit) {
    if (!ctx.conceptSource) {
      return wrapSteps([...ids, "route.concept_source"], ctx);
    }
    if (!ctx.intakePath) {
      ids.push(ctx.conceptSource === "assistant" ? "identity.concept" : "identity.concept_topic");
      return wrapSteps(ids, ctx);
    }
  } else if (!ctx.intakePath) {
    if (ctx.promotionMode === "physical") {
      ids.push("identity.product_name");
    } else {
      ids.push("identity.concept");
    }
    ids.push("route.intake");
    return wrapSteps(ids, ctx);
  }

  const pathId = resolvePathId(ctx, state);
  if (!pathId) {
    if (ctx.workflowMode === "video-only" && ctx.intakePath === "direct" && !ctx.videoSubpath) {
      return wrapSteps(["route.video_subpath"], ctx);
    }
    ids.push("route.intake");
    return wrapSteps(ids, ctx);
  }

  if (pathId === "product_combined" || pathId === "concept_combined") {
    return wrapSteps(injectArtStyle(expandMergedPath(pathId, ctx, state)), ctx);
  }

  let pathSteps = filterGraphSteps(graphStepsForPath(pathId), state, ctx);
  if (REEL_PATHS.has(pathId)) {
    pathSteps = reorderReelVideoSettings(pathSteps);
    pathSteps = injectReelStoryboardBranch(pathSteps, ctx, state);
  }
  pathSteps = injectArtStyle(pathSteps);
  pathSteps = injectPrimaryStyle(pathSteps, pathId, state);

  return wrapSteps(pathSteps, ctx);
}

/** Direct image paths need explicit visual style pick (classic SetupStep primary paths). */
function injectPrimaryStyle(
  ids: MicroStepId[],
  pathId: MicroWizardPathId,
  state: WizardMicroStepState,
): MicroStepId[] {
  if (!DIRECT_IMAGE_STYLE_PATHS.has(pathId)) return ids;
  if (isContentResearchStyleExtra(state.promptExtra)) return ids;
  if (ids.includes("route.primary_style")) return ids;
  return ["route.primary_style", ...ids];
}

function isStepSkippable(id: MicroStepId, ctx?: MicroWizardContext): boolean {
  if (id === "copy.edit" && ctx?.intakePath === "research") return false;
  if (id === "research.pick_angle" && ctx?.workflowMode === "image-only") return false;
  return (
    SKIPPABLE_DEFAULT.has(id) ||
    (id === "research.pick_angle" && ctx?.workflowMode !== "image-only")
  );
}

function wrapSteps(ids: MicroStepId[], ctx?: MicroWizardContext): ResolvedMicroStep[] {
  const total = ids.length;
  return ids.map((id, index) => ({
    id,
    index: index + 1,
    estimatedTotal: total,
    skippable: isStepSkippable(id, ctx),
  }));
}

export function microStepLegacyKey(id: MicroStepId): "setup" | "image" | "video" | "done" | null {
  // image.review stays in micro-wizard (ImageResultPanel); only storyboard needs full ImageStep.
  if (id === "image.storyboard_scenes") return "image";
  if (id === "done.export") return "done";
  return null;
}

/** First path step index after routing screens the user already completed. */
export function resumeStepIndex(steps: ResolvedMicroStep[]): number {
  const idx = steps.findIndex((s) => !ROUTING_PREFIX_IDS.has(s.id));
  return idx >= 0 ? idx : 0;
}

export function isWaitMicroStep(id: MicroStepId): boolean {
  return WAIT_AUTO_ADVANCE.has(id);
}

export function canProceedMicroStep(
  id: MicroStepId,
  ctx: MicroWizardContext,
  state: WizardMicroStepState,
): string | null {
  if (id === "route.output_goal" && !ctx.workflowMode) return "pick_output";
  if (id === "route.subject" && !ctx.promotionMode) return "pick_subject";
  if (
    id === "research.pick_angle" &&
    ctx.intakePath === "research" &&
    ctx.workflowMode === "image-only" &&
    !isContentResearchStyleExtra(state.promptExtra) &&
    !state.imageRefPhoto
  ) {
    return "need_pick_angle";
  }
  if (id === "route.combined_style" && !ctx.combinedStyle) return "pick_combined_style";
  if (id === "route.cinematic_mode" && state.visualStyleId !== "concept-cinematic") {
    return "pick_cinematic_mode";
  }
  if (id === "route.intake" && !ctx.intakePath) return "pick_intake";
  if (id === "route.concept_source" && !ctx.conceptSource) return "pick_concept_source";
  if (id === "route.video_subpath" && !ctx.videoSubpath) return "pick_video_subpath";
  if (id === "identity.product_name" && !state.product.trim()) return "need_product_name";
  if (id === "identity.concept" && !state.conceptIdea.trim()) return "need_concept";
  if (id === "identity.concept_topic" && !state.conceptIdea.trim()) return "need_concept_topic";
  if (id === "asset.product_photo" && ctx.promotionMode === "physical" && !state.productPhoto) {
    return "need_product_photo";
  }
  if (id === "copy.creative_brief" && !state.creativeVideoBrief.trim()) {
    return "need_creative_brief";
  }
  if (id === "asset.reference_video" && !state.referenceAd) {
    return "need_reference_video";
  }
  // asset.brand_website is optional — many SMB users have no website.
  if (id === "wait.research_apply" || id === "wait.reference_analyze") {
    if (state.referenceAnalyzeBusy) return "reference_analyzing";
    if (
      id === "wait.reference_analyze" &&
      state.imageRefPhoto &&
      !state.userReferenceBrief &&
      !state.referenceAnalyzeNote
    ) {
      return "reference_analyzing";
    }
    if (
      id === "wait.research_apply" &&
      ctx.intakePath === "research" &&
      isContentResearchStyleExtra(state.promptExtra) &&
      !state.imageRefPhoto
    ) {
      return "reference_analyzing";
    }
  }
  if (id === "wait.brand_analyze" && state.brandAnalyzeBusy) return "brand_analyzing";
  if (id === "wait.reel_analyze" && state.researchReelAnalyzeBusy) {
    return "reel_analyzing";
  }
  if (id === "wait.reel_download" && state.referenceClipLoading) {
    return "reel_downloading";
  }
  if (id === "wait.reel_analyze" && state.referenceIsVideo && state.videoSettingsDuration === "auto") {
    return "need_duration_before_reel";
  }
  if (id === "wait.image_generate" && state.imageBusy) return "image_busy";
  if (id === "image.review" && !state.imageUrl && !state.imageBusy) return "image_not_ready";
  if (id === "wait.video_generate" && state.videoBusy) return "video_busy";
  if (
    id === "copy.edit" &&
    ctx.intakePath === "research" &&
    !state.imageRefPhoto &&
    !state.headline.trim() &&
    (ctx.promotionMode === "concept" ? !state.conceptIdea.trim() : !state.product.trim())
  ) {
    return "need_headline";
  }
  if (id === "video.product_plan" && !state.creativeVideoBrief.trim() && !state.product.trim()) {
    return "need_product_name";
  }
  return null;
}

export function defaultMicroContext(promotionMode: PromotionMode): MicroWizardContext {
  return { promotionMode };
}

export function intakePathFromChoice(choice: IntakePath): IntakePath {
  return choice;
}

export type ConceptVideoSubpath = "creative_video" | "brand_video" | "reference_reel";

export function setVideoSubpath(
  ctx: MicroWizardContext,
  subpath: VideoSubpath | ConceptVideoSubpath,
): MicroWizardContext {
  return { ...ctx, videoSubpath: subpath as VideoSubpath };
}
