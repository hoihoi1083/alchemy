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
  WIZARD_CLASSIC_VALUE,
  WIZARD_V2_QUERY_FLAG,
} from "@/lib/wizard-micro-steps.types";

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
    shipItEligible: wizard.shipItEligible,
    hasGeneratedImage: Boolean(wizard.imageUrl || wizard.cinematicScenes.length > 0),
    userReferenceBrief: wizard.userReferenceBrief,
    referenceAnalyzeNote: wizard.referenceAnalyzeNote,
  };
}

export function useWizardMicroStep(wizard: StudioWizardValue, promotionMode: PromotionMode) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const freshEntry = searchParams.get("fresh") === "1";

  const [ctx, setCtx] = useState<MicroWizardContext>(() => {
    if (freshEntry) clearStoredContext();
    const stored = readStoredContext();
    const sameMode = !stored.promotionMode || stored.promotionMode === promotionMode;
    return {
      ...defaultMicroContext(promotionMode),
      ...(sameMode && !freshEntry ? stored : {}),
      promotionMode,
    };
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [finishedSetup, setFinishedSetup] = useState(false);
  const [pendingIntakePath, setPendingIntakePath] = useState<IntakePath | undefined>();
  const [pendingConceptSource, setPendingConceptSource] = useState<ConceptSource | undefined>();
  const [pendingVideoSubpath, setPendingVideoSubpath] = useState<VideoSubpath | undefined>();
  const autoAdvancedRef = useRef<string | null>(null);

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
    wizard.selectVisualStyle,
    wizard.setImageOutputMode,
    wizard.setShipItMode,
  ]);

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
    ],
  );

  const steps = useMemo(() => resolveMicroSteps(ctx, state), [ctx, state]);

  useEffect(() => {
    if (stepIndex >= steps.length && steps.length > 0) {
      setStepIndex(steps.length - 1);
    }
  }, [stepIndex, steps.length]);

  const currentStep = steps[stepIndex] ?? null;
  const currentId = currentStep?.id ?? null;

  const proceedCtx = useMemo((): MicroWizardContext => {
    if (currentId === "route.intake") {
      const intakePath = pendingIntakePath ?? ctx.intakePath;
      return intakePath ? { ...ctx, intakePath } : ctx;
    }
    if (currentId === "route.concept_source") {
      const conceptSource = pendingConceptSource ?? ctx.conceptSource;
      return conceptSource ? { ...ctx, conceptSource } : ctx;
    }
    if (currentId === "route.video_subpath") {
      const videoSubpath = pendingVideoSubpath ?? ctx.videoSubpath;
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

  const goNext = useCallback(() => {
    if (!currentId || blockReason) return;

    if (currentId === "shortcut.ship_it") {
      void wizard.runShipItPipeline();
      handoffLegacy("done");
      return;
    }

    if (currentId === "video.product_plan") {
      void wizard.planProductVideo();
    }
    if (currentId === "video.ai_prompt") {
      void wizard.planAiVideoPrompt();
    }

    if (currentId === "image.generate") {
      void wizard.generateImage();
      autoAdvancedRef.current = null;
      setStepIndex((i) => i + 1);
      return;
    }

    // Never advance micro past storyboard_scenes into wait.storyboard_generate —
    // that wait auto-skips only AFTER scenes exist. Hand off to ImageStep so the
    // user can generate the scene grid (product/concept × direct/research).
    if (currentId === "image.storyboard_scenes") {
      handoffLegacy("image");
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
      // Image+video: skip cinematic stitch picker — default to storyboard animate path.
      if (ctx.workflowMode === "combined" && ctx.combinedStyle !== "cinematic") {
        patchContext({ combinedStyle: "animate" });
        if (!wizard.isUgcPresenterOutput && wizard.visualStyleId !== "concept-cinematic") {
          wizard.selectVisualStyle("storyboard-video");
        }
      }
    }

    if (currentId === "route.intake") {
      const intakePath = pendingIntakePath ?? ctx.intakePath;
      if (!intakePath) return;
      patchContext({ intakePath });
      setPendingIntakePath(undefined);
      if (intakePath === "direct") {
        wizard.setImageCreativeMode(wizard.imageRefPhoto ? "reference-concept" : "promo-ai");
      }
      // 圖+片 + 研究 → always storyboard reel (multi-scene stills).
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
      };
      const nextSteps = resolveMicroSteps({ ...ctx, intakePath }, nextState);
      autoAdvancedRef.current = null;
      setStepIndex(resumeStepIndex(nextSteps));
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
      patchContext({ conceptSource });
      setPendingConceptSource(undefined);
      autoAdvancedRef.current = null;
      setStepIndex(stepIndex + 1);
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

    if (currentId === "identity.concept_topic") {
      const intakePath = intakePathForConceptSource("research");
      patchContext({ intakePath, conceptSource: "research" });
      if (
        (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
        ctx.combinedStyle !== "cinematic" &&
        wizard.visualStyleId !== "concept-cinematic" &&
        !wizard.isUgcPresenterOutput
      ) {
        wizard.selectVisualStyle("storyboard-video");
      }
      const nextState = {
        ...state,
        visualStyleId:
          (ctx.workflowMode === "combined" || wizard.workflowMode === "combined") &&
          ctx.combinedStyle !== "cinematic" &&
          state.visualStyleId !== "concept-cinematic"
            ? ("storyboard-video" as const)
            : state.visualStyleId,
      };
      const nextSteps = resolveMicroSteps({ ...ctx, intakePath, conceptSource: "research" }, nextState);
      autoAdvancedRef.current = null;
      setStepIndex(resumeStepIndex(nextSteps));
      return;
    }

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
  }, [blockReason, ctx, currentId, handoffLegacy, patchContext, state, stepIndex, steps.length, wizard]);

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
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [finishedSetup, stepIndex, steps, wizard]);

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
    (style: CombinedStyle) => {
      patchContext({ combinedStyle: style });
      // Animate branch = storyboard reel; cinematic keeps concept-cinematic via recipe.
      if (style === "animate" && !wizard.isUgcPresenterOutput) {
        wizard.selectVisualStyle("storyboard-video");
        wizard.setImageOutputMode("single");
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

  // Stale sessions can still land on MP4 step after image research — never trap the user.
  useEffect(() => {
    if (currentId !== "asset.reference_video") return;
    if (wizard.referenceIsVideo && wizard.referenceAd) return;
    // No real reel: auto-skip so 圖文研究 cannot get stuck on「請上傳參考 MP4」.
    const key = `auto-skip-ref-video-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const t = window.setTimeout(() => {
      autoAdvancedRef.current = null;
      skipStep();
    }, 50);
    return () => window.clearTimeout(t);
  }, [currentId, skipStep, stepIndex, wizard.referenceAd, wizard.referenceIsVideo]);

  useEffect(() => {
    if (currentId === "wait.reel_download" && wizard.referenceAd && !blockReason) {
      goNext();
    }
  }, [blockReason, currentId, goNext, wizard.referenceAd]);

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

  useEffect(() => {
    if (currentId !== "wait.image_generate" || blockReason) return;
    if (wizard.imageBusy) return;
    if (!wizard.imageUrl) return;
    const key = `wait.image_generate-${stepIndex}-${wizard.imageUrl}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    goNext();
  }, [blockReason, currentId, goNext, stepIndex, wizard.imageBusy, wizard.imageUrl]);

  useEffect(() => {
    if (currentId !== "wait.storyboard_generate" || blockReason) return;
    if (wizard.imageBusy) return;
    if (!wizard.imageUrl && wizard.cinematicScenes.length === 0 && wizard.storyboardScenes.length === 0) {
      return;
    }
    const key = `wait.storyboard_generate-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    goNext();
  }, [
    blockReason,
    currentId,
    goNext,
    stepIndex,
    wizard.cinematicScenes.length,
    wizard.imageBusy,
    wizard.imageUrl,
    wizard.storyboardScenes.length,
  ]);

  useEffect(() => {
    if (currentId !== "wait.video_generate") return;
    if (wizard.videoBusy) return;
    if (!wizard.videoUrl) {
      // Failed or cancelled — return to generate step so the user can retry.
      if (wizard.error) {
        const genIdx = steps.findIndex((s) => s.id === "video.generate");
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

  useEffect(() => {
    if (!currentId || blockReason || !isWaitMicroStep(currentId)) return;
    const key = `${currentId}-${stepIndex}`;
    if (autoAdvancedRef.current === key) return;
    autoAdvancedRef.current = key;
    const delay = currentId === "wait.research_apply" ? 350 : 100;
    const t = window.setTimeout(() => goNext(), delay);
    return () => window.clearTimeout(t);
  }, [blockReason, currentId, goNext, stepIndex]);

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
  };
}

export type WizardMicroStepValue = ReturnType<typeof useWizardMicroStep>;
