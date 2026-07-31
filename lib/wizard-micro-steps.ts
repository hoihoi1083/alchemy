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
  isUgcPresenterStyle,
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
  researchReelDownloadBusy: boolean;
  referenceClipLoading: boolean;
  imageBusy: boolean;
  videoBusy: boolean;
  imageUrl: string | null;
  videoUrl: string | null;
  promptExtra: string;
  /** True after user applies a research angle / reference post on the intake step. */
  contentResearchApplied: boolean;
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
  // product_image_direct: style + optional ref live inside setup.pre_generate
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
  // wait.image_generate / wait.video_generate / wait.storyboard_generate:
  // advance only when the job succeeds (see useWizardMicroStep dedicated effects).
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

/** Concept image / combined storyboard: pick 概念助手 OR 平台研究 — not both. */
export function needsConceptSourceSplit(
  ctx: MicroWizardContext,
  state: Pick<WizardMicroStepState, "visualStyleId">,
): boolean {
  if (ctx.promotionMode !== "concept") return false;
  if (ctx.workflowMode === "image-only") return true;
  if (ctx.workflowMode === "combined") {
    // Image+video storyboard path (default). Cinematic stitch / single cinematic skip this split.
    const cinematic =
      ctx.combinedStyle === "cinematic" || state.visualStyleId === "concept-cinematic";
    return !cinematic;
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
  if (expr === "!referenceAd") return !state.referenceAd;
  if (expr === "!referenceIsVideo") return !state.referenceIsVideo;
  // Skip MP4 picker unless a real video file is attached (not a stuck boolean flag).
  if (expr === "combinedNoReel") {
    return !(state.referenceAd && state.referenceIsVideo);
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
  if (norm === 'visualStyleId !== "ugc-presenter"') {
    return state.visualStyleId !== "ugc-presenter";
  }
  if (norm === "referenceIsVideo") return state.referenceIsVideo;
  if (norm === "shipItEligible") return state.shipItEligible;
  if (norm === "research.pick_angle && !referenceAd") {
    return isContentResearchStyleExtra(state.promptExtra) && !state.referenceAd;
  }
  if (norm === "researchReelDownloadBusy") {
    return state.researchReelDownloadBusy || state.referenceClipLoading;
  }
  return true;
}

export function resolvePathId(
  ctx: MicroWizardContext,
  state: Pick<WizardMicroStepState, "visualStyleId" | "promptExtra">,
): MicroWizardPathId | null {
  const { workflowMode, promotionMode, intakePath } = ctx;
  if (!workflowMode || !promotionMode || !intakePath) return null;

  // UGC from video subpath must stay on product_video_direct (image keyframe + HeyGen),
  // even when wizard state flips to combined for the talking-head pipeline.
  if (
    promotionMode === "physical" &&
    intakePath === "direct" &&
    (ctx.videoSubpath === "ugc_presenter" ||
      (isUgcPresenterStyle(state.visualStyleId) && workflowMode === "video-only"))
  ) {
    return "product_video_direct";
  }

  if (promotionMode === "concept" && workflowMode === "combined") {
    if (
      state.visualStyleId === "concept-cinematic" ||
      ctx.combinedStyle === "cinematic"
    ) {
      return "concept_combined_cinematic";
    }
    // Combined + research always uses the reel storyboard path (not animate poster).
    if (intakePath === "research") {
      return "concept_video_research_reel";
    }
    return "concept_combined";
  }

  if (promotionMode === "physical" && workflowMode === "combined") {
    // Combined + research always storyboard reel path (force style at intake).
    if (intakePath === "research") {
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
    // Research UI is completed on the intake fuse (route.intake) — skip legacy
    // research.platform / pick_angle / wait.research_apply so Continue doesn't
    // drop users onto a duplicate research screen.
    if (
      ctx.intakePath === "research" &&
      (id === "research.platform" ||
        id === "research.pick_angle" ||
        id === "wait.research_apply")
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
  // Combined reel is always multi-scene stills (UGC / cinematic use other paths).
  if (isUgcPresenterStyle(state.visualStyleId)) return ids;
  if (state.visualStyleId === "concept-cinematic") return ids;
  if (ids.includes("image.storyboard_scenes")) return ids;

  // Drop a misplaced brief so we can re-insert the full block after setup.
  const base: MicroStepId[] = ids.filter((id) => id !== "copy.storyboard_brief");

  // After research/setup — never before reference reel / product photo.
  // Do NOT use early `video.settings` (reorderReelVideoSettings moves it up).
  const setupAnchors = [
    base.indexOf("asset.product_photo"),
    base.indexOf("copy.edit"),
    base.indexOf("wait.reel_analyze"),
    base.indexOf("asset.reference_video"),
  ].filter((i) => i >= 0);
  let insertAt = setupAnchors.length
    ? Math.max(...setupAnchors) + 1
    : base.indexOf("video.generate");
  if (insertAt < 0) insertAt = base.length;

  const next = [...base];
  const storyboardBlock: MicroStepId[] = [
    "copy.storyboard_brief",
    "image.storyboard_scenes",
    "wait.storyboard_generate",
  ];
  next.splice(insertAt, 0, ...storyboardBlock);
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

function injectArtStyle(ids: MicroStepId[], state?: WizardMicroStepState): MicroStepId[] {
  // UGC talking-head keyframes are photoreal-only — no art-style picker.
  if (state && isUgcPresenterStyle(state.visualStyleId)) return ids;
  // Fused pre-generate already includes art style / options / generate.
  if (ids.includes("setup.pre_generate")) return ids;
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

  /** Keep creation-path on screen after pick until user taps Continue. */
  const finish = (next: MicroStepId[]) =>
    wrapSteps(next[0] === "route.output_goal" ? next : ["route.output_goal", ...next], ctx);

  if (!ctx.promotionMode) {
    ids.push("route.subject");
    return finish(ids);
  }

  if (ctx.promotionMode === "concept" && ctx.workflowMode === "combined") {
    // Image+video defaults to storyboard; cinematic multi-scene stitch is hidden from the picker.
    const cinematic =
      ctx.combinedStyle === "cinematic" ||
      state.visualStyleId === "concept-cinematic";
    if (cinematic && state.visualStyleId !== "concept-cinematic") {
      ids.push("route.cinematic_mode");
    }
    if (cinematic && state.cinematicStitchReel) {
      ids.push("cinematic.scene_count");
    }
  }

  const conceptSplit = needsConceptSourceSplit(ctx, state);

  // Name page → fused Research | Direct (or Assistant) tabs. Concept source is
  // chosen on route.intake (no standalone route.concept_source ChoiceCards).
  if (!ctx.intakePath) {
    if (conceptSplit || ctx.promotionMode === "concept") {
      if (conceptSplit) {
        ids.push("identity.concept_topic");
      } else {
        ids.push("identity.concept");
      }
    } else {
      ids.push("identity.product_name");
    }
    ids.push("route.intake");
    return finish(ids);
  }

  // Video-only + direct must pick a style (promo / UGC / …) before the full path resolves.
  // Otherwise resumeStepIndex skips route.video_subpath (it's a routing prefix) and UGC never appears.
  if (ctx.workflowMode === "video-only" && ctx.intakePath === "direct" && !ctx.videoSubpath) {
    return finish(["route.video_subpath"]);
  }

  const pathId = resolvePathId(ctx, state);
  if (!pathId) {
    ids.push("route.intake");
    return finish(ids);
  }

  // 圖+片 (except UGC / cinematic): always evaluate steps as storyboard-video so
  // DeepSeek scene planning + scene confirm never disappear after restore/HMR.
  let resolveState = state;
  if (
    ctx.workflowMode === "combined" &&
    !isUgcPresenterStyle(state.visualStyleId) &&
    state.visualStyleId !== "concept-cinematic" &&
    (pathId === "product_combined" ||
      pathId === "concept_combined" ||
      REEL_PATHS.has(pathId))
  ) {
    resolveState = { ...state, visualStyleId: "storyboard-video" };
  }

  if (pathId === "product_combined" || pathId === "concept_combined") {
    const path = graph.paths[pathId];
    if (path && "merge" in path && path.merge) {
      return finish(
        injectIntakeHistory(
          injectArtStyle(expandMergedPath(pathId, ctx, resolveState), resolveState),
          ctx,
          resolveState,
        ),
      );
    }
  }

  let pathSteps = filterGraphSteps(graphStepsForPath(pathId), resolveState, ctx);
  if (REEL_PATHS.has(pathId)) {
    pathSteps = reorderReelVideoSettings(pathSteps);
    pathSteps = injectReelStoryboardBranch(pathSteps, ctx, resolveState);
  }
  pathSteps = injectArtStyle(pathSteps, resolveState);
  pathSteps = injectPrimaryStyle(pathSteps, pathId, resolveState);
  pathSteps = injectIntakeHistory(pathSteps, ctx, resolveState);

  return finish(pathSteps);
}

/** Keep product-name + intake in the resolved list after path commit so Back works. */
function injectIntakeHistory(
  ids: MicroStepId[],
  ctx: MicroWizardContext,
  state: WizardMicroStepState,
): MicroStepId[] {
  if (!ctx.intakePath) return ids;
  if (ids.includes("route.intake")) return ids;

  const head: MicroStepId[] = [];
  if (ctx.promotionMode === "physical") {
    head.push("identity.product_name");
  } else if (ctx.promotionMode === "concept") {
    // Assistant uses identity.concept; research uses concept_topic.
    // Prefer conceptSource once chosen — don't re-open topic on assistant paths.
    if (ctx.conceptSource === "assistant") {
      head.push("identity.concept");
    } else if (ctx.conceptSource === "research" || needsConceptSourceSplit(ctx, state)) {
      head.push("identity.concept_topic");
    } else {
      head.push("identity.concept");
    }
  }
  head.push("route.intake");
  return [...head, ...ids];
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
  // Physical combined/video needs a product photo — don't offer Skip (Next is already gated).
  if (id === "asset.product_photo" && ctx?.promotionMode === "physical") return false;
  // 圖+片 research: MP4 only when a real reel exists — image posts use style refs instead.
  if (id === "asset.reference_video" && ctx?.workflowMode === "combined") return true;
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

export function microStepLegacyKey(
  id: MicroStepId,
  state?: Pick<WizardMicroStepState, "visualStyleId">,
): "setup" | "image" | "video" | "done" | null {
  // image.review stays in micro-wizard (ImageResultPanel); only storyboard needs full ImageStep.
  if (id === "image.storyboard_scenes") return "image";
  // UGC: hand off to classic VideoStep for PresenterAvatarPicker + HeyGen generate.
  if (id === "video.generate" && state && isUgcPresenterStyle(state.visualStyleId)) {
    return "video";
  }
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
  if (id === "route.intake") {
    if (!ctx.intakePath) return "pick_intake";
    // Physical product: Research tab alone is not enough — must apply a direction first.
    // Concept uses Research | Assistant with different completion rules.
    // Unlock when style prompt is set, cover was attached, or apply-ref was written
    // (product-shot angles may clear promptExtra but still attach the reference).
    if (
      ctx.promotionMode === "physical" &&
      ctx.intakePath === "research" &&
      !isContentResearchStyleExtra(state.promptExtra) &&
      !state.imageRefPhoto &&
      !state.contentResearchApplied
    ) {
      return "complete_research";
    }
  }
  if (id === "route.concept_source" && !ctx.conceptSource) return "pick_concept_source";
  if (id === "route.video_subpath" && !ctx.videoSubpath) return "pick_video_subpath";
  if (id === "identity.product_name" && !state.product.trim()) return "need_product_name";
  if (id === "identity.concept" && !state.conceptIdea.trim()) return "need_concept";
  if (id === "identity.concept_topic" && !state.conceptIdea.trim()) return "need_concept_topic";
  if (id === "asset.product_photo" && ctx.promotionMode === "physical" && !state.productPhoto) {
    return "need_product_photo";
  }
  if (id === "setup.pre_generate") {
    if (state.referenceAnalyzeBusy) return "reference_analyzing";
    if (
      state.imageRefPhoto &&
      !state.userReferenceBrief &&
      !state.referenceAnalyzeNote
    ) {
      return "reference_analyzing";
    }
    if (ctx.promotionMode === "physical" && !state.productPhoto) {
      return "need_product_photo";
    }
    if (
      !state.imageRefPhoto &&
      !state.headline.trim() &&
      !state.product.trim()
    ) {
      return "need_headline";
    }
  }
  if (id === "copy.creative_brief" && !state.creativeVideoBrief.trim()) {
    return "need_creative_brief";
  }
  if (id === "asset.reference_video") {
    // Never hard-block. Image research posts have no reel; combined storyboard
    // uses style images. Manual MP4 is optional enrichment only.
    return null;
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
  if (id === "wait.storyboard_generate" && state.imageBusy) return "image_busy";
  if (id === "image.review" && !state.imageUrl && !state.imageBusy) return "image_not_ready";
  if (id === "wait.video_generate" && state.videoBusy) return "video_busy";
  if (id === "wait.video_generate" && !state.videoUrl) return "video_not_ready";
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
