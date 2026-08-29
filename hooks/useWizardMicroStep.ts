"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { ConceptSource } from "@/lib/concept-source-state";
import {
  clearConceptAssistantState,
  clearConceptResearchState,
} from "@/lib/concept-source-state";
import {
  clearProjectResumeHint,
  consumeProjectResumeHint,
  peekProjectResumeHint,
} from "@/lib/wizard-project-snapshot";
import {
  canProceedMicroStep,
  defaultMicroContext,
  intakePathForConceptSource,
  isWaitMicroStep,
  microStepLegacyKey,
  resolveMicroSteps,
  resumeStepIndex,
  type WizardMicroStepState,
} from "@/lib/wizard-micro-steps";
import type {
  CombinedStyle,
  IntakePath,
  MicroWizardContext,
  VideoSubpath,
} from "@/lib/wizard-micro-steps.types";
import {
  h3ShotRecipeToSubpath,
  isH3ShotRecipeMode,
  subpathToH3ShotRecipe,
} from "@/lib/h3-shot-recipes";
import {
  WIZARD_CLASSIC_VALUE,
  WIZARD_V2_QUERY_FLAG,
  MICRO_RESUME_DONE_KEY,
  MICRO_RESET_START_KEY,
} from "@/lib/wizard-micro-steps.types";
import {
  microContextForLandingRecipe,
  peekLandingRecipe,
} from "@/lib/landing-recipes";
import { applyContentAngleToWizard } from "@/lib/content-research-apply";
import { enrichAngleVideoFromPlan } from "@/lib/content-research-angle-video";

const CTX_KEY = "wizardV2Context";

function readStoredContext(): Partial<MicroWizardContext> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CTX_KEY);
    return raw ? (JSON.parse(raw) as Partial<MicroWizardContext>) : {};
  } catch {
    return {};
  }
}

function storeContext(ctx: MicroWizardContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CTX_KEY, JSON.stringify(ctx));
}

function clearStoredContext() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CTX_KEY);
}

function wizardStateSnapshot(wizard: StudioWizardValue): WizardMicroStepState {
  return {
    workflowMode: wizard.workflowMode,
    promotionMode: wizard.promotionMode,
    visualStyleId: wizard.visualStyleId,
    imageOutputMode: wizard.imageOutputMode,
    imageRefPhoto: wizard.imageRefPhoto,
    productPhoto: wizard.productPhoto,
    hasProductPhotoLock: wizard.hasProductPhotoLock,
    hasConceptHeroLock: wizard.hasConceptHeroLock,
    referenceAd: wizard.referenceAd,
    referenceIsVideo: wizard.referenceIsVideo,
    product: wizard.product,
    conceptIdea: wizard.conceptIdea,
    headline: wizard.headline,
    subline: wizard.subline,
    offer: wizard.offer,
    business: wizard.business,
    creativeVideoBrief: wizard.creativeVideoBrief,
    storyboardBrief: wizard.storyboardBrief,
    brandWebsiteUrl: wizard.brandWebsiteUrl,
    brandProfile: wizard.brandProfile,
    cinematicStitchReel: wizard.cinematicStitchReel,
    cinematicSceneCount: wizard.cinematicSceneCount,
    videoCreativeMode: wizard.videoCreativeMode,
    videoSettingsDuration: wizard.videoSettings.duration,
    referenceAnalyzeBusy: wizard.referenceAnalyzeBusy,
    brandAnalyzeBusy: wizard.brandAnalyzeBusy,
    researchReelAnalyzeBusy: wizard.researchReelAnalyzeBusy,
    researchReelDownloadBusy: wizard.referenceClipLoading,
    referenceClipLoading: wizard.referenceClipLoading,
    imageBusy: wizard.imageBusy,
    videoBusy: wizard.videoBusy,
    imageUrl: wizard.imageUrl,
    videoUrl: wizard.videoUrl,
    promptExtra: wizard.promptExtra,
    contentResearchApplied: Boolean(wizard.contentResearchApplyRef),
    contentResearchPending: Boolean(wizard.pendingContentResearchPick),
    researchRemapBusy: Boolean(wizard.researchRemapBusy),
    shipItEligible: wizard.shipItEligible,
    hasGeneratedImage: Boolean(
      wizard.imageUrl ||
        wizard.cinematicScenes.length > 0 ||
        wizard.storyboardScenes.length > 0,
    ),
    storyboardGridApproved: wizard.storyboardGridApproved,
    userReferenceBrief: wizard.userReferenceBrief,
    referenceAnalyzeNote: wizard.referenceAnalyzeNote,
    planProductVideoBusy: wizard.planProductVideoBusy,
    planVideoPromptBusy: wizard.planVideoPromptBusy,
  };
}

type ResumeBootstrap = {
  ctx: MicroWizardContext;
  stepIndex: number;
  /** True when no pending library jump (fresh, no hint, or already applied). */
  resumeApplied: boolean;
};

/** Apply library resume hint on first paint so MicroWizard never flashes step 0. */
function bootstrapMicroFromResume(
  promotionMode: PromotionMode,
  wizard: StudioWizardValue,
  freshEntry: boolean,
): ResumeBootstrap {
  if (freshEntry) {
    clearStoredContext();
    clearProjectResumeHint();
  }

  const stored = readStoredContext();
  const sameMode = !stored.promotionMode || stored.promotionMode === promotionMode;
  const recipeId = peekLandingRecipe();
  const recipeMicro = recipeId
    ? microContextForLandingRecipe(recipeId, promotionMode)
    : null;
  const hint = freshEntry ? null : peekProjectResumeHint();

  const ctx: MicroWizardContext = {
    ...defaultMicroContext(promotionMode),
    ...(recipeMicro ?? (sameMode && !freshEntry ? stored : {})),
    ...(hint?.microContext ?? {}),
    promotionMode,
  };

  if (recipeId && !hint?.targetMicroStep) {
    return {
      ctx,
      stepIndex: resumeStepIndex(resolveMicroSteps(ctx, wizardStateSnapshot(wizard))),
      resumeApplied: true,
    };
  }

  if (!hint) {
    return { ctx, stepIndex: 0, resumeApplied: true };
  }

  const hasScenes = wizard.storyboardScenes.length > 0;
  const hasVideo = Boolean(wizard.videoUrl);
  const hasImage = Boolean(wizard.imageUrl || wizard.campaignSlides.length > 0);
  const target = hint.targetMicroStep;
  const readyForTarget =
    !target ||
    (target === "image.review" && hasScenes) ||
    (target === "done.export" && hasVideo) ||
    (target === "setup.pre_video" && (hasImage || hasScenes));

  if (!readyForTarget || !target) {
    return { ctx, stepIndex: 0, resumeApplied: !target };
  }

  const steps = resolveMicroSteps(ctx, wizardStateSnapshot(wizard));
  let idx = steps.findIndex((s) => s.id === target);
  if (idx < 0 && hasScenes) {
    idx = steps.findIndex((s) => s.id === "image.review");
  }
  consumeProjectResumeHint();
  return {
    ctx,
    stepIndex: idx >= 0 ? idx : 0,
    resumeApplied: true,
  };
}

export function useWizardMicroStep(wizard: StudioWizardValue, promotionMode: PromotionMode) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const freshEntry = searchParams.get("fresh") === "1";

  const [boot] = useState(() => bootstrapMicroFromResume(promotionMode, wizard, freshEntry));
  const [ctx, setCtx] = useState<MicroWizardContext>(() => boot.ctx);
  const [stepIndex, setStepIndex] = useState(() => boot.stepIndex);
  const [finishedSetup, setFinishedSetup] = useState(false);
  const [pendingIntakePath, setPendingIntakePath] = useState<IntakePath | undefined>();
  const [pendingConceptSource, setPendingConceptSource] = useState<ConceptSource | undefined>();
  const [pendingVideoSubpath, setPendingVideoSubpath] = useState<VideoSubpath | undefined>();
  const autoAdvancedRef = useRef<string | null>(null);
  /** Prevents double Continue / stale media when a research apply is in flight. */
  const researchApplyInFlightRef = useRef(false);
  const researchApplyGenRef = useRef(0);
  /** Live pending angle id — async goNext must not trust a stale React closure. */
  const pendingResearchAngleIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = wizard.pendingContentResearchPick?.angle?.id ?? null;
    const prev = pendingResearchAngleIdRef.current;
    pendingResearchAngleIdRef.current = id;
    // Re-pick while apply A is running: invalidate A and unlock Continue for B.
    if (researchApplyInFlightRef.current && id !== prev) {
      researchApplyGenRef.current += 1;
      researchApplyInFlightRef.current = false;
    }
  }, [wizard.pendingContentResearchPick]);

  useEffect(() => {
    if (!freshEntry) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("fresh");
    const qs = params.toString();
    router.replace(qs ? `/studio?${qs}` : "/studio", { scroll: false });
  }, [freshEntry, router, searchParams]);

  useEffect(() => {
    storeContext(ctx);
  }, [ctx]);

  const projectResumeDoneRef = useRef(boot.resumeApplied);
  const projectResumeCtxSeededRef = useRef(false);

  // Open Studio hydrate: restore micro routing + jump to review/done when media exists.
  useEffect(() => {
    if (freshEntry || projectResumeDoneRef.current) return;
    const hint = peekProjectResumeHint();
    if (!hint) return;

    const hasScenes = wizard.storyboardScenes.length > 0;
    const hasVideo = Boolean(wizard.videoUrl);
    const hasImage = Boolean(wizard.imageUrl || wizard.campaignSlides.length > 0);
    const readyForTarget =
      !hint.targetMicroStep ||
      (hint.targetMicroStep === "image.review" && hasScenes) ||
      (hint.targetMicroStep === "done.export" && hasVideo) ||
      (hint.targetMicroStep === "setup.pre_video" && (hasImage || hasScenes));

    if (!readyForTarget) {
      if (hint.microContext && !projectResumeCtxSeededRef.current) {
        projectResumeCtxSeededRef.current = true;
        setCtx((prev) => ({ ...prev, ...hint.microContext, promotionMode }));
      }
      return;
    }

    const consumed = consumeProjectResumeHint();
    if (!consumed) return;
    projectResumeDoneRef.current = true;

    const nextCtx = {
      ...defaultMicroContext(promotionMode),
      ...consumed.microContext,
      promotionMode,
    };
    setCtx(nextCtx);

    const target = consumed.targetMicroStep;
    if (!target) return;

    const nextSteps = resolveMicroSteps(nextCtx, wizardStateSnapshot(wizard));
    let idx = nextSteps.findIndex((s) => s.id === target);
    if (idx < 0 && hasScenes) {
      idx = nextSteps.findIndex((s) => s.id === "image.review");
    }
    if (idx >= 0) setStepIndex(idx);
  }, [
    freshEntry,
    promotionMode,
    wizard.storyboardScenes.length,
    wizard.videoUrl,
    wizard.imageUrl,
    wizard.campaignSlides.length,
    wizard.workflowMode,
    wizard.visualStyleId,
    wizard.product,
    wizard.conceptIdea,
    wizard.storyboardGridApproved,
  ]);

  // Keep wizard.workflowMode in sync with micro ctx. After refresh, ctx restores from
  // sessionStorage (e.g. combined) while wizard defaults to image-only.
  // Use setWorkflowMode only — onWorkflowModeChange() resets stepKey to setup.
  // When syncing TO combined, also lock storyboard style (mode-only sync left 單圖動態).
  const wizardWorkflowMode = wizard.workflowMode;
  const setWizardWorkflowMode = wizard.setWorkflowMode;
  useEffect(() => {
    if (!ctx.workflowMode) return;
    if (wizardWorkflowMode !== ctx.workflowMode) {
      setWizardWorkflowMode(ctx.workflowMode);
    }
    if (ctx.workflowMode !== "combined") return;
    if (wizard.videoCreativeMode === "motion-poster") return;
    if (wizard.videoCreativeMode === "social-drip") return;
    if (wizard.videoCreativeMode === "blockbuster") return;
    if (isH3ShotRecipeMode(wizard.videoCreativeMode)) return;
    if (wizard.isUgcPresenterOutput || wizard.visualStyleId === "concept-cinematic") return;
    if (wizard.visualStyleId !== "storyboard-video") {
      wizard.selectVisualStyle("storyboard-video");
    }
    if (wizard.imageOutputMode !== "single") {
      wizard.setImageOutputMode("single");
    }
    if (wizard.shipItMode) {
      wizard.setShipItMode(false);
    }
  }, [
    ctx.workflowMode,
    wizardWorkflowMode,
    setWizardWorkflowMode,
    wizard.isUgcPresenterOutput,
    wizard.visualStyleId,
    wizard.imageOutputMode,
    wizard.shipItMode,
    wizard.videoCreativeMode,
    wizard.selectVisualStyle,
    wizard.setImageOutputMode,
    wizard.setShipItMode,
  ]);

  useEffect(() => {
    if (wizard.videoCreativeMode !== "blockbuster") return;
    if (ctx.workflowMode === "video-only" && ctx.videoSubpath === "blockbuster") {
      return;
    }
    setCtx((prev) => ({
      ...prev,
      workflowMode: "video-only",
      videoSubpath: "blockbuster",
    }));
  }, [wizard.videoCreativeMode, ctx.workflowMode, ctx.videoSubpath]);

  useEffect(() => {
    const mode = wizard.videoCreativeMode;
    if (!isH3ShotRecipeMode(mode)) return;
    const subpath = h3ShotRecipeToSubpath(mode);
    if (ctx.workflowMode === "video-only" && ctx.videoSubpath === subpath) {
      return;
    }
    setCtx((prev) => ({
      ...prev,
      workflowMode: "video-only",
      videoSubpath: subpath,
    }));
  }, [wizard.videoCreativeMode, ctx.workflowMode, ctx.videoSubpath]);

  // Reverse sync: restored / landing ctx.videoSubpath can be neon_on_real while
  // wizard still defaults to product-assistant — that shows neon UX + "analyze
  // photo" product-assistant block. Force creative mode to match the subpath.
  useEffect(() => {
    const sub = ctx.videoSubpath;
    if (!sub) return;
    const h3Mode = subpathToH3ShotRecipe(sub);
    if (h3Mode) {
      if (wizard.videoCreativeMode === h3Mode) return;
      wizard.onVideoCreativeModeChange(h3Mode);
      return;
    }
    if (sub === "blockbuster" && wizard.videoCreativeMode !== "blockbuster") {
      wizard.onVideoCreativeModeChange("blockbuster");
      return;
    }
    if (sub === "motion_poster" && wizard.videoCreativeMode !== "motion-poster") {
      wizard.onVideoCreativeModeChange("motion-poster");
      return;
    }
    if (sub === "impact_poster" && wizard.videoCreativeMode !== "impact-poster") {
      wizard.onVideoCreativeModeChange("impact-poster");
      return;
    }
    if (sub === "social_drip" && wizard.videoCreativeMode !== "social-drip") {
      wizard.onVideoCreativeModeChange("social-drip");
      return;
    }
    if (sub === "vacuum_inflate" && wizard.videoCreativeMode !== "vacuum-inflate") {
      wizard.onVideoCreativeModeChange("vacuum-inflate");
      return;
    }
    if (sub === "creative_motion" && wizard.videoCreativeMode !== "creative-motion") {
      wizard.onVideoCreativeModeChange("creative-motion");
      return;
    }
    if (sub === "hand_throw_scene" && wizard.videoCreativeMode !== "hand-throw-scene") {
      wizard.onVideoCreativeModeChange("hand-throw-scene");
      return;
    }
    if (sub === "product_explode" && wizard.videoCreativeMode !== "product-explode") {
      wizard.onVideoCreativeModeChange("product-explode");
    }
  }, [ctx.videoSubpath, wizard.videoCreativeMode, wizard.onVideoCreativeModeChange]);

  useEffect(() => {
    setCtx((prev) => ({
      ...prev,
      promotionMode,
    }));
  }, [promotionMode]);

  const state = useMemo(
    () => wizardStateSnapshot(wizard),
    [
      wizard,
      wizard.imageRefPhoto,
      wizard.userReferenceBrief,
      wizard.referenceAnalyzeNote,
      wizard.referenceAnalyzeBusy,
      wizard.imageUrl,
      wizard.imageBusy,
      wizard.promptExtra,
      wizard.contentResearchApplyRef,
      wizard.pendingContentResearchPick,
      wizard.researchRemapBusy,
      wizard.product,
      wizard.headline,
      wizard.subline,
      wizard.referenceAd,
      wizard.referenceIsVideo,
      wizard.referenceClipLoading,
      wizard.researchReelAnalyzeBusy,
      wizard.researchReelAnalyzeNote,
      wizard.researchReelAnalysis,
      wizard.videoSettings.duration,
      wizard.videoPrompt,
      wizard.productPhoto,
    ],
  );

  const steps = useMemo(() => resolveMicroSteps(ctx, state), [ctx, state]);

  // After classic DoneStep leak, remount on setup and jump to violet video result.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let resume = false;
    try {
      resume = sessionStorage.getItem(MICRO_RESUME_DONE_KEY) === "1";
      if (resume) sessionStorage.removeItem(MICRO_RESUME_DONE_KEY);
    } catch {
      return;
    }
    if (!resume) return;
    const doneIdx = steps.findIndex((s) => s.id === "done.export");
    if (doneIdx < 0) return;
    setFinishedSetup(false);
    setStepIndex(doneIdx);
  }, [steps]);

  // Assistant in-studio handoff: restart micro path at step 0 (stay on v2, not classic).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let reset = false;
    try {
      reset = sessionStorage.getItem(MICRO_RESET_START_KEY) === "1";
      if (reset) sessionStorage.removeItem(MICRO_RESET_START_KEY);
    } catch {
      return;
    }
    if (!reset) return;
    setFinishedSetup(false);
    setStepIndex(0);
  }, [wizard.workflowMode, wizard.visualStyleId, wizard.stepKey, steps.length]);

  useEffect(() => {
    if (stepIndex >= steps.length && steps.length > 0) {
      setStepIndex(steps.length - 1);
    }
  }, [stepIndex, steps.length]);

  // Re-anchor when dynamic wait steps insert/remove — never trust a bare index.
  const anchoredIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = steps[stepIndex]?.id ?? null;
    if (id) anchoredIdRef.current = id;
  }, [stepIndex, steps]);

  useEffect(() => {
    const want = anchoredIdRef.current;
    if (!want || steps.length === 0) return;
    const idx = steps.findIndex((s) => s.id === want);
    if (idx >= 0) {
      if (idx !== stepIndex) setStepIndex(idx);
      return;
    }
    // Step vanished (e.g. wait.reel_download when busy cleared) — land on setup.
    if (want === "wait.reel_download" || want === "wait.reel_analyze") {
      const setup = steps.findIndex(
        (s) => s.id === "setup.pre_generate" || s.id === "setup.pre_video",
      );
      if (setup >= 0) {
        setStepIndex(setup);
        return;
      }
    }
  }, [steps, stepIndex]);

  const currentStep = steps[stepIndex] ?? null;
  const currentId = currentStep?.id ?? null;

  const proceedCtx = useMemo((): MicroWizardContext => {
    if (currentId === "route.intake") {
      const conceptSource = pendingConceptSource ?? ctx.conceptSource;
      const intakeFromConcept = conceptSource
        ? intakePathForConceptSource(conceptSource)
        : undefined;
      const intakePath = pendingIntakePath ?? ctx.intakePath ?? intakeFromConcept;
      if (!intakePath) return ctx;
      return {
        ...ctx,
        intakePath,
        ...(conceptSource ? { conceptSource } : {}),
      };
    }
    if (currentId === "route.concept_source") {
      const conceptSource = pendingConceptSource ?? ctx.conceptSource;
      if (!conceptSource) return ctx;
      return {
        ...ctx,
        conceptSource,
        intakePath: intakePathForConceptSource(conceptSource),
      };
    }
    if (currentId === "route.video_subpath" || currentId === "setup.pre_video") {
      const videoSubpath =
        pendingVideoSubpath ??
        ctx.videoSubpath ??
        (ctx.workflowMode === "video-only" && ctx.intakePath === "research"
          ? "reference_reel"
          : ctx.workflowMode === "video-only" && ctx.intakePath === "direct"
            ? ctx.promotionMode === "concept"
              ? "creative_video"
              : "product_promo"
            : undefined);
      return videoSubpath ? { ...ctx, videoSubpath } : ctx;
    }
    return ctx;
  }, [ctx, currentId, pendingConceptSource, pendingIntakePath, pendingVideoSubpath]);

  const blockReason = currentId ? canProceedMicroStep(currentId, proceedCtx, state) : null;

  const patchContext = useCallback((patch: Partial<MicroWizardContext>) => {
    setCtx((prev) => ({ ...prev, ...patch }));
  }, []);

  const goClassic = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(WIZARD_V2_QUERY_FLAG, WIZARD_CLASSIC_VALUE);
    params.delete("fresh");
    router.replace(`/studio?${params.toString()}`);
  }, [router, searchParams]);

  const handoffLegacy = useCallback(
    (key: "image" | "video" | "done") => {
      // Storyboard / combined research must not hand off while wizard is still image-only.
      // Do not call onWorkflowModeChange — it resets stepKey to setup.
      if (
        (key === "image" || key === "video") &&
        (ctx.workflowMode === "combined" || ctx.workflowMode === "video-only") &&
        wizard.workflowMode === "image-only"
      ) {
        wizard.setWorkflowMode(ctx.workflowMode);
      }
      // 圖+片 → always storyboard style before ImageStep (except UGC / cinematic).
      if (
        key === "image" &&
        (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
        !wizard.isUgcPresenterOutput &&
        wizard.visualStyleId !== "concept-cinematic"
      ) {
        if (wizard.visualStyleId !== "storyboard-video") {
          wizard.selectVisualStyle("storyboard-video");
        }
        if (wizard.imageOutputMode !== "single") {
          wizard.setImageOutputMode("single");
        }
      }
      setFinishedSetup(true);
      wizard.setStepKey(key);
    },
    [ctx.workflowMode, wizard],
  );

  useEffect(() => {
    if (!currentId) return;
    const legacy = microStepLegacyKey(currentId, {
      visualStyleId: wizard.visualStyleId,
    });
    if (legacy === "image" || legacy === "video" || legacy === "done") {
      handoffLegacy(legacy);
    }
  }, [currentId, handoffLegacy, wizard.visualStyleId]);

  const goNext = useCallback(async () => {
    if (!currentId || blockReason) return;
    if (
      (currentId === "setup.pre_generate" || currentId === "image.generate") &&
      wizard.imageGenerateDisabledReason
    ) {
      return;
    }
    if (
      (currentId === "setup.pre_video" || currentId === "video.generate") &&
      wizard.videoGenerateDisabledReason
    ) {
      return;
    }

    // Await AI motion plans before leaving the step (do not race ahead of busy).
    if (currentId === "video.product_plan") {
      if (wizard.planProductVideoBusy) return;
      if (!wizard.productVideoPlan) {
        const ok = await wizard.planProductVideo();
        if (!ok) return;
      }
    }
    if (currentId === "video.ai_prompt") {
      if (wizard.planVideoPromptBusy) return;
      if (!wizard.videoPrompt.trim()) {
        const ok = await wizard.planAiVideoPrompt();
        if (!ok) return;
      }
    }

    if (currentId === "image.generate" || currentId === "setup.pre_generate") {
      // Combined storyboard: require editable DeepSeek outline before Nano Banana spend.
      if (
        wizard.workflowMode === "combined" &&
        wizard.isStoryboardOutput &&
        !wizard.storyboardPlan
      ) {
        wizard.setError(wizard.m.wizard.storyboardPlanReviewHint);
        return;
      }
      void wizard.generateImage();
      autoAdvancedRef.current = null;
      setStepIndex((i) => i + 1);
      return;
    }

    if (currentId === "setup.pre_video") {
      void wizard.generateVideo();
      autoAdvancedRef.current = null;
      setStepIndex((i) => i + 1);
      return;
    }

    // Combined storyboard stays in-micro. Cinematic still hands off to ImageStep.
    if (currentId === "image.storyboard_scenes") {
      if (wizard.visualStyleId === "concept-cinematic") {
        handoffLegacy("image");
        return;
      }
      autoAdvancedRef.current = null;
      setStepIndex((i) => i + 1);
      return;
    }

    if (currentId === "video.generate") {
      void wizard.generateVideo();
      autoAdvancedRef.current = null;
      setStepIndex((i) => i + 1);
      return;
    }

    if (currentId === "route.output_goal" && ctx.workflowMode) {
      wizard.onWorkflowModeChange(ctx.workflowMode);
      // Image+video: 分鏡 storyboard only (no UGC / single-poster Ship-it / cinematic stitch).
      if (ctx.workflowMode === "combined" && ctx.combinedStyle !== "cinematic") {
        patchContext({ combinedStyle: "storyboard" });
        if (wizard.visualStyleId !== "concept-cinematic") {
          wizard.selectVisualStyle("storyboard-video");
        }
      }
    }

    if (currentId === "route.intake") {
      const conceptSource = pendingConceptSource ?? ctx.conceptSource;
      const intakePath =
        pendingIntakePath ??
        ctx.intakePath ??
        (conceptSource ? intakePathForConceptSource(conceptSource) : undefined);
      if (!intakePath) return;

      const finishIntakeAdvance = () => {
        const wizardApi = {
          setImageRefPhoto: wizard.setImageRefPhoto,
          setImageCreativeMode: wizard.setImageCreativeMode,
          setExtraKitPhotos: wizard.setExtraKitPhotos,
          setContentResearchApplyRef: wizard.setContentResearchApplyRef,
          setUserReferenceBrief: wizard.setUserReferenceBrief,
          setPromptExtra: wizard.setPromptExtra,
          setCreativeVideoBrief: wizard.setCreativeVideoBrief,
          setHeadline: wizard.setHeadline,
          setSubline: wizard.setSubline,
          setOffer: wizard.setOffer,
          onReferenceAdFile: wizard.onReferenceAdFile,
        };

        let nextCtx: MicroWizardContext = { ...ctx, intakePath };
        if (intakePath === "research") {
          nextCtx = { ...nextCtx, intakeTemplateMode: undefined };
        }
        if (wizard.promotionMode === "concept" && conceptSource) {
          if (conceptSource === "assistant") clearConceptResearchState(wizardApi);
          else clearConceptAssistantState(wizardApi);
          nextCtx = { ...nextCtx, conceptSource };
          setPendingConceptSource(undefined);
        }

        patchContext(nextCtx);
        setPendingIntakePath(undefined);
        if (intakePath === "direct") {
          wizard.setImageCreativeMode(wizard.imageRefPhoto ? "reference-concept" : "promo-ai");
        }
        if (
          intakePath === "direct" &&
          (nextCtx.workflowMode === "video-only" || wizard.workflowMode === "video-only") &&
          !nextCtx.videoSubpath
        ) {
          const defaultSub =
            wizard.promotionMode === "concept"
              ? ("creative_video" as const)
              : ("product_promo" as const);
          nextCtx = { ...nextCtx, videoSubpath: defaultSub };
          patchContext(nextCtx);
          if (defaultSub === "product_promo") wizard.applyPrimaryPathVideoOnly("creative");
          else wizard.applyPrimaryPathConceptVideo("creative");
        }
        if (
          intakePath === "research" &&
          (nextCtx.workflowMode === "video-only" || wizard.workflowMode === "video-only") &&
          !nextCtx.videoSubpath
        ) {
          nextCtx = { ...nextCtx, videoSubpath: "reference_reel" };
          patchContext(nextCtx);
        }
        if (
          intakePath === "research" &&
          (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
          !wizard.isUgcPresenterOutput &&
          wizard.visualStyleId !== "concept-cinematic"
        ) {
          wizard.selectVisualStyle("storyboard-video");
        }
        const nextState = {
          ...state,
          visualStyleId:
            intakePath === "research" &&
            (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
            !wizard.isUgcPresenterOutput &&
            wizard.visualStyleId !== "concept-cinematic"
              ? ("storyboard-video" as const)
              : state.visualStyleId,
          contentResearchApplied: Boolean(
            wizard.contentResearchApplyRef || wizard.pendingContentResearchPick,
          ),
          contentResearchPending: false,
        };
        const nextSteps = resolveMicroSteps(nextCtx, nextState);
        autoAdvancedRef.current = null;
        const downloadIdx = nextSteps.findIndex((s) => s.id === "wait.reel_download");
        if (downloadIdx >= 0) setStepIndex(downloadIdx);
        else setStepIndex(resumeStepIndex(nextSteps));
      };

      const pick = wizard.pendingContentResearchPick;
      // Any pending pick must apply (including same angle re-select after Back).
      const needsResearchApply = intakePath === "research" && Boolean(pick);
      if (needsResearchApply && pick) {
        if (researchApplyInFlightRef.current) return;
        researchApplyInFlightRef.current = true;
        const applyToken = ++researchApplyGenRef.current;
        const angleIdAtStart = pick.angle.id;
        void (async () => {
          try {
            const angleToApply = enrichAngleVideoFromPlan(pick.angle, pick.plan);
            const promoteLive =
              pick.promotionMode === "concept"
                ? wizard.conceptIdea.trim() || pick.promoteProduct
                : wizard.product.trim() || pick.promoteProduct;
            await applyContentAngleToWizard(
              angleToApply,
              pick.plan,
              pick.promotionMode,
              {
                setHeadline: wizard.setHeadline,
                setSubline: wizard.setSubline,
                setOffer: wizard.setOffer,
                setConceptIdea: wizard.setConceptIdea,
                setProduct: wizard.setProduct,
                setPromptExtra: wizard.setPromptExtra,
                setImageOutputMode: wizard.setImageOutputMode,
                setImageAspectRatio: wizard.setImageAspectRatio,
                setCampaignTheme: wizard.setCampaignTheme,
                selectVisualStyle: wizard.selectVisualStyle,
                onWorkflowModeChange: wizard.onWorkflowModeChange,
                setImageRefPhoto: wizard.setImageRefPhoto,
                setImageCreativeMode: wizard.setImageCreativeMode,
                onImageInputModeChange: wizard.onImageInputModeChange,
                setExtraKitPhotos: wizard.setExtraKitPhotos,
                setReferenceCarouselSlideCount: wizard.setReferenceCarouselSlideCount,
                setContentResearchApplyRef: wizard.setContentResearchApplyRef,
                setCinematicSceneCount: wizard.onCinematicSceneCountChange,
                onVideoCreativeModeChange: wizard.onVideoCreativeModeChange,
                onReferenceAdFile: wizard.onReferenceAdFile,
                setReferenceResearchCdn: wizard.setReferenceResearchCdn,
                setReferenceClipLoading: wizard.setReferenceClipLoading,
                setError: wizard.setError,
              },
              promoteLive,
              undefined,
              wizard.workflowMode,
              {
                // Step 4 Adapt panel (and user edits) are the copy source of truth.
                preserveCopy: {
                  headline: wizard.headline,
                  subline: wizard.subline,
                  offer: wizard.offer,
                },
              },
            );
            // Stale apply: pick changed or gen invalidated while A was downloading.
            if (applyToken !== researchApplyGenRef.current) {
              wizard.setImageRefPhoto(null);
              wizard.onReferenceAdFile(null);
              wizard.setExtraKitPhotos([]);
              wizard.setContentResearchApplyRef(null);
              return;
            }
            const liveAngleId = pendingResearchAngleIdRef.current;
            if (liveAngleId && liveAngleId !== angleIdAtStart) {
              wizard.setImageRefPhoto(null);
              wizard.onReferenceAdFile(null);
              wizard.setExtraKitPhotos([]);
              wizard.setContentResearchApplyRef(null);
              return;
            }
            wizard.setPendingContentResearchPick(null);
            wizard.setError(null);
            finishIntakeAdvance();
          } catch (e: unknown) {
            if (applyToken === researchApplyGenRef.current) {
              wizard.setError(e instanceof Error ? e.message : "Research apply failed.");
            }
          } finally {
            if (applyToken === researchApplyGenRef.current) {
              researchApplyInFlightRef.current = false;
            }
          }
        })();
        return;
      }

      finishIntakeAdvance();
      return;
    }

    if (currentId === "route.concept_source") {
      const conceptSource = pendingConceptSource ?? ctx.conceptSource;
      if (!conceptSource) return;
      const wizardApi = {
        setImageRefPhoto: wizard.setImageRefPhoto,
        setImageCreativeMode: wizard.setImageCreativeMode,
        setExtraKitPhotos: wizard.setExtraKitPhotos,
        setContentResearchApplyRef: wizard.setContentResearchApplyRef,
        setUserReferenceBrief: wizard.setUserReferenceBrief,
        setPromptExtra: wizard.setPromptExtra,
        setCreativeVideoBrief: wizard.setCreativeVideoBrief,
        setHeadline: wizard.setHeadline,
        setSubline: wizard.setSubline,
        setOffer: wizard.setOffer,
        onReferenceAdFile: wizard.onReferenceAdFile,
      };
      if (conceptSource === "assistant") clearConceptResearchState(wizardApi);
      else clearConceptAssistantState(wizardApi);
      const intakePath = intakePathForConceptSource(conceptSource);
      patchContext({ conceptSource, intakePath });
      setPendingConceptSource(undefined);
      setPendingIntakePath(undefined);
      if (intakePath === "direct") {
        wizard.setImageCreativeMode(wizard.imageRefPhoto ? "reference-concept" : "promo-ai");
      }
      const nextState = {
        ...state,
        visualStyleId:
          intakePath === "research" &&
          (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
          !wizard.isUgcPresenterOutput &&
          wizard.visualStyleId !== "concept-cinematic"
            ? ("storyboard-video" as const)
            : state.visualStyleId,
      };
      const nextSteps = resolveMicroSteps({ ...ctx, conceptSource, intakePath }, nextState);
      autoAdvancedRef.current = null;
      setStepIndex(resumeStepIndex(nextSteps));
      return;
    }

    if (currentId === "identity.concept" && ctx.conceptSource === "assistant") {
      const intakePath = intakePathForConceptSource("assistant");
      patchContext({ intakePath });
      wizard.setImageCreativeMode(wizard.imageRefPhoto ? "reference-concept" : "promo-ai");
      if (
        (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
        ctx.combinedStyle !== "cinematic" &&
        !wizard.isUgcPresenterOutput
      ) {
        wizard.selectVisualStyle("storyboard-video");
      }
      const nextState = {
        ...state,
        visualStyleId:
          (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
          ctx.combinedStyle !== "cinematic" &&
          !wizard.isUgcPresenterOutput
            ? ("storyboard-video" as const)
            : state.visualStyleId,
      };
      const nextSteps = resolveMicroSteps({ ...ctx, intakePath, conceptSource: "assistant" }, nextState);
      autoAdvancedRef.current = null;
      setStepIndex(resumeStepIndex(nextSteps));
      return;
    }

    // Concept topic is only the name page before fused intake tabs — do not lock research path here.

    if (currentId === "route.video_subpath") {
      const videoSubpath = pendingVideoSubpath ?? ctx.videoSubpath;
      if (!videoSubpath) return;
      patchContext({ videoSubpath });
      setPendingVideoSubpath(undefined);
      const nextSteps = resolveMicroSteps({ ...ctx, videoSubpath }, state);
      autoAdvancedRef.current = null;
      setStepIndex(resumeStepIndex(nextSteps));
      return;
    }

    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      setFinishedSetup(true);
      void wizard.goNextFromSetup();
      return;
    }

    autoAdvancedRef.current = null;
    setStepIndex(nextIndex);
  }, [
    blockReason,
    ctx,
    currentId,
    handoffLegacy,
    patchContext,
    pendingConceptSource,
    pendingIntakePath,
    pendingVideoSubpath,
    state,
    stepIndex,
    steps.length,
    wizard,
  ]);

  const goBack = useCallback(() => {
    autoAdvancedRef.current = null;
    if (finishedSetup) {
      if (wizard.stepKey === "video") {
        wizard.goBackFromVideo();
        setFinishedSetup(false);
        setStepIndex(Math.max(0, steps.length - 1));
        return;
      }
      if (wizard.stepKey === "image") {
        wizard.goBackFromImage();
        setFinishedSetup(false);
        const idx = steps.findIndex((s) => microStepLegacyKey(s.id) === "image");
        setStepIndex(idx >= 0 ? idx : Math.max(0, stepIndex - 1));
        wizard.setStepKey("setup");
        return;
      }
      if (wizard.stepKey === "done") {
        setFinishedSetup(false);
        wizard.setStepKey("setup");
        setStepIndex(Math.max(0, steps.length - 1));
        return;
      }
    }

    // Review → generate setup (skip wait.*) so auto-advance does not bounce forward.
    if (currentId === "image.review") {
      const genIdx = steps.findIndex(
        (s) => s.id === "setup.pre_generate" || s.id === "image.generate",
      );
      if (genIdx >= 0) {
        setStepIndex(genIdx);
        return;
      }
    }

    if (currentId === "done.export") {
      const genIdx = steps.findIndex(
        (s) => s.id === "setup.pre_video" || s.id === "video.generate",
      );
      if (genIdx >= 0) {
        setStepIndex(genIdx);
        return;
      }
    }

    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [currentId, finishedSetup, stepIndex, steps, wizard]);

  const skipStep = useCallback(() => {
    autoAdvancedRef.current = null;
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else goNext();
  }, [goNext, stepIndex, steps.length]);

  const setIntakePath = useCallback((path: IntakePath) => {
    setPendingIntakePath(path);
  }, []);

  const setConceptSource = useCallback((source: ConceptSource) => {
    setPendingConceptSource(source);
  }, []);

  const setCombinedStyle = useCallback(
    (style: CombinedStyle | "animate") => {
      // Legacy sessionStorage may still say "animate" → treat as storyboard.
      const normalized: CombinedStyle = style === "animate" ? "storyboard" : style;
      patchContext({ combinedStyle: normalized });
      if (normalized === "storyboard") {
        wizard.selectVisualStyle("storyboard-video");
        wizard.setImageOutputMode("single");
        wizard.setCinematicStitchReel(false);
      }
    },
    [patchContext, wizard],
  );

  const setVideoSubpath = useCallback((subpath: VideoSubpath) => {
    setPendingVideoSubpath(subpath);
  }, []);

  const setSubjectMode = useCallback(
    (mode: PromotionMode) => {
      patchContext({ promotionMode: mode });
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", mode);
      params.delete("fresh");
      router.replace(`/studio?${params.toString()}`);
    },
    [patchContext, router, searchParams],
  );

  // asset.reference_video is always skipped via graph skipWhen combinedNoReel.
  // Keep a safety auto-skip if the step ever reappears without a file.
  // Do NOT auto-skip while a download is in flight.
  useEffect(() => {
    if (currentId !== "asset.reference_video") return;
    if (wizard.referenceClipLoading) return;
    if (wizard.referenceIsVideo && wizard.referenceAd) {
      // Research already attached the reel — jump past this retired screen.
      const key = `auto-skip-ref-video-attached-${stepIndex}`;
      if (autoAdvancedRef.current === key) return;
      autoAdvancedRef.current = key;
      const t = window.setTimeout(() => {
        autoAdvancedRef.current = null;
        skipStep();
      }, 50);
      return () => window.clearTimeout(t);
    }
    const key = `auto-skip-ref-video-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => {
      autoAdvancedRef.current = null;
      skipStep();
    }, 50);
    return () => window.clearTimeout(t);
  }, [
    currentId,
    skipStep,
    stepIndex,
    wizard.referenceAd,
    wizard.referenceClipLoading,
    wizard.referenceIsVideo,
  ]);

  useEffect(() => {
    if (currentId !== "wait.reel_download") return;
    if (!wizard.referenceAd || blockReason) return;
    // Jump by id — list may have already dropped this wait step.
    const setup = steps.findIndex(
      (s) => s.id === "setup.pre_generate" || s.id === "setup.pre_video",
    );
    if (setup < 0 || setup === stepIndex) return;
    autoAdvancedRef.current = null;
    setStepIndex(setup);
  }, [blockReason, currentId, stepIndex, steps, wizard.referenceAd]);

  useEffect(() => {
    if (currentId !== "wait.research_apply") return;
    if (!wizard.imageRefPhoto) return;
    const key = `wait.research_apply-${stepIndex}-handoff`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => goNext(), 250);
    return () => window.clearTimeout(t);
  }, [currentId, goNext, stepIndex, wizard.imageRefPhoto]);

  useEffect(() => {
    if (currentId !== "wait.reference_analyze") return;
    if (blockReason) return;
    if (wizard.referenceAnalyzeBusy) return;
    if (!wizard.userReferenceBrief && !wizard.referenceAnalyzeNote) return;
    const key = `${currentId}-${stepIndex}-analyze-done`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => goNext(), 1200);
    return () => window.clearTimeout(t);
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    wizard.referenceAnalyzeBusy,
    wizard.referenceAnalyzeNote,
    wizard.userReferenceBrief,
  ]);

  // Reel analyze: only leave after busy finishes (and duration gate clears).
  useEffect(() => {
    if (currentId !== "wait.reel_analyze") return;
    if (blockReason) return;
    if (wizard.researchReelAnalyzeBusy) return;
    if (!wizard.researchReelAnalyzeNote && !wizard.researchReelAnalysis && !wizard.videoPrompt.trim()) {
      return;
    }
    const key = `wait.reel_analyze-${stepIndex}-done`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => goNext(), 600);
    return () => window.clearTimeout(t);
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    wizard.researchReelAnalyzeBusy,
    wizard.researchReelAnalyzeNote,
    wizard.researchReelAnalysis,
    wizard.videoPrompt,
  ]);

  // After cinematic concept plan finishes, leave the wait screen.
  // While busy, stay put (do not use WAIT_AUTO_ADVANCE generic timer).
  useEffect(() => {
    if (currentId !== "wait.concept_plan") return;
    if (wizard.conceptPlanBusy) return;
    const key = `wait.concept_plan-${stepIndex}-done`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => goNext(), 400);
    return () => window.clearTimeout(t);
  }, [currentId, goNext, stepIndex, wizard.conceptPlanBusy]);

  useEffect(() => {
    if (currentId !== "wait.image_generate") return;
    if (wizard.imageBusy) return;
    if (!wizard.imageUrl) {
      // Mirror video wait: on failure, return to fused setup so user can retry.
      if (wizard.error) {
        const genIdx = steps.findIndex(
          (s) => s.id === "setup.pre_generate" || s.id === "image.generate",
        );
        if (genIdx >= 0 && stepIndex !== genIdx) {
          autoAdvancedRef.current = null;
          setStepIndex(genIdx);
        }
      }
      return;
    }
    if (blockReason) return;
    const key = `wait.image_generate-${stepIndex}-${wizard.imageUrl}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    goNext();
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    steps,
    wizard.error,
    wizard.imageBusy,
    wizard.imageUrl,
  ]);

  useEffect(() => {
    if (currentId !== "wait.storyboard_generate") return;
    if (wizard.imageBusy) return;
    const hasScenes =
      Boolean(wizard.imageUrl) ||
      wizard.cinematicScenes.length > 0 ||
      wizard.storyboardScenes.length > 0;
    if (!hasScenes) {
      if (wizard.error) {
        const genIdx = steps.findIndex(
          (s) => s.id === "setup.pre_generate" || s.id === "image.storyboard_scenes",
        );
        if (genIdx >= 0 && stepIndex !== genIdx) {
          autoAdvancedRef.current = null;
          setStepIndex(genIdx);
        }
      }
      return;
    }
    if (blockReason) return;
    const key = `wait.storyboard_generate-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    goNext();
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    steps,
    wizard.cinematicScenes.length,
    wizard.error,
    wizard.imageBusy,
    wizard.imageUrl,
    wizard.storyboardScenes.length,
  ]);

  useEffect(() => {
    if (currentId !== "wait.video_generate") return;
    if (wizard.videoBusy) return;
    if (!wizard.videoUrl) {
      // Failed or cancelled — return to fused setup (or legacy generate) so the user can retry.
      if (wizard.error) {
        const genIdx = steps.findIndex(
          (s) => s.id === "setup.pre_video" || s.id === "video.generate",
        );
        if (genIdx >= 0 && stepIndex !== genIdx) {
          autoAdvancedRef.current = null;
          setStepIndex(genIdx);
        }
      }
      return;
    }
    if (blockReason) return;
    const key = `wait.video_generate-${stepIndex}-${wizard.videoUrl}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    goNext();
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    steps,
    wizard.error,
    wizard.videoBusy,
    wizard.videoUrl,
  ]);

  // Regenerate from violet video result → jump back to wait screen.
  useEffect(() => {
    if (currentId !== "done.export" || !wizard.videoBusy) return;
    const waitIdx = steps.findIndex((s) => s.id === "wait.video_generate");
    if (waitIdx < 0 || stepIndex === waitIdx) return;
    autoAdvancedRef.current = null;
    setStepIndex(waitIdx);
  }, [currentId, stepIndex, steps, wizard.videoBusy]);

  useEffect(() => {
    if (!currentId || blockReason || !isWaitMicroStep(currentId)) return;
    const key = `${currentId}-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const delay = currentId === "wait.research_apply" ? 350 : 100;
    const t = window.setTimeout(() => goNext(), delay);
    return () => window.clearTimeout(t);
  }, [blockReason, currentId, goNext, stepIndex]);

  const hasExistingScenes = wizard.storyboardScenes.length > 0;
  const hasExistingImage =
    Boolean(wizard.imageUrl) ||
    wizard.campaignSlides.length > 0 ||
    hasExistingScenes;
  const hasExistingVideo = Boolean(wizard.videoUrl);

  const jumpToStepId = useCallback(
    (id: string) => {
      const idx = steps.findIndex((s) => s.id === id);
      if (idx < 0) return;
      autoAdvancedRef.current = null;
      setStepIndex(idx);
    },
    [steps],
  );

  /** Library browse: return to existing output without spending tokens. */
  const browseContinueExisting = useCallback(() => {
    if (currentId === "setup.pre_generate" || currentId === "image.generate") {
      if (hasExistingScenes) {
        jumpToStepId("image.review");
        return;
      }
      if (hasExistingImage) {
        const preVideo = steps.findIndex((s) => s.id === "setup.pre_video");
        if (preVideo >= 0) {
          autoAdvancedRef.current = null;
          setStepIndex(preVideo);
          return;
        }
      }
      return;
    }
    if ((currentId === "setup.pre_video" || currentId === "video.generate") && hasExistingVideo) {
      jumpToStepId("done.export");
    }
  }, [
    currentId,
    hasExistingImage,
    hasExistingScenes,
    hasExistingVideo,
    jumpToStepId,
    steps,
  ]);

  return {
    ctx,
    patchContext,
    steps,
    stepIndex,
    currentStep,
    currentId,
    blockReason,
    goNext,
    goBack,
    skipStep,
    goClassic,
    setIntakePath,
    setConceptSource,
    setCombinedStyle,
    setVideoSubpath,
    setSubjectMode,
    pendingIntakePath,
    pendingConceptSource,
    pendingVideoSubpath,
    isSkippable: Boolean(currentStep?.skippable),
    finishedSetup,
    canGoBack: stepIndex > 0 || finishedSetup,
    hasExistingScenes,
    hasExistingImage,
    hasExistingVideo,
    browseContinueExisting,
    jumpToStepId,
  };
}

export type WizardMicroStepValue = ReturnType<typeof useWizardMicroStep>;
