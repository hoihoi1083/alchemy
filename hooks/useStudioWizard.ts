"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { applyStudioAssistantHandoff } from "@/lib/studio-assistant-apply-handoff";
import {
  clearStudioAssistantHandoff,
  readStudioAssistantHandoff,
} from "@/lib/studio-assistant-handoff";
import {
  isTemplateId,
  TEMPLATE_PREF_KEY,
  visualStyleForTemplate,
} from "@/lib/template-pref";
import { useFriendlyError } from "@/hooks/useFriendlyError";
import { notifyCreditBalance, readCreditBalanceFromResponse } from "@/lib/credits-client";
import {
  useWizardState,
  type StoryboardDurationPreset,
} from "@/hooks/useWizardState";
import { useWizardProgress } from "@/hooks/useWizardProgress";
import { apiGetBlob } from "@/lib/api/studio-api";
import {
  postAddBgm,
  postAnalyzeBrand,
  postCampaign,
  postCompose,
  postBurnImageText,
  postGenerateImage,
  postGenerateImageJson,
  postGenerateVideo,
  postPlanVideoPrompt,
  postPlanProductVideo,
  postStoryboardImages,
} from "@/lib/api/wizard-client";
import type { BgmTrackId } from "@/lib/bgm/tracks";
import {
  DEFAULT_IMAGE_INPUT_MODE,
  type ImageInputMode,
} from "@/lib/image-input-mode";
import {
  defaultImageModeForGoal,
  defaultVideoModeForGoal,
  defaultVideoModeForStudio,
  type ImageCreativeMode,
  type VideoCreativeMode,
} from "@/lib/creative-workflow";
import {
  buildEndFrameImagePrompt,
  buildMultiAngleVideoPrompt,
  buildNegativePrompt,
  buildPromptVariables,
  buildReferenceVideoPrompt,
  buildWizardImagePrompt,
  buildWizardVideoPrompt,
  resolveImagePromptMode,
  buildReferenceVideoNegative,
  type PromptMarket,
  type SubjectFraming,
  type VideoPromptOpts,
} from "@/lib/prompts";
import {
  CINEMATIC_CLIP_SEC,
  cinematicTotalDurationSec,
  type CinematicSceneCount,
} from "@/lib/cinematic-scene-config";
import {
  buildCinematicClipMotionPrompt,
  cinematicMotionStrength,
  cinematicMotionStyleForScene,
  CINEMATIC_REEL_VIDEO_CREATIVITY,
  extractReferenceMotionNote,
} from "@/lib/cinematic-motion-prompt";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import { createPromptSnapshot, savePromptSnapshot } from "@/lib/prompt-snapshots";
import {
  DEFAULT_VIDEO_SETTINGS,
  cameraForMotion,
  defaultMotionStyleForTemplate,
  resolveVideoGenerationOpts,
  resolveWizardOutputDurationSec,
  isExplicitVideoDuration,
  VIDEO_DURATIONS,
  videoSettingsForWorkflow,
  type VideoDuration,
  type VideoSettings,
} from "@/lib/video-settings";
import { resolveVideoGenerationKind } from "@/lib/video-generation-path";
import {
  DEFAULT_VISUAL_STYLE,
  getVisualStyle,
  isAiPlannedVideoStyle,
  isBrandVideoStyle,
  isCreativeVideoStyle,
  isBrandVisualStyle,
  isCampaignVisualStyle,
  isStoryboardVideoStyle,
  isUgcPresenterStyle,
  isConceptCinematicStyle,
  isVisualStyleAllowedForWorkflow,
  mergePromptExtra,
  visualStylePromptHint,
  type VisualStyleId,
} from "@/lib/visual-styles";
import {
  getTemplateConfig,
  isSlotRequired,
  templateHasSlot,
  type TemplateSlotId,
} from "@/lib/template-slots";
import { getTemplate, type TemplateId } from "@/lib/templates";
import { BANANA2_EDIT_ENDPOINT, BANANA2_TEXT_ENDPOINT } from "@/lib/image-endpoints";
import { buildImageRefinePrompt, normalizeImageSourceUrl, type LogoPlacement } from "@/lib/image-refine-prompt";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";
import type { ImageEditRegion } from "@/lib/image-edit-region";
import { buildRegionHintImageBlob } from "@/lib/image-region-hint";
import { newImageCanvasTextLayer } from "@/lib/image-canvas-layers";
import type { ImageTextLayer } from "@/lib/image-text-overlay-types";
import {
  isContentResearchStyleExtra,
  refreshContentResearchPromptExtra,
  stripContentResearchStyleExtra,
} from "@/lib/content-research-promote";
import { buildResearchR2vPrompt } from "@/lib/research-r2v-prompt";
import { wizardPromoteName } from "@/lib/wizard-promote-name";
import {
  evaluateProceedToImageGate,
  type SetupImageGateReason,
} from "@/lib/wizard-setup-gate";
import { layoutHookSplitCaptions } from "@/lib/ad-pack-hook-captions";
import { captionLinesFromStoryboardScenes } from "@/lib/storyboard-captions";
import {
  researchReelAnalysisPromptBlock,
  type ResearchReelAnalysis,
} from "@/lib/reel-analysis-types";
import {
  briefFromReelAnalysis,
  pinStoryboardPlanToReelAnalysis,
  sanitizeStoryboardSeedancePrompt,
} from "@/lib/reel-reference-brief";
import {
  USER_REFERENCE_LAYOUT_TRANSFER_MARKER,
  USER_REFERENCE_MARKER,
  USER_REFERENCE_STYLE_ONLY_MARKER,
  type UserReferenceBrief,
} from "@/lib/user-reference-brief";
import {
  mergeReferencePromptExtra,
  resolveReferenceStrategy,
} from "@/lib/reference-strategy";
import { referenceAnalyzeTriggerKey } from "@/lib/reference-analyze-trigger";
import { saveBrandKitToStorage } from "@/lib/brand-kit";
import {
  effectiveBrandHeadline,
  mergeBrandProfileIntoKit,
  seedBrandCanvasLayers,
} from "@/lib/brand-merge";
import { analyzeImageUrl, analyzeProductImageFile, type ImageUploadWarning } from "@/lib/image-upload-quality";
import { regionsInpaintPrompt, regionsToInpaintMaskBlob } from "@/lib/regions-to-inpaint-mask";
import { isEraseIntent } from "@/lib/inpaint-erase";
import { buildImagePostflight } from "@/lib/image-postflight";
import {
  visionGateBlocksShipIt,
  visionReviewNeedsAttention,
  type ImageVisionReview,
} from "@/lib/image-vision-gate";
import {
  fetchReferenceClipAsFile,
  type ReferenceClipId,
} from "@/lib/reference-clips";
import type { BrandProfile } from "@/lib/brand-profile";
import type { CampaignPlan } from "@/lib/campaign-types";
import type {
  StoryboardScenePlan,
  StoryboardSceneResult,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import {
  DEFAULT_IMAGE_OUTPUT_MODE,
  type ImageOutputMode,
} from "@/lib/image-output-mode";
import {
  defaultImageAspectRatioForWorkflow,
  type ImageAspectRatio,
} from "@/lib/image-aspect-ratio";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";
import type { CampaignSlide } from "@/hooks/useWizardState";
import type { AdPackPlan, AiMusicTrack, CaptionLine, VoicePreviewTrack } from "@/lib/ad-pack-types";
import { appendArtStyleSeedanceHintIfNeeded, DEFAULT_ART_STYLE } from "@/lib/art-style";
import { isFalCdnUrl, isPipelineFileUrl } from "@/lib/pipeline/safe-url";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  conceptStyleAllowsTextOnlyImage,
  conceptStyleRequiresHeadline,
  visualStyleAllowedForPromotion,
} from "@/lib/promotion-styles";
import {
  defaultVisualStyleForPromotion,
  defaultVisualStyleForWorkflow,
} from "@/lib/promotion-mode";

const EDIT_ENDPOINT = BANANA2_EDIT_ENDPOINT;
const TEXT_ENDPOINT = BANANA2_TEXT_ENDPOINT;

export function useStudioWizard(promotionMode: PromotionMode) {
  const { m, locale } = useLocale();
  const friendlyError = useFriendlyError(m);
  const state = useWizardState(locale);
  const {
    workflowMode, setWorkflowMode,
    stepKey, setStepKey,
    visualStyleId, setVisualStyleId,
    artStyleId, setArtStyleId,
    imageCreativeMode, setImageCreativeMode,
    videoCreativeMode, setVideoCreativeMode,
    videoSettings, setVideoSettings,
    selectedReferenceClipId, setSelectedReferenceClipId,
    referenceClipLoading, setReferenceClipLoading,
    templateId, setTemplateId,
    product, setProduct,
    headline, setHeadline,
    subline, setSubline,
    business, setBusiness,
    offer, setOffer,
    showAdvancedSetup, setShowAdvancedSetup,
    showAdvancedSetupPrompts, setShowAdvancedSetupPrompts,
    showAdvancedImage, setShowAdvancedImage,
    showAdvancedVideo, setShowAdvancedVideo,
    bgmTrack, setBgmTrack,
    imageInputMode, setImageInputMode,
    promptMarket, setPromptMarket,
    subjectFraming, setSubjectFraming,
    promptExtra, setPromptExtra,
    brandWebsiteUrl, setBrandWebsiteUrl,
    brandSocialHint, setBrandSocialHint,
    brandProfile, setBrandProfile,
    brandAnalyzeBusy, setBrandAnalyzeBusy,
    brandAnalyzeNote, setBrandAnalyzeNote,
    creativeVideoBrief, setCreativeVideoBrief,
    conceptImageVisionNote, setConceptImageVisionNote,
    userReferenceBrief, setUserReferenceBrief,
    referenceAnalyzeBusy, setReferenceAnalyzeBusy,
    referenceAnalyzeNote, setReferenceAnalyzeNote,
    conceptIdea, setConceptIdea,
    storyboardBrief, setStoryboardBrief,
    storyboardPlan, setStoryboardPlan,
    storyboardScenes, setStoryboardScenes,
    cinematicStitchReel, setCinematicStitchReel,
    cinematicSceneCount, setCinematicSceneCount,
    cinematicReelPlan, setCinematicReelPlan,
    cinematicScenes, setCinematicScenes,
    storyboardTrimDuration, setStoryboardTrimDuration,
    storyboardSceneCount, setStoryboardSceneCount,
    musicMood, setMusicMood,
    voiceoverEnabled, setVoiceoverEnabled,
    voiceoverLocale, setVoiceoverLocale,
    storyboardSceneReplaceBusy, setStoryboardSceneReplaceBusy,
    storyboardSceneRegenerateBusy, setStoryboardSceneRegenerateBusy,
    planVideoPromptBusy, setPlanVideoPromptBusy,
    videoPromptPlanNote, setVideoPromptPlanNote,
    imagePrompt, setImagePrompt,
    videoPrompt, setVideoPrompt,
    negativePrompt, setNegativePrompt,
    productPhoto, setProductPhoto,
    uploadPreviewUrl, setUploadPreviewUrl,
    imageRefPhoto, setImageRefPhoto,
    imageRefPreviewUrl, setImageRefPreviewUrl,
    imageUrl, setImageUrl,
    imageGenKey, setImageGenKey,
    lastImageEndpoint, setLastImageEndpoint,
    imageVariantUrls, setImageVariantUrls,
    selectedVariantIndex, setSelectedVariantIndex,
    imageOutputMode, setImageOutputMode,
    imageAspectRatio, setImageAspectRatio,
    campaignTheme, setCampaignTheme,
    campaignPlan, setCampaignPlan,
    campaignSlides, setCampaignSlides,
    uploadQualityWarning, setUploadQualityWarning,
    useOriginalImage, setUseOriginalImage,
    shipItMode, setShipItMode,
    shipItPipelineBusy, setShipItPipelineBusy,
    imagePostflight, setImagePostflight,
    imagePostflightBusy, setImagePostflightBusy,
    imageVisionReview, setImageVisionReview,
    imageVisionReviewBusy, setImageVisionReviewBusy,
    imageQualityChecklist, setImageQualityChecklist,
    referenceAd, setReferenceAd,
    referencePreviewUrl, setReferencePreviewUrl,
    referenceIsVideo, setReferenceIsVideo,
    refVideoDurationSec, setRefVideoDurationSec,
    referenceVideoFalUrl, setReferenceVideoFalUrl,
    researchReelAnalysis, setResearchReelAnalysis,
    researchReelAnalyzeBusy, setResearchReelAnalyzeBusy,
    researchReelAnalyzeNote, setResearchReelAnalyzeNote,
    imageBusy, setImageBusy,
    videoBusy, setVideoBusy,
    videoPhase, setVideoPhase,
    imageJobMeta, setImageJobMeta,
    videoJobStartedAt, setVideoJobStartedAt,
    progressNow, setProgressNow,
    endFrameUrl, setEndFrameUrl,
    endFramePhoto, setEndFramePhoto,
    endFramePreviewUrl, setEndFramePreviewUrl,
    extraAnglePhotos, setExtraAnglePhotos,
    packagingPhoto, setPackagingPhoto,
    packagingPreviewUrl, setPackagingPreviewUrl,
    extraKitPhotos, setExtraKitPhotos,
    extraKitPreviewUrls, setExtraKitPreviewUrls,
    referenceCarouselSlideCount, setReferenceCarouselSlideCount,
    contentResearchApplyRef, setContentResearchApplyRef,
    productVideoPlan, setProductVideoPlan,
    planProductVideoBusy, setPlanProductVideoBusy,
    planStoryboardBusy, setPlanStoryboardBusy,
    error, setError,
    videoUrl, setVideoUrl,
    captionHandoffVideoUrl, setCaptionHandoffVideoUrl,
    videoNote, setVideoNote,
    bgmNote, setBgmNote,
    quickFixCredits, setQuickFixCredits,
    quickFixLogoFile, setQuickFixLogoFile,
    quickFixLogoPreviewUrl, setQuickFixLogoPreviewUrl,
    quickFixLogoPlacement, setQuickFixLogoPlacement,
    imagePreOverlayUrl, setImagePreOverlayUrl,
    imageTextMode, setImageTextMode,
    presenterSourceMode, setPresenterSourceMode,
    presenterAvatarId, setPresenterAvatarId,
    selectedAdPackHookIndex, setSelectedAdPackHookIndex,
    brandKit, setBrandKit,
    adPackPlan, setAdPackPlan,
    adPackPlanBusy, setAdPackPlanBusy,
    adPackReviewOpen, setAdPackReviewOpen,
    captionLines, setCaptionLines,
    captionBurnEnabled, setCaptionBurnEnabled,
    musicSource, setMusicSource,
    aiMusicTracks, setAiMusicTracks,
    selectedAiMusicId, setSelectedAiMusicId,
    musicGenerateBusy, setMusicGenerateBusy,
    voicePreviewTracks, setVoicePreviewTracks,
    selectedVoicePreviewId, setSelectedVoicePreviewId,
    voicePreviewBusy, setVoicePreviewBusy,
  } = state;

  const promotionInitRef = useRef(false);
  const lastStoryboardVideoDurationSecRef = useRef<number | null>(null);
  const imageUrlRef = useRef<string | null>(imageUrl);
  useEffect(() => {
    imageUrlRef.current = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (promotionInitRef.current) return;
    promotionInitRef.current = true;
    if (promotionMode === "concept") {
      setImageAspectRatio("4:5");
      setImageOutputMode("single");
      if (workflowMode === "video-only") {
        setVideoCreativeMode("product-promo");
      }
      if (
        !visualStyleAllowedForPromotion(visualStyleId, "concept") ||
        !isVisualStyleAllowedForWorkflow(visualStyleId, workflowMode)
      ) {
        const next = defaultVisualStyleForWorkflow("concept", workflowMode);
        setVisualStyleId(next);
        setTemplateId(getVisualStyle(next).templateId);
        setImageInputMode(getTemplateConfig(getVisualStyle(next).templateId).defaultImageInputMode);
      }
    }
  }, [promotionMode, visualStyleId, workflowMode, setVideoCreativeMode]);

  useEffect(() => {
    if (promotionMode !== "concept" || workflowMode !== "video-only") return;
    if (videoCreativeMode === "product-assistant") {
      setVideoCreativeMode("product-promo");
    }
  }, [promotionMode, workflowMode, videoCreativeMode, setVideoCreativeMode]);

  useEffect(() => {
    setVoicePreviewTracks([]);
    setSelectedVoicePreviewId(null);
  }, [voiceoverLocale, setVoicePreviewTracks, setSelectedVoicePreviewId]);

  useEffect(() => {
    const timer = window.setInterval(() => setProgressNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [imageBusy, videoBusy, setProgressNow]);

  const tpl = getTemplate(templateId);
  const visualStyle = getVisualStyle(visualStyleId);
  const templateConfig = getTemplateConfig(templateId);
  const usesCompositor = visualStyle.usesCompositor;
  const lockedCampaignMode = isCampaignVisualStyle(visualStyleId);
  const effectiveImageOutputMode: ImageOutputMode = lockedCampaignMode
    ? "campaign"
    : imageOutputMode;
  const isCampaignOutput = effectiveImageOutputMode === "campaign";
  const isTeachingCarouselOutput = effectiveImageOutputMode === "teaching-carousel";
  const isStoryboardOutput = isStoryboardVideoStyle(visualStyleId);
  const isUgcPresenterOutput = isUgcPresenterStyle(visualStyleId);
  const isCinematicStitchOutput =
    isConceptCinematicStyle(visualStyleId) && cinematicSceneCount > 1;
  const isConceptCinematicSingleOutput =
    isConceptCinematicStyle(visualStyleId) && cinematicSceneCount === 1;
  const cinematicStitchReady =
    isConceptCinematicStyle(visualStyleId) &&
    cinematicSceneCount > 1 &&
    cinematicScenes.length >= cinematicSceneCount;

  const formatCinematicCopy = useCallback(
    (template: string, count = cinematicSceneCount) =>
      template
        .replaceAll("{count}", String(count))
        .replaceAll("{totalSec}", String(cinematicTotalDurationSec(count))),
    [cinematicSceneCount],
  );
  const usesProductAssistant =
    promotionMode !== "concept" &&
    videoCreativeMode === "product-assistant" &&
    !isStoryboardOutput &&
    !usesCompositor;
  const conceptTextVideoEligible =
    promotionMode === "concept" &&
    workflowMode === "video-only" &&
    videoCreativeMode === "product-promo" &&
    (isCreativeVideoStyle(visualStyleId) || isBrandVideoStyle(visualStyleId)) &&
    !productPhoto &&
    !imageUrl;
  const usesConceptTextVideo = conceptTextVideoEligible;
  const effectiveImageAspectRatio: ImageAspectRatio = isStoryboardOutput || isCinematicStitchOutput || isConceptCinematicSingleOutput
    ? "9:16"
    : imageAspectRatio;
  const showVideoReferenceSection = videoCreativeMode === "reference-concept";
  const effectiveImageMode: ImageInputMode =
    templateId === "custom" ? imageInputMode : templateConfig.defaultImageInputMode;
  const useReferenceVideo =
    videoCreativeMode === "reference-concept" &&
    Boolean(referenceAd && referenceIsVideo);
  const referenceR2vReady =
    useReferenceVideo &&
    Boolean(
      videoPrompt.trim() || researchReelAnalysis?.seedancePrompt?.trim(),
    );
  const directReferenceR2vReady =
    referenceR2vReady &&
    !isStoryboardOutput &&
    (promotionMode === "concept" ||
      (promotionMode === "physical" && workflowMode === "video-only"));
  const conceptReferenceR2vReady =
    promotionMode === "concept" && directReferenceR2vReady;
  const effectivePromoteName = wizardPromoteName({
    promotionMode,
    product,
    headline,
    conceptIdea,
  });
  const isContentResearchStyle = isContentResearchStyleExtra(promptExtra);
  const isContentResearchVideoPath =
    isContentResearchStyle &&
    (workflowMode === "video-only" || workflowMode === "combined");
  const isContentResearchReelPath =
    isContentResearchVideoPath && Boolean(referenceAd && referenceIsVideo);
  const isContentResearchReelVideo = isContentResearchReelPath && isStoryboardOutput;
  const isContentResearchPhysicalR2v =
    isContentResearchReelPath &&
    promotionMode === "physical" &&
    workflowMode === "video-only" &&
    useReferenceVideo;
  const isConceptResearchReelStoryboard =
    promotionMode === "concept" && isContentResearchReelVideo;
  const isConceptStoryboardOutput = promotionMode === "concept" && isStoryboardOutput;
  /** Any uploaded reference MP4 in reference-concept mode (research or manual). */
  const referenceReelNeedsExplicitDuration =
    useReferenceVideo &&
    Boolean(referenceAd && referenceIsVideo) &&
    !isExplicitVideoDuration(videoSettings.duration);
  const reelAnalyzeOutputDurationSec = resolveWizardOutputDurationSec(videoSettings);
  const shouldAnalyzeReferenceVideo =
    useReferenceVideo &&
    Boolean(referenceAd && effectivePromoteName) &&
    isExplicitVideoDuration(videoSettings.duration);
  const referenceVideoAnalyzeIncludesStoryboard = isStoryboardOutput;
  const isVideoWorkflow = workflowMode === "video-only" || workflowMode === "combined";
  const isImageWorkflow = workflowMode === "image-only" || workflowMode === "combined";

  const usesReferenceConceptForImage =
    imageCreativeMode === "reference-concept" ||
    Boolean(imageRefPhoto && productPhoto);

  const referenceStrategy = useMemo(
    () =>
      resolveReferenceStrategy({
        promotionMode,
        imageOutputMode: effectiveImageOutputMode,
        visualStyleId,
        workflowMode,
        imageCreativeMode,
        hasReferenceUpload: Boolean(imageRefPhoto),
        hasProductPhoto: Boolean(productPhoto),
        hasReferenceBrief:
          Boolean(userReferenceBrief) || Boolean(conceptImageVisionNote.trim()),
      }),
    [
      promotionMode,
      effectiveImageOutputMode,
      visualStyleId,
      workflowMode,
      imageCreativeMode,
      imageRefPhoto,
      productPhoto,
      userReferenceBrief,
      conceptImageVisionNote,
    ],
  );

  const appendReferenceFormFields = useCallback(
    (fd: FormData) => {
      fd.set("image_output_mode", effectiveImageOutputMode);
      fd.set("promotion_mode", promotionMode);
      if (userReferenceBrief) {
        fd.set("reference_brief", JSON.stringify(userReferenceBrief));
      }
    },
    [effectiveImageOutputMode, promotionMode, userReferenceBrief],
  );

  const attachReferenceToForm = useCallback(
    (fd: FormData) => {
      const useConceptRef =
        imageCreativeMode === "reference-concept" ||
        Boolean(imageRefPhoto && productPhoto);
      fd.set("image_creative_mode", useConceptRef ? "reference-concept" : imageCreativeMode);
      fd.set(
        "image_mode",
        effectiveImageMode === "reference"
          ? "reference"
          : useConceptRef
            ? "product-style"
            : "product-ad",
      );
      if (productPhoto) {
        fd.set("reference_image", productPhoto);
      }
      if (imageRefPhoto) {
        fd.set("style_reference_image", imageRefPhoto);
      }
      appendReferenceFormFields(fd);
    },
    [
      imageCreativeMode,
      imageRefPhoto,
      productPhoto,
      effectiveImageMode,
      referenceStrategy.sendPixelsToFal,
      appendReferenceFormFields,
    ],
  );

  const effectivePromptExtra = useCallback(() => {
    const researchRefreshed = refreshContentResearchPromptExtra(
      promptExtra,
      contentResearchApplyRef,
      promotionMode,
      { product, headline, conceptIdea },
    );
    const mergedBase = usesReferenceConceptForImage
      ? researchRefreshed.trim()
      : mergePromptExtra(visualStyleId, researchRefreshed);
    const base = mergeReferencePromptExtra(
      mergedBase,
      userReferenceBrief,
      referenceStrategy,
    );
    const reelBlock = researchReelAnalysis
      ? researchReelAnalysisPromptBlock(researchReelAnalysis)
      : "";
    const legacyRef =
      !userReferenceBrief && conceptImageVisionNote.trim() ? conceptImageVisionNote.trim() : "";
    if (
      legacyRef &&
      !base.includes(USER_REFERENCE_MARKER) &&
      !base.includes(USER_REFERENCE_STYLE_ONLY_MARKER) &&
      !base.includes(USER_REFERENCE_LAYOUT_TRANSFER_MARKER) &&
      !isContentResearchStyleExtra(base)
    ) {
      return [base, legacyRef, reelBlock].filter(Boolean).join(" | ");
    }
    return [base, reelBlock].filter(Boolean).join(" | ");
  }, [
    visualStyleId,
    promptExtra,
    contentResearchApplyRef,
    promotionMode,
    product,
    headline,
    conceptIdea,
    usesReferenceConceptForImage,
    conceptImageVisionNote,
    userReferenceBrief,
    researchReelAnalysis,
    referenceStrategy,
  ]);

  const getPromptVars = useCallback(
    () =>
      buildPromptVariables({
        product,
        business,
        offer,
        headline: effectiveBrandHeadline(headline, brandKit, brandProfile),
        subline,
        market: promptMarket,
        framing: subjectFraming,
        extra: effectivePromptExtra(),
        artStyle: artStyleId,
        imageTextMode,
      }),
    [
      product,
      business,
      offer,
      headline,
      subline,
      promptMarket,
      subjectFraming,
      effectivePromptExtra,
      artStyleId,
      imageTextMode,
      brandKit,
      brandProfile,
    ],
  );

  const usesStyleReference =
    templateHasSlot(templateId, "styleRef") && Boolean(imageRefPhoto);
  const needsProductUpload = isConceptStoryboardOutput
    ? false
    : promotionMode === "concept" && conceptStyleAllowsTextOnlyImage(visualStyleId)
      ? false
      : effectiveImageMode === "product-ad" || effectiveImageMode === "product-style";

  const videoPromptOpts = useCallback((): VideoPromptOpts => {
    const dual = Boolean(
      endFrameUrl ||
        endFramePhoto ||
        (videoSettings.autoSecondFrame && videoSettings.creativity !== "subtle"),
    );
    return {
      creativity: videoSettings.creativity,
      dualFrame: dual,
      multiAngle: extraAnglePhotos.length > 0,
    };
  }, [endFrameUrl, endFramePhoto, videoSettings, extraAnglePhotos.length]);

  const useMultiAngleVideo =
    extraAnglePhotos.length > 0 && Boolean(productPhoto || imageUrl);

  const applyPromptRebuild = useCallback(
    (id: TemplateId = templateId) => {
      const pv = getPromptVars();
      const template = getTemplate(id);
      const vOpts = videoPromptOpts();
      setImagePrompt(
        buildWizardImagePrompt(
          pv,
          resolveImagePromptMode(visualStyleId, imageCreativeMode, {
            promotionMode,
            workflowMode,
          }),
          brandProfile,
          visualStyleId,
          brandKit,
        ),
      );
      setNegativePrompt(buildNegativePrompt(template, pv.framing, artStyleId));
      if (videoCreativeMode === "reference-concept") {
        setVideoPrompt(buildReferenceVideoPrompt(pv, id));
      } else if (useMultiAngleVideo) {
        setVideoPrompt(buildMultiAngleVideoPrompt(pv, vOpts, id));
      } else if (isStoryboardVideoStyle(visualStyleId) && storyboardPlan?.seedancePrompt) {
        // Keep DeepSeek per-scene Seedance prompt — do not replace with template default.
      } else if (usesProductAssistant && productVideoPlan?.seedancePrompt) {
        // Keep AI video assistant Seedance prompt.
      } else if (isAiPlannedVideoStyle(visualStyleId)) {
        // DeepSeek plans videoPrompt — never pre-fill product template (blocks auto-plan).
      } else if (!videoPrompt.trim()) {
        setVideoPrompt(buildWizardVideoPrompt(id, pv, vOpts));
      }
    },
    [
      templateId,
      visualStyleId,
      artStyleId,
      brandProfile,
      brandKit,
      getPromptVars,
      imageCreativeMode,
      promotionMode,
      workflowMode,
      videoCreativeMode,
      videoPromptOpts,
      useMultiAngleVideo,
      videoPrompt,
      storyboardPlan,
      productVideoPlan,
      videoCreativeMode,
    ],
  );

  useEffect(() => {
    if (!productPhoto) {
      setUploadPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(productPhoto);
    setUploadPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [productPhoto]);

  useEffect(() => {
    if (!imageRefPhoto) {
      setImageRefPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageRefPhoto);
    setImageRefPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageRefPhoto]);

  const referenceAnalyzeKey = useMemo(
    () =>
      referenceAnalyzeTriggerKey({
        cover: imageRefPhoto,
        extras: extraKitPhotos,
        promotionMode,
        imageOutputMode: effectiveImageOutputMode,
        visualStyleId,
        imageCreativeMode,
        hasProductPhoto: Boolean(productPhoto),
        researchAngleId: contentResearchApplyRef?.angle?.id,
      }),
    [
      imageRefPhoto,
      extraKitPhotos,
      promotionMode,
      effectiveImageOutputMode,
      visualStyleId,
      imageCreativeMode,
      productPhoto,
      contentResearchApplyRef?.angle?.id,
    ],
  );

  const referenceAnalyzeContextRef = useRef({
    conceptIdea,
    headline,
    subline,
    product,
    promptExtra,
    contentResearchApplyRef,
    promotionMode,
  });
  referenceAnalyzeContextRef.current = {
    conceptIdea,
    headline,
    subline,
    product,
    promptExtra,
    contentResearchApplyRef,
    promotionMode,
  };

  const lastCompletedReferenceAnalyzeKeyRef = useRef<string | null>(null);
  const referenceAnalyzeInFlightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!referenceAnalyzeKey) {
      lastCompletedReferenceAnalyzeKeyRef.current = null;
      referenceAnalyzeInFlightKeyRef.current = null;
      setUserReferenceBrief(null);
      setReferenceAnalyzeNote(null);
      return;
    }
    if (lastCompletedReferenceAnalyzeKeyRef.current === referenceAnalyzeKey) {
      return;
    }
    if (referenceAnalyzeInFlightKeyRef.current === referenceAnalyzeKey) {
      return;
    }
    referenceAnalyzeInFlightKeyRef.current = referenceAnalyzeKey;

    let cancelled = false;
    const run = async () => {
      if (!imageRefPhoto) return;
      setReferenceAnalyzeBusy(true);
      setReferenceAnalyzeNote(null);
      try {
        const ctx = referenceAnalyzeContextRef.current;
        const promptForAnalyze = refreshContentResearchPromptExtra(
          ctx.promptExtra,
          ctx.contentResearchApplyRef,
          ctx.promotionMode,
          {
            product: ctx.product,
            headline: ctx.headline,
            conceptIdea: ctx.conceptIdea,
          },
        );
        const fd = new FormData();
        fd.set("reference_image", imageRefPhoto);
        fd.set("promotion_mode", promotionMode);
        fd.set("image_output_mode", effectiveImageOutputMode);
        fd.set("visual_style", visualStyleId);
        fd.set("image_creative_mode", imageCreativeMode);
        fd.set("has_product_photo", productPhoto ? "1" : "0");
        fd.set("conceptIdea", ctx.conceptIdea.trim());
        fd.set("headline", ctx.headline.trim());
        fd.set("subline", ctx.subline.trim());
        fd.set("product", ctx.product.trim());
        fd.set("prompt_extra", promptForAnalyze);
        for (const f of extraKitPhotos.slice(0, 5)) {
          fd.append("carousel_reference_images", f);
        }
        const res = await fetch("/api/analyze-reference", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Reference analysis failed.");
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        if (cancelled) return;
        if (referenceAnalyzeInFlightKeyRef.current !== referenceAnalyzeKey) return;
        lastCompletedReferenceAnalyzeKeyRef.current = referenceAnalyzeKey;
        const brief = data.brief as UserReferenceBrief;
        setUserReferenceBrief(brief);
        setPromptExtra((prev) => stripContentResearchStyleExtra(prev));
        const slideCount = Number(data.carouselSlideCount) || 1;
        setReferenceAnalyzeNote(
          slideCount > 1
            ? m.wizard.referenceCarouselBriefAnalyzed.replace("{count}", String(slideCount))
            : m.wizard.referenceBriefAnalyzed,
        );
      } catch (e: unknown) {
        if (!cancelled && referenceAnalyzeInFlightKeyRef.current === referenceAnalyzeKey) {
          setReferenceAnalyzeNote(
            e instanceof Error ? e.message : m.wizard.referenceBriefAnalyzeFailed,
          );
        }
      } finally {
        if (referenceAnalyzeInFlightKeyRef.current === referenceAnalyzeKey) {
          referenceAnalyzeInFlightKeyRef.current = null;
        }
        if (!cancelled) setReferenceAnalyzeBusy(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (referenceAnalyzeInFlightKeyRef.current === referenceAnalyzeKey) {
        referenceAnalyzeInFlightKeyRef.current = null;
      }
    };
  }, [
    referenceAnalyzeKey,
    imageRefPhoto,
    extraKitPhotos,
    promotionMode,
    effectiveImageOutputMode,
    visualStyleId,
    imageCreativeMode,
    productPhoto,
    m.wizard.referenceBriefAnalyzed,
    m.wizard.referenceCarouselBriefAnalyzed,
    m.wizard.referenceBriefAnalyzeFailed,
    setUserReferenceBrief,
    setReferenceAnalyzeBusy,
    setReferenceAnalyzeNote,
  ]);

  const researchReelAnalyzeKeyRef = useRef<string | null>(null);
  const aiVideoPromptDurationRef = useRef<string | null>(null);

  const seedancePromptForGenerate = useCallback(
    (prompt: string) => appendArtStyleSeedanceHintIfNeeded(prompt, artStyleId),
    [artStyleId],
  );

  async function applyReelStyleReferenceFrame(url: string): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], "reference-reel-frame.jpg", {
        type: blob.type || "image/jpeg",
      });
      setImageRefPhoto(file);
      setImageCreativeMode("reference-concept");
    } catch {
      /* keep search cover if frame fetch fails */
    }
  }

  const analyzeResearchReel = useCallback(
    async (videoFile: File): Promise<boolean> => {
      const promoteName = wizardPromoteName({
        promotionMode,
        product,
        headline,
        conceptIdea,
      });
      if (!promoteName) return false;
      setResearchReelAnalyzeBusy(true);
      setResearchReelAnalyzeNote(
        referenceVideoAnalyzeIncludesStoryboard
          ? m.wizard.researchReelAnalyzing
          : m.wizard.referenceVideoAnalyzing,
      );
      try {
        const fd = new FormData();
        fd.set("reference_video", videoFile);
        fd.set("product_name", promoteName);
        fd.set("promotion_mode", promotionMode);
        fd.set("conceptIdea", conceptIdea.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("business", business.trim());
        fd.set("prompt_extra", effectivePromptExtra());
        fd.set("prompt_market", promptMarket);
        fd.set("art_style", artStyleId);
        fd.set("subject_framing", subjectFraming);
        fd.set("reference_strategy_kind", referenceStrategy.kind);
        fd.set("scene_count", storyboardSceneCount);
        const outDur = resolveWizardOutputDurationSec(videoSettings);
        fd.set("output_duration_sec", String(outDur));
        if (!referenceVideoAnalyzeIncludesStoryboard) {
          fd.set("plan_storyboard", "false");
        }
        const res = await fetch("/api/analyze-research-reel", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            (data.error as string | undefined) ?? m.errors.researchReelAnalyzeFailed,
          );
        }
        const analysis = data.analysis as ResearchReelAnalysis;
        setResearchReelAnalysis(analysis);
        setUserReferenceBrief(
          briefFromReelAnalysis(analysis, {
            headline: headline.trim(),
            conceptIdea: conceptIdea.trim(),
            subline: subline.trim(),
          }),
        );
        if (data.storyboardPlan) {
          let plan = data.storyboardPlan as VideoStoryboardPlan;
          plan = pinStoryboardPlanToReelAnalysis(plan, analysis, promoteName);
          setStoryboardPlan(plan);
          const sp = sanitizeStoryboardSeedancePrompt(plan.seedancePrompt);
          if (sp) setVideoPrompt(sp);
          if (plan.totalDurationSec) {
            const dur = String(Math.min(15, Math.max(4, Math.round(plan.totalDurationSec))));
            setStoryboardTrimDuration(dur as StoryboardDurationPreset);
          }
        } else if (analysis?.seedancePrompt) {
          const sp = sanitizeStoryboardSeedancePrompt(analysis.seedancePrompt);
          if (sp) setVideoPrompt(sp);
        }
        if (typeof data.styleReferenceFrameUrl === "string" && data.styleReferenceFrameUrl) {
          await applyReelStyleReferenceFrame(data.styleReferenceFrameUrl);
        }
        if (typeof data.referenceVideoUrl === "string") {
          setReferenceVideoFalUrl(data.referenceVideoUrl);
        }
        if (typeof data.referenceDurationSec === "number") {
          setRefVideoDurationSec(data.referenceDurationSec);
        }
        setResearchReelAnalyzeNote(
          referenceVideoAnalyzeIncludesStoryboard
            ? m.wizard.researchReelAnalyzed
            : m.wizard.referenceVideoAnalyzed,
        );
        return true;
      } catch (e: unknown) {
        setResearchReelAnalyzeNote(
          e instanceof Error ? e.message : m.errors.researchReelAnalyzeFailed,
        );
        return false;
      } finally {
        setResearchReelAnalyzeBusy(false);
      }
    },
    [
      promotionMode,
      product,
      business,
      headline,
      conceptIdea,
      subline,
      offer,
      effectivePromptExtra,
      promptMarket,
      artStyleId,
      subjectFraming,
      referenceStrategy.kind,
      storyboardSceneCount,
      m.errors.researchReelAnalyzeFailed,
      m.wizard.researchReelAnalyzed,
      m.wizard.referenceVideoAnalyzed,
      m.wizard.referenceVideoAnalyzing,
      m.wizard.researchReelAnalyzing,
      setResearchReelAnalysis,
      setResearchReelAnalyzeBusy,
      setResearchReelAnalyzeNote,
      setStoryboardPlan,
      setStoryboardTrimDuration,
      setVideoPrompt,
      setUserReferenceBrief,
      setImageRefPhoto,
      setImageCreativeMode,
      referenceVideoAnalyzeIncludesStoryboard,
      setReferenceVideoFalUrl,
      setRefVideoDurationSec,
      videoSettings,
    ],
  );

  const referenceAdIdentity = referenceAd
    ? `${referenceAd.name}:${referenceAd.size}:${referenceAd.lastModified}`
    : null;
  const prevReferenceAdIdentityRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = prevReferenceAdIdentityRef.current;
    prevReferenceAdIdentityRef.current = referenceAdIdentity;

    // Always reset analysis when the reference file changes (or clears).
    setResearchReelAnalysis(null);
    setResearchReelAnalyzeNote(null);
    setReferenceVideoFalUrl(null);
    researchReelAnalyzeKeyRef.current = null;

    // Wipe generated storyboard only when switching/clearing the reference —
    // not on first mount (would erase scenes right after generate + remount/HMR).
    const isFirstRun = prev === undefined;
    const referenceChanged = !isFirstRun && prev !== referenceAdIdentity;
    if (referenceChanged) {
      setStoryboardPlan(null);
      setStoryboardScenes([]);
    }
  }, [
    referenceAdIdentity,
    setResearchReelAnalysis,
    setResearchReelAnalyzeNote,
    setStoryboardPlan,
    setStoryboardScenes,
  ]);

  const reelAnalyzeCacheKey = referenceAd
    ? `${referenceAdIdentity}:${effectivePromoteName}:${referenceVideoAnalyzeIncludesStoryboard ? "sb" : "r2v"}:${reelAnalyzeOutputDurationSec}`
    : null;

  useEffect(() => {
    if (!shouldAnalyzeReferenceVideo || !referenceAd || !reelAnalyzeCacheKey) return;
    const prevKey = researchReelAnalyzeKeyRef.current;
    if (prevKey === reelAnalyzeCacheKey) return;
    if (prevKey && prevKey !== reelAnalyzeCacheKey) {
      setResearchReelAnalysis(null);
      setStoryboardPlan(null);
      // Keep storyboardScenes — wiping here hid fal results after generate
      // whenever duration/name/cache key changed and re-analyze fired.
      setResearchReelAnalyzeNote(m.wizard.researchReelReanalyzeForDuration);
    }
    void analyzeResearchReel(referenceAd).then((ok) => {
      if (ok) researchReelAnalyzeKeyRef.current = reelAnalyzeCacheKey;
    });
  }, [
    shouldAnalyzeReferenceVideo,
    referenceAd,
    reelAnalyzeCacheKey,
    analyzeResearchReel,
    m.wizard.researchReelReanalyzeForDuration,
    setResearchReelAnalysis,
    setResearchReelAnalyzeNote,
    setStoryboardPlan,
  ]);

  useEffect(() => {
    if (!quickFixLogoFile) {
      setQuickFixLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(quickFixLogoFile);
    setQuickFixLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [quickFixLogoFile, setQuickFixLogoPreviewUrl]);

  useEffect(() => {
    if (!endFramePhoto) {
      setEndFramePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(endFramePhoto);
    setEndFramePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [endFramePhoto]);

  useEffect(() => {
    if (!referenceAd) {
      setReferencePreviewUrl(null);
      setReferenceIsVideo(false);
      setRefVideoDurationSec(null);
      setReferenceVideoFalUrl(null);
      setResearchReelAnalysis(null);
      setResearchReelAnalyzeNote(null);
      return;
    }
    const url = URL.createObjectURL(referenceAd);
    setReferencePreviewUrl(url);
    setReferenceIsVideo(referenceAd.type.startsWith("video/"));
    return () => URL.revokeObjectURL(url);
  }, [referenceAd]);

  useEffect(() => {
    if (!packagingPhoto) {
      setPackagingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(packagingPhoto);
    setPackagingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [packagingPhoto]);

  useEffect(() => {
    const urls = extraKitPhotos.map((f: File) => URL.createObjectURL(f));
    setExtraKitPreviewUrls(urls);
    return () => urls.forEach((u: string) => URL.revokeObjectURL(u));
  }, [extraKitPhotos]);

  useEffect(() => {
    setProductVideoPlan(null);
    setVideoPromptPlanNote(null);
    if (promotionMode === "concept" && isAiPlannedVideoStyle(visualStyleId)) {
      setVideoPrompt("");
    }
  }, [productPhoto, packagingPhoto, extraKitPhotos, promotionMode, visualStyleId, setVideoPrompt]);

  useEffect(() => {
    applyPromptRebuild();
  }, [
    templateId,
    visualStyleId,
    artStyleId,
    promotionMode,
    workflowMode,
    promptMarket,
    subjectFraming,
    promptExtra,
    product,
    business,
    offer,
    headline,
    subline,
    applyPromptRebuild,
    imageCreativeMode,
    videoCreativeMode,
    videoSettings,
    extraAnglePhotos.length,
    endFrameUrl,
    endFramePhoto,
    brandProfile,
  ]);

  const planAiVideoPrompt = useCallback(async () => {
    if (isCreativeVideoStyle(visualStyleId) && !creativeVideoBrief.trim() && !headline.trim()) {
      setError(m.errors.creativeBriefRequired);
      return;
    }
    const conceptTextPlan =
      promotionMode === "concept" &&
      workflowMode === "video-only" &&
      videoCreativeMode === "product-promo" &&
      !productPhoto &&
      !imageUrl;
    setPlanVideoPromptBusy(true);
    setError(null);
    try {
      const outputDurationSec = resolveWizardOutputDurationSec(videoSettings);
      const useCreativePlanner =
        isCreativeVideoStyle(visualStyleId) ||
        (promotionMode === "concept" && isBrandVideoStyle(visualStyleId));
      const res = await fetch("/api/plan-video-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: useCreativePlanner
            ? "creative"
            : brandProfile?.businessName || isBrandVideoStyle(visualStyleId)
              ? "brand"
              : "product",
          brandProfile: brandProfile ?? undefined,
          creativeBrief:
            creativeVideoBrief.trim() ||
            [headline.trim(), subline.trim(), offer.trim(), conceptIdea.trim()]
              .filter(Boolean)
              .join(" | "),
          product: product.trim(),
          business: business.trim(),
          headline: headline.trim(),
          subline: subline.trim(),
          offer: offer.trim(),
          duration: String(outputDurationSec),
          hasReferenceVideo: useReferenceVideo,
          textToVideo: conceptTextPlan,
          promotionMode,
          hasKeyframe: Boolean(productPhoto || imageUrl),
          imageVisionNote: conceptImageVisionNote.trim() || undefined,
          conceptIdea: conceptIdea.trim() || undefined,
          artStyleId,
          subjectFraming,
          promptExtra: effectivePromptExtra(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.planVideoPromptFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      setVideoPrompt(String(data.videoPrompt ?? ""));
      const note = [
        data.sourceNote as string | undefined,
        data.motionSummary as string | undefined,
        String(data.productionNotes ?? "").trim() || undefined,
        m.wizard.planVideoPromptReady,
      ]
        .filter(Boolean)
        .join(" — ");
      setVideoPromptPlanNote(note);
      setShowAdvancedVideo(true);
      aiVideoPromptDurationRef.current = String(outputDurationSec);
      const suggested = String(data.suggestedHeadline ?? "").trim();
      if (suggested && !headline.trim()) setHeadline(suggested);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.planVideoPromptFailed));
    } finally {
      setPlanVideoPromptBusy(false);
    }
  }, [
    visualStyleId,
    brandProfile,
    creativeVideoBrief,
    conceptImageVisionNote,
    product,
    business,
    headline,
    subline,
    offer,
    templateId,
    videoSettings,
    useReferenceVideo,
    promotionMode,
    workflowMode,
    videoCreativeMode,
    productPhoto,
    imageUrl,
    conceptIdea,
    artStyleId,
    subjectFraming,
    effectivePromptExtra,
    m.errors.creativeBriefRequired,
    m.errors.planVideoPromptFailed,
    m.wizard.planVideoPromptReady,
  ]);

  const planProductVideo = useCallback(async () => {
    if (!productPhoto) {
      setError(m.errors.needPhoto);
      return;
    }
    setPlanProductVideoBusy(true);
    setError(null);
    try {
      const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
      const slots: string[] = ["hero"];
      const fd = new FormData();
      fd.set("hero", productPhoto);
      if (packagingPhoto) {
        fd.set("packaging", packagingPhoto);
        slots.push("packaging");
      }
      for (const [i, file] of extraKitPhotos.slice(0, 2).entries()) {
        fd.set(i === 0 ? "extra1" : "extra2", file);
        slots.push(i === 0 ? "extra1" : "extra2");
      }
      fd.set("slots", slots.join(","));
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
      fd.set("product_name", product.trim());
      fd.set("business", business.trim());
      fd.set("headline", headline.trim());
      fd.set("subline", subline.trim());
      fd.set("offer", offer.trim());
      fd.set("duration", String(resolveWizardOutputDurationSec(videoSettings)));
      fd.set("prompt_market", promptMarket);
      fd.set("subject_framing", subjectFraming);
      fd.set("prompt_extra", effectivePromptExtra());
      const data = await postPlanProductVideo(fd);
      const plan = data.plan;
      setProductVideoPlan(plan);
      setVideoPrompt(plan.seedancePrompt);
      const note = [
        data.sourceNote as string | undefined,
        plan.motionSummaryZh,
        plan.productionNotes,
        plan.situation ? `${m.wizard.productVideoSituationLabel}: ${plan.situation}` : undefined,
        m.wizard.planProductVideoReady,
      ]
        .filter(Boolean)
        .join(" — ");
      setVideoPromptPlanNote(note);
      setShowAdvancedVideo(true);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.planProductVideoFailed));
    } finally {
      setPlanProductVideoBusy(false);
    }
  }, [
    productPhoto,
    packagingPhoto,
    extraKitPhotos,
    product,
    business,
    headline,
    subline,
    offer,
    templateId,
    videoSettings,
    visualStyleId,
    promptMarket,
    subjectFraming,
    effectivePromptExtra,
    m.errors.needPhoto,
    m.errors.planProductVideoFailed,
    m.wizard.planProductVideoReady,
    m.wizard.productVideoSituationLabel,
    friendlyError,
  ]);

  useEffect(() => {
    if (stepKey !== "video" || usesCompositor || isStoryboardOutput || isUgcPresenterOutput) return;
    if (usesProductAssistant) return;
    if (planVideoPromptBusy) return;
    if (researchReelAnalysis?.seedancePrompt?.trim()) return;
    if (directReferenceR2vReady) return;
    if (useReferenceVideo && isContentResearchStyle) return;
    const plannedDuration = String(resolveWizardOutputDurationSec(videoSettings));
    if (
      isAiPlannedVideoStyle(visualStyleId) &&
      videoPrompt.trim() &&
      aiVideoPromptDurationRef.current === plannedDuration &&
      videoPromptPlanNote
    ) {
      return;
    }
    if (!isAiPlannedVideoStyle(visualStyleId) && videoPrompt.trim()) return;
    if (
      isCreativeVideoStyle(visualStyleId) &&
      !creativeVideoBrief.trim() &&
      !headline.trim()
    ) {
      return;
    }
    if (
      isAiPlannedVideoStyle(visualStyleId) &&
      videoPrompt.trim() &&
      aiVideoPromptDurationRef.current &&
      aiVideoPromptDurationRef.current !== plannedDuration
    ) {
      setVideoPromptPlanNote(m.wizard.planVideoPromptDurationRefresh);
    }
    void planAiVideoPrompt();
  }, [
    stepKey,
    visualStyleId,
    usesCompositor,
    isStoryboardOutput,
    isUgcPresenterOutput,
    usesProductAssistant,
    brandProfile?.businessName,
    creativeVideoBrief,
    conceptImageVisionNote,
    videoPrompt,
    planVideoPromptBusy,
    videoPromptPlanNote,
    promotionMode,
    conceptIdea,
    planAiVideoPrompt,
    researchReelAnalysis?.seedancePrompt,
    directReferenceR2vReady,
    useReferenceVideo,
    isContentResearchStyle,
    videoSettings.duration,
    videoSettings.resolution,
    artStyleId,
    subjectFraming,
    m.wizard.planVideoPromptDurationRefresh,
  ]);

  async function analyzeBrand(override?: { websiteUrl?: string }) {
    const websiteUrl =
      override?.websiteUrl?.trim() || brandWebsiteUrl.trim();
    if (!websiteUrl && !brandSocialHint.trim()) {
      setError(m.errors.brandUrlRequired);
      return null;
    }
    setBrandAnalyzeBusy(true);
    setError(null);
    setBrandAnalyzeNote(null);
    try {
      if (override?.websiteUrl?.trim()) {
        setBrandWebsiteUrl(override.websiteUrl.trim());
      }
      const res = await fetch("/api/analyze-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl || undefined,
          socialHint: brandSocialHint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.brandAnalyzeFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      const profile = data.profile as BrandProfile;
      setBrandProfile(profile);
      let mergedKit = brandKit;
      setBrandKit((prev) => {
        mergedKit = mergeBrandProfileIntoKit(profile, prev);
        saveBrandKitToStorage(mergedKit);
        return mergedKit;
      });
      setBrandAnalyzeNote((data.sourceNote as string) + " — " + profile.summary);
      if (profile.businessName) setBusiness(profile.businessName);
      const suggested = effectiveBrandHeadline("", mergedKit, profile);
      if (suggested && !headline.trim()) {
        setHeadline(suggested);
      }
      if (profile.suggestedBullets.length && !subline.trim()) {
        setSubline(profile.suggestedBullets.join("\n"));
      }
      if (profile.adPromptExtra && !promptExtra.trim()) {
        setPromptExtra(profile.adPromptExtra);
      }
      return profile;
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.brandAnalyzeFailed));
      return null;
    } finally {
      setBrandAnalyzeBusy(false);
    }
  }

  function selectVisualStyle(id: VisualStyleId) {
    const style = getVisualStyle(id);
    setVisualStyleId(id);
    setTemplateId(style.templateId);
    setImageInputMode(getTemplateConfig(style.templateId).defaultImageInputMode);
    if (!isBrandVisualStyle(id)) {
      setBrandProfile(null);
      setBrandAnalyzeNote(null);
    }
    if (isCampaignVisualStyle(id)) {
      setImageOutputMode("campaign");
    }
    if (isAiPlannedVideoStyle(id)) {
      setVideoPrompt("");
      setVideoPromptPlanNote(null);
    } else {
      setVideoPromptPlanNote(null);
    }
    if (!isCreativeVideoStyle(id)) {
      setCreativeVideoBrief("");
    }
    if (!isStoryboardVideoStyle(id)) {
      setStoryboardBrief("");
      setStoryboardPlan(null);
      setStoryboardScenes([]);
    } else {
      setVideoPrompt("");
    }
    if (!isConceptCinematicStyle(id)) {
      setCinematicStitchReel(false);
      setCinematicReelPlan(null);
      setCinematicScenes([]);
    }
    setVideoSettings((prev: VideoSettings) => ({
      ...prev,
      motionStyle: defaultMotionStyleForTemplate(style.templateId),
      ...(isStoryboardVideoStyle(id)
        ? {
            resolution: "720p" as const,
            creativity: "subtle" as const,
            autoSecondFrame: false,
            fast: false,
          }
        : {}),
    }));
    setCampaignPlan(null);
    setCampaignSlides([]);
    applyPromptRebuild(style.templateId);
  }

  async function loadReferenceClip(clipId: ReferenceClipId) {
    setReferenceClipLoading(true);
    setError(null);
    try {
      const file = await fetchReferenceClipAsFile(clipId);
      setReferenceAd(file);
      setSelectedReferenceClipId(clipId);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.videoFailed));
    } finally {
      setReferenceClipLoading(false);
    }
  }

  function slotFilled(slot: TemplateSlotId): boolean {
    switch (slot) {
      case "product":
        if (promotionMode === "concept" && isStoryboardOutput) {
          return Boolean(effectivePromoteName);
        }
        return Boolean(product.trim());
      case "headline":
        return Boolean(headline.trim());
      case "subline":
        return Boolean(subline.trim());
      case "productPhoto":
        return Boolean(productPhoto);
      case "styleRef":
        return Boolean(imageRefPhoto);
      case "referenceVideo":
        return Boolean(referenceAd && referenceIsVideo);
      case "business":
        return Boolean(business.trim());
      case "offer":
        return Boolean(offer.trim());
      default:
        return false;
    }
  }

  function templateSlotStatus(): Partial<Record<TemplateSlotId, boolean>> {
    const out: Partial<Record<TemplateSlotId, boolean>> = {};
    for (const slot of templateConfig.slots) {
      out[slot.id] = slotFilled(slot.id);
    }
    return out;
  }

  function onWorkflowModeChange(mode: WorkflowMode) {
    setWorkflowMode(mode);
    setStepKey("setup");
    setError(null);
    setImageCreativeMode(defaultImageModeForGoal(mode));
    setVideoCreativeMode(defaultVideoModeForStudio(promotionMode, mode));
    setImageOutputMode(
      mode === "image-only"
        ? promotionMode === "concept"
          ? "single"
          : "ab"
        : DEFAULT_IMAGE_OUTPUT_MODE,
    );
    setImageAspectRatio(defaultImageAspectRatioForWorkflow(mode));
    if (mode === "image-only" && promotionMode === "concept") {
      setImageInputMode(getTemplateConfig(templateId).defaultImageInputMode);
    } else if (mode === "image-only") {
      setImageInputMode(DEFAULT_IMAGE_INPUT_MODE);
    }
    if (mode === "video-only") {
      setVideoSettings(videoSettingsForWorkflow("video-only", templateId));
    }
    if (mode === "combined") {
      setVideoSettings(videoSettingsForWorkflow("combined", templateId));
      setUseOriginalImage(false);
      setShipItMode(false);
      setImageOutputMode("single");
      // 圖+片 → storyboard reel (UGC / cinematic keep their own styles).
      if (
        !isUgcPresenterStyle(visualStyleId) &&
        !isConceptCinematicStyle(visualStyleId)
      ) {
        selectVisualStyle("storyboard-video");
        return;
      }
    }
    if (
      !isVisualStyleAllowedForWorkflow(visualStyleId, mode) ||
      !visualStyleAllowedForPromotion(visualStyleId, promotionMode)
    ) {
      selectVisualStyle(defaultVisualStyleForWorkflow(promotionMode, mode));
    }
  }

  function applyPrimaryPath(path: "quick" | "model" | "storyboard" | "reference" | "ugc-presenter") {
    setError(null);
    setStepKey("setup");
    if (path === "reference") {
      setWorkflowMode("image-only");
      selectVisualStyle("product");
      setImageCreativeMode("reference-concept");
      return;
    }
    setWorkflowMode("combined");
    if (path === "ugc-presenter") {
      selectVisualStyle("ugc-presenter");
      setImageOutputMode("single");
      setVoiceoverEnabled(true);
      setVoiceoverLocale("hk");
      setVideoSettings((prev: VideoSettings) => ({
        ...prev,
        duration: "6",
        resolution: "720p",
        fast: false,
      }));
      return;
    }
    // 圖+片 primary paths → storyboard reel (not single-poster animate).
    selectVisualStyle("storyboard-video");
    setVideoSettings(videoSettingsForWorkflow("combined", templateId));
  }

  function applyPrimaryPathConcept(path: "info" | "brand" | "pricing" | "website") {
    setError(null);
    setStepKey("setup");
    if (workflowMode !== "video-only") {
      setImageAspectRatio("4:5");
      setImageOutputMode("single");
    }
    if (path === "info") selectVisualStyle("info-poster");
    else if (path === "brand") selectVisualStyle("brand-fit");
    else if (path === "pricing") selectVisualStyle("pricing-offer");
    else selectVisualStyle("website-launch");
  }

  function applyConceptCinematicWorkflow(stitch: boolean) {
    setError(null);
    setWorkflowMode("combined");
    setStepKey("setup");
    setVideoCreativeMode("image-to-video");
    setImageAspectRatio("9:16");
    setImageOutputMode("single");
    const count: CinematicSceneCount = stitch ? 3 : 1;
    setCinematicSceneCount(count);
    setCinematicStitchReel(stitch);
    setCinematicReelPlan(null);
    setCinematicScenes([]);
    selectVisualStyle("concept-cinematic");
    setVideoSettings((prev: VideoSettings) => ({
      ...videoSettingsForWorkflow("combined", "creative-video"),
      duration: "8",
      resolution: "720p",
      creativity: CINEMATIC_REEL_VIDEO_CREATIVITY,
      motionStyle: "gentle-orbit",
      fast: false,
      autoSecondFrame: false,
    }));
  }

  function applyPrimaryPathConceptVideo(path: "brand" | "creative" | "cinematic") {
    if (path === "cinematic") {
      applyConceptCinematicWorkflow(false);
      return;
    }
    setError(null);
    setWorkflowMode("video-only");
    setVideoSettings(videoSettingsForWorkflow("video-only", templateId));
    setVideoCreativeMode("product-promo");
    setStepKey("setup");
    if (path === "brand") selectVisualStyle("brand-video");
    else selectVisualStyle("creative-video");
  }

  function applyCinematicStitchRecipe() {
    applyConceptCinematicWorkflow(true);
  }

  function onCinematicSceneCountChange(count: CinematicSceneCount) {
    setCinematicSceneCount(count);
    setCinematicStitchReel(count > 1);
    setCinematicReelPlan(null);
    setCinematicScenes([]);
    setAdPackPlan(null);
    setCaptionLines([]);
  }

  function applyClosestMatchRecipe() {
    applyConceptCinematicWorkflow(true);
    setPromptMarket("hk");
    setMusicMood("cinematic");
    setMusicSource("library");
    setVoiceoverEnabled(false);
    setVoiceoverLocale("hk");
    setCaptionBurnEnabled(false);
  }

  function applyQuickTest8sRecipe() {
    applyConceptCinematicWorkflow(false);
    setUseOriginalImage(false);
    setPromptMarket("hk");
    setMusicMood("cinematic");
    setMusicSource("library");
    setVoiceoverEnabled(false);
    setVoiceoverLocale("hk");
    setCaptionBurnEnabled(false);
    setVideoSettings((prev: VideoSettings) => ({
      ...prev,
      duration: "8",
      resolution: "480p",
      fast: true,
      creativity: "subtle",
      motionStyle: "static-glow",
      autoSecondFrame: false,
    }));
  }

  function applyPrimaryPathVideoOnly(
    path: "assistant" | "storyboard" | "brand" | "creative" | "ugc-presenter",
  ) {
    setError(null);
    // UGC needs a talking-head keyframe then HeyGen — use combined image→video, not Seedance video-only.
    if (path === "ugc-presenter") {
      applyPrimaryPath("ugc-presenter");
      return;
    }
    setWorkflowMode("video-only");
    setVideoSettings(videoSettingsForWorkflow("video-only", templateId));
    setStepKey("setup");
    if (path === "assistant") {
      setVideoCreativeMode("product-assistant");
      selectVisualStyle("product");
      return;
    }
    setVideoCreativeMode("product-promo");
    if (path === "storyboard") selectVisualStyle("storyboard-video");
    else if (path === "brand") selectVisualStyle("brand-video");
    else selectVisualStyle("creative-video");
  }

  async function onProductPhotoSelected(file: File | null) {
    setProductPhoto(file);
    setImageUrl(null);
    setImageVariantUrls([]);
    setSelectedVariantIndex(0);
    setUseOriginalImage(
      Boolean(file) &&
        (promotionMode === "concept" ||
          workflowMode === "video-only" ||
          workflowMode === "combined"),
    );
    setError(null);
    setUploadQualityWarning(null);
    if (!file) {
      setConceptImageVisionNote("");
      return;
    }
    try {
      const quality = await analyzeProductImageFile(file);
      setUploadQualityWarning(quality.warnings[0] ?? null);
    } catch {
      setUploadQualityWarning(null);
    }
  }

  function uploadQualityMessage(warning: ImageUploadWarning): string {
    if (warning === "very-small") return m.wizard.uploadQualityVerySmall;
    return m.wizard.uploadQualityLowRes;
  }

  async function refreshImageVisionReview(url: string): Promise<ImageVisionReview | null> {
    setImageVisionReviewBusy(true);
    try {
      const res = await fetch("/api/review-generated-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          image_url: url,
          product: product.trim(),
          headline: effectiveBrandHeadline(headline, brandKit, brandProfile),
          image_text_mode: imageTextMode,
        }),
      });
      const data = (await res.json()) as { review?: ImageVisionReview; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Vision review failed");
      const review = data.review ?? null;
      setImageVisionReview(review);
      return review;
    } catch {
      setImageVisionReview(null);
      return null;
    } finally {
      setImageVisionReviewBusy(false);
    }
  }

  async function refreshImagePostflight(url: string) {
    setImagePostflightBusy(true);
    try {
      const quality = await analyzeImageUrl(url);
      setImagePostflight(
        buildImagePostflight({
          width: quality.width,
          height: quality.height,
          aspectRatio: effectiveImageAspectRatio,
          workflowMode,
          warnings: quality.warnings,
        }),
      );
      setImageQualityChecklist({ productReadable: false, textLegible: false });
    } catch {
      setImagePostflight(null);
    } finally {
      setImagePostflightBusy(false);
    }
    void refreshImageVisionReview(url);
  }

  function applyShipItDefaults() {
    if (workflowMode === "combined") {
      setImageAspectRatio("9:16");
      setImageOutputMode("single");
      setImageTextMode("textless");
      setMusicSource("library");
      setVoiceoverEnabled(false);
      setCaptionBurnEnabled(false);
      setBgmTrack("calm");
      if (videoCreativeMode !== "image-to-video") {
        setVideoCreativeMode("image-to-video");
      }
    }
    setShowAdvancedSetup(false);
    setShowAdvancedSetupPrompts(false);
    setShowAdvancedImage(false);
    setShowAdvancedVideo(false);
  }

  const shipItEligible =
    workflowMode === "combined" &&
    !usesCompositor &&
    !isStoryboardOutput &&
    !isUgcPresenterOutput &&
    !isCinematicStitchOutput &&
    !isConceptCinematicSingleOutput &&
    !isCampaignOutput &&
    !isTeachingCarouselOutput &&
    videoCreativeMode === "image-to-video" &&
    promotionMode !== "concept" &&
    Boolean(productPhoto || product.trim());

  // Hard lock: 圖+片 (except UGC / cinematic) must stay on storyboard-video.
  // Prevents drift into 單圖動態 / 教學輪播 / 一鍵出片 after research or mode sync.
  useEffect(() => {
    if (workflowMode !== "combined") return;
    if (isUgcPresenterStyle(visualStyleId) || isConceptCinematicStyle(visualStyleId)) return;
    if (visualStyleId !== "storyboard-video") {
      selectVisualStyle("storyboard-video");
      return;
    }
    if (imageOutputMode !== "single") {
      setImageOutputMode("single");
    }
    if (shipItMode) setShipItMode(false);
    if (useOriginalImage) setUseOriginalImage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional lock on combined drift
  }, [workflowMode, visualStyleId, imageOutputMode, shipItMode, useOriginalImage]);

  useEffect(() => {
    if (!imageUrl || useOriginalImage || isStoryboardOutput || isCinematicStitchOutput) {
      if (!imageUrl) {
        setImagePostflight(null);
        setImageVisionReview(null);
      }
      return;
    }
    void refreshImagePostflight(imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when output URL or target aspect changes
  }, [imageUrl, effectiveImageAspectRatio, workflowMode, useOriginalImage, isStoryboardOutput, isCinematicStitchOutput]);

  function normalizeGeneratedImageUrl(raw: string | undefined | null): string | null {
    const u = raw?.trim() ?? "";
    if (!u) return null;
    if (u.startsWith("http")) return u;
    if (u.startsWith("/api/pipeline-files/")) return u;
    // Durable R2 library URLs — fal succeeded; API mirrored to /api/library/download/:id
    if (isLibraryAssetUrl(u) || u.startsWith("/api/library/download/")) return u;
    // Last resort: keep same-origin relative URLs so storyboard confirm UI still shows.
    if (u.startsWith("/")) return u;
    return null;
  }

  function applyGeneratedImages(urls: string[], endpoint?: string): string | null {
    const list = urls
      .map((u) => normalizeGeneratedImageUrl(u))
      .filter((u): u is string => Boolean(u));
    if (!list.length) return null;
    setCampaignPlan(null);
    setCampaignSlides([]);
    setStoryboardPlan(null);
    setStoryboardScenes([]);
    setImageVariantUrls(list);
    setSelectedVariantIndex(0);
    setImageUrl(list[0]);
    imageUrlRef.current = list[0];
    setImageGenKey((k: number) => k + 1);
    setLastImageEndpoint(endpoint ?? null);
    setUseOriginalImage(false);
    setQuickFixCredits(1);
    void refreshImagePostflight(list[0]);
    savePromptSnapshot(
      createPromptSnapshot({
        kind: "image",
        templateId,
        visualStyleId,
        imagePrompt,
        negativePrompt,
        endpoint,
      }),
    );
    return list[0];
  }

  function applyGeneratedStoryboard(
    scenes: StoryboardSceneResult[],
    plan: VideoStoryboardPlan,
    seedancePrompt: string,
    endpoint?: string,
  ) {
    const hydratedScenes: StoryboardSceneResult[] = [];
    for (const scene of scenes) {
      const planScene = plan.scenes.find((p) => p.imageIndex === scene.imageIndex);
      const imageUrl = normalizeGeneratedImageUrl(scene.imageUrl);
      if (!imageUrl) continue;
      hydratedScenes.push({
        ...scene,
        imageUrl,
        imagePrompt: scene.imagePrompt ?? planScene?.imagePrompt,
      });
    }
    if (!hydratedScenes.length) {
      setError(m.errors.imageGenNoUrl);
      return;
    }
    // Storyboard always continues to video — never leave wizard stuck on image-only.
    if (workflowMode === "image-only") {
      setWorkflowMode("combined");
    }
    const urls = hydratedScenes.map((s) => s.imageUrl);
    setStoryboardScenes(hydratedScenes);
    setStoryboardPlan(plan);
    setCampaignPlan(null);
    setCampaignSlides([]);
    setImageVariantUrls([]);
    setSelectedVariantIndex(0);
    setImageUrl(urls[0]);
    setImageGenKey((k: number) => k + 1);
    setLastImageEndpoint(endpoint ?? null);
    setUseOriginalImage(false);
    setVideoPrompt(seedancePrompt);
    setVideoPromptPlanNote(plan.productionNotes || null);
    setShowAdvancedVideo(true);
    const nearest = ["4", "6", "8", "10", "12"].reduce(
      (best, d) => {
        const bestDiff = Math.abs(Number(best) - plan.totalDurationSec);
        const nextDiff = Math.abs(Number(d) - plan.totalDurationSec);
        return nextDiff < bestDiff ? d : best;
      },
      "8",
    ) as StoryboardDurationPreset;
    setStoryboardTrimDuration(nearest);
    setQuickFixCredits(1);
    savePromptSnapshot(
      createPromptSnapshot({
        kind: "storyboard",
        templateId,
        visualStyleId,
        videoPrompt: seedancePrompt,
        seedancePrompt,
        endpoint,
      }),
    );
  }

  function normalizeStoryboardIndices(scenes: StoryboardSceneResult[]): StoryboardSceneResult[] {
    return scenes.map((scene, i) => ({ ...scene, imageIndex: i + 1 }));
  }

  function reorderStoryboardScene(from: number, to: number) {
    setStoryboardScenes((prev: StoryboardSceneResult[]) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return normalizeStoryboardIndices(next);
    });
  }

  function trimStoryboardDurations(targetSecRaw: StoryboardDurationPreset) {
    setStoryboardTrimDuration(targetSecRaw);
    setVideoSettings((prev: VideoSettings) => ({
      ...prev,
      duration: targetSecRaw as VideoDuration,
    }));
    const targetSec = Number(targetSecRaw);
    setStoryboardScenes((prev: StoryboardSceneResult[]) => {
      if (!prev.length) return prev;
      const originalDurations = prev.map((scene) => Math.max(1, scene.endSec - scene.startSec));
      const totalOriginal = originalDurations.reduce((sum, v) => sum + v, 0) || 1;
      let assigned = originalDurations.map((d) => Math.max(1, Math.round((d / totalOriginal) * targetSec)));
      let totalAssigned = assigned.reduce((sum, v) => sum + v, 0);
      while (totalAssigned > targetSec) {
        const idx = assigned.findIndex((v) => v > 1);
        if (idx === -1) break;
        assigned[idx] -= 1;
        totalAssigned -= 1;
      }
      while (totalAssigned < targetSec) {
        const idx = assigned.indexOf(Math.min(...assigned));
        assigned[idx] += 1;
        totalAssigned += 1;
      }
      let cursor = 0;
      return prev.map((scene, i) => {
        const span = assigned[i] ?? 1;
        const startSec = cursor;
        const endSec = cursor + span;
        cursor = endSec;
        return { ...scene, startSec, endSec };
      });
    });
    setStoryboardPlan((prev: VideoStoryboardPlan | null) => (prev ? { ...prev, totalDurationSec: targetSec } : prev));
  }

  async function replaceStoryboardSceneImage(sceneIndex: number, file: File | null) {
    if (!file) return;
    if (sceneIndex < 0 || sceneIndex >= storyboardScenes.length) return;
    setStoryboardSceneReplaceBusy(sceneIndex);
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      setStoryboardScenes((prev: StoryboardSceneResult[]) =>
        prev.map((scene, i) => (i === sceneIndex ? { ...scene, imageUrl: url } : scene)),
      );
      setImageGenKey((k: number) => k + 1);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.storyboardFailed));
    } finally {
      setStoryboardSceneReplaceBusy(null);
    }
  }

  async function regenerateStoryboardSceneWithAi(sceneIndex: number) {
    if (sceneIndex < 0 || sceneIndex >= storyboardScenes.length) return;
    if (!productPhoto && !isConceptStoryboardOutput) {
      setError(m.errors.needPhoto);
      return;
    }
    const scene = storyboardScenes[sceneIndex];
    const fallbackPrompt =
      storyboardPlan?.scenes.find((p: { role: string; imagePrompt?: string }) => p.role === scene.role)?.imagePrompt ??
      storyboardPlan?.scenes[sceneIndex]?.imagePrompt;
    const prompt = (scene.imagePrompt || fallbackPrompt || "").trim();
    if (!prompt) {
      setError(m.errors.storyboardFailed);
      return;
    }
    const confirmMessage = m.wizard.storyboardRegenerateConfirm.replace(
      "{scene}",
      String(scene.imageIndex),
    );
    if (!window.confirm(confirmMessage)) return;

    setStoryboardSceneRegenerateBusy(sceneIndex);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
      fd.set("promotion_mode", promotionMode);
      fd.set(
        "product_name",
        isConceptStoryboardOutput ? effectivePromoteName : product.trim(),
      );
      if (conceptIdea.trim()) fd.set("concept_idea", conceptIdea.trim());
      fd.set("business", business.trim());
      fd.set("headline", headline.trim());
      fd.set("subline", subline.trim());
      fd.set("offer", offer.trim());
      fd.set("prompt_market", promptMarket);
      fd.set("subject_framing", subjectFraming);
      fd.set("prompt_extra", effectivePromptExtra());
      fd.set("workflow_mode", workflowMode);
      fd.set("aspect_ratio", tpl.aspectRatio);
      fd.set(
        "endpoint",
        isConceptStoryboardOutput && !productPhoto
          ? TEXT_ENDPOINT
          : referenceStrategy.sendPixelsToFal
            ? EDIT_ENDPOINT
            : TEXT_ENDPOINT,
      );
      fd.set("num_images", "1");
      fd.set("prompt", prompt);
      attachReferenceToForm(fd);

      const res = await fetch("/api/generate-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.storyboardFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      const nextUrl = normalizeGeneratedImageUrl(
        (data.imageUrl as string | undefined) ?? "",
      );
      if (!nextUrl) throw new Error(m.errors.imageGenNoUrl);

      setStoryboardScenes((prev: StoryboardSceneResult[]) =>
        prev.map((s, i) =>
          i === sceneIndex ? { ...s, imageUrl: nextUrl, imagePrompt: prompt } : s,
        ),
      );
      if (sceneIndex === 0) setImageUrl(nextUrl);
      setImageGenKey((k: number) => k + 1);
      setLastImageEndpoint((data.endpoint as string | undefined) ?? lastImageEndpoint);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.storyboardFailed));
    } finally {
      setStoryboardSceneRegenerateBusy(null);
    }
  }

  function applyGeneratedCampaign(
    slides: Array<{
      role: string;
      title: string;
      headline: string;
      subline: string;
      imageUrl: string;
    }>,
    plan: CampaignPlan,
    endpoint?: string,
  ) {
    const hydrated = slides
      .map((s) => {
        const imageUrl = normalizeGeneratedImageUrl(s.imageUrl);
        if (!imageUrl) return null;
        return { ...s, imageUrl };
      })
      .filter((s): s is (typeof slides)[number] => Boolean(s));
    const urls = hydrated.map((s) => s.imageUrl);
    if (!urls.length) return;
    setCampaignSlides(hydrated);
    setCampaignPlan(plan);
    setImageVariantUrls(urls);
    setSelectedVariantIndex(0);
    setImageUrl(urls[0]);
    setImageGenKey((k: number) => k + 1);
    setLastImageEndpoint(endpoint ?? null);
    setUseOriginalImage(false);
    setQuickFixCredits(1);
    savePromptSnapshot(
      createPromptSnapshot({
        kind: "campaign",
        templateId,
        visualStyleId,
        imagePrompt,
        negativePrompt,
        endpoint,
      }),
    );
  }

  function campaignSlideLabel(role: string, title: string): string {
    const roleKey = role as keyof typeof m.wizard.campaignSlideRoles;
    const roleLabel = m.wizard.campaignSlideRoles[roleKey];
    return roleLabel ? `${roleLabel} · ${title}` : title;
  }

  function onImageCreativeModeChange(mode: ImageCreativeMode) {
    setImageCreativeMode(mode);
    setImageUrl(null);
    setImageVariantUrls([]);
    setSelectedVariantIndex(0);
    setError(null);
    applyPromptRebuild();
  }

  function onVideoCreativeModeChange(mode: VideoCreativeMode) {
    setVideoCreativeMode(mode);
    setError(null);
    if (mode !== "product-assistant") {
      setProductVideoPlan(null);
    }
    if (mode === "reference-concept") {
      setVideoSettings((s: VideoSettings) => ({
        ...s,
        resolution: "720p",
        duration: s.duration === "auto" || Number(s.duration) > 15 ? "12" : s.duration,
        fast: false,
        autoSecondFrame: false,
      }));
    }
    applyPromptRebuild();
  }

  function onImageInputModeChange(mode: ImageInputMode) {
    setImageInputMode(mode);
    setImageUrl(null);
    setUseOriginalImage(false);
    setError(null);
    if (mode === "describe") {
      setProductPhoto(null);
      setImageRefPhoto(null);
    } else if (mode === "reference") {
      setProductPhoto(null);
      setImageRefPhoto(null);
    } else if (mode === "product-ad") {
      setImageRefPhoto(null);
      applyPromptRebuild();
    }
  }

  const keyframePreview = useOriginalImage
    ? uploadPreviewUrl
    : imageUrl ?? uploadPreviewUrl;

  const hasUploadedKeyframe =
    Boolean(productPhoto) &&
    (useOriginalImage || workflowMode === "video-only" || promotionMode === "concept");

  const hasFinalImage = usesCompositor
    ? Boolean((imageUrl || productPhoto) && headline.trim())
    : isStoryboardOutput
      ? storyboardScenes.length > 0
      : isCinematicStitchOutput || cinematicStitchReady
        ? cinematicScenes.length >= cinematicSceneCount
        : isConceptCinematicSingleOutput
          ? cinematicScenes.length >= 1 || Boolean(imageUrl || useOriginalImage)
        : Boolean(imageUrl || useOriginalImage || hasUploadedKeyframe);

  const advancedSection: "image" | "video" | "all" =
    workflowMode === "image-only" ? "image" : workflowMode === "video-only" ? "video" : "all";

  const imageStepHint = isUgcPresenterOutput
    ? m.wizard.ugcPresenter.imageStepIntro
    : isCinematicStitchOutput
    ? formatCinematicCopy(m.wizard.cinematicStitchImageStepIntro)
    : isConceptCinematicSingleOutput
      ? m.wizard.conceptCinematicSingleImageStepIntro
      : isConceptStoryboardOutput
        ? m.wizard.conceptResearchReelStoryboardImageStepIntro
      : promotionMode === "concept" && workflowMode === "image-only"
        ? m.wizard.conceptSocialImageStepIntro
        : workflowMode === "image-only"
          ? m.wizard.step2Hints["image-only"]
          : m.wizard.step2Hints.combined;

  const videoStepHint =
    isUgcPresenterOutput
      ? m.wizard.ugcPresenter.videoStepIntro
      : cinematicStitchReady || isCinematicStitchOutput
      ? formatCinematicCopy(m.wizard.cinematicStitchVideoStepIntro)
      : isConceptCinematicSingleOutput
        ? m.wizard.conceptCinematicSingleVideoStepIntro
      : workflowMode === "video-only"
        ? m.wizard.step3Hints["video-only"]
        : m.wizard.step3Hints.combined;

  const estimateStoryboardSceneCount = useCallback((): number => {
    if (storyboardSceneCount !== "auto") return Number(storyboardSceneCount);
    const duration = Number(storyboardTrimDuration) || 8;
    if (duration <= 6) return 4;
    if (duration <= 10) return 5;
    return 6;
  }, [storyboardSceneCount, storyboardTrimDuration]);

  const formatEta = useCallback(
    (sec: number): string =>
      m.wizard.progressEta.replace("{seconds}", String(Math.max(1, Math.round(sec)))),
    [m.wizard.progressEta],
  );

  function resolveSetupImageGateMessage(reason: SetupImageGateReason): string {
    switch (reason) {
      case "need_headline":
        return m.errors.needHeadline;
      case "need_product_name":
        return m.errors.needProductNameSetup;
      case "need_reference_image":
        return m.errors.needReferenceImage;
      case "reference_analyzing":
        return m.wizard.referenceBriefAnalyzingWait;
      default:
        return m.errors.needHeadline;
    }
  }

  function imageGenerateBlockReason(): string | null {
    if (canGenerateImage()) return null;
    if (referenceAnalyzeBusy || researchReelAnalyzeBusy) {
      return m.wizard.referenceBriefAnalyzingWait;
    }
    if (useReferenceVideo && referenceAd && referenceIsVideo) {
      if (!researchReelAnalysis && !storyboardPlan && !videoPrompt.trim()) {
        return m.wizard.setupReferenceVideoAnalyzeRequired;
      }
    }
    if (
      imageCreativeMode === "reference-concept" &&
      !imageRefPhoto &&
      !(useReferenceVideo && researchReelAnalysis)
    ) {
      return m.errors.needReferenceImage;
    }
    if (isStoryboardOutput && promotionMode === "physical") {
      if (!product.trim()) return m.errors.needProductName;
      if (!productPhoto) return m.errors.needPhoto;
    }
    if (isUgcPresenterOutput) {
      if (!product.trim()) return m.errors.needProductName;
      if (!productPhoto) return m.errors.needPhoto;
    }
    if (visualStyleId === "info-poster" && !headline.trim()) {
      return m.errors.needHeadline;
    }
    if (promotionMode === "physical") {
      if (imageCreativeMode === "reference-concept" && imageRefPhoto && !productPhoto) {
        return m.errors.needPhoto;
      }
      if (visualStyleId === "info-poster" && !productPhoto) {
        return m.errors.needPhoto;
      }
    }
    if (
      promotionMode === "concept" &&
      conceptStyleRequiresHeadline(visualStyleId) &&
      !headline.trim()
    ) {
      return m.errors.needHeadline;
    }
    return m.wizard.imageGenerateNotReady;
  }

  async function goNextFromSetup() {
    setError(null);
    if (isSlotRequired(templateId, "headline") && !headline.trim()) {
      setError(m.errors.needHeadline);
      return;
    }
    if (
      isCreativeVideoStyle(visualStyleId) &&
      isVideoWorkflow &&
      !creativeVideoBrief.trim() &&
      !(promotionMode === "concept" && headline.trim())
    ) {
      setError(m.errors.creativeBriefRequired);
      return;
    }
    if (isStoryboardOutput && promotionMode === "physical" && !product.trim()) {
      setError(m.errors.needProductName);
      return;
    }
    if (isConceptStoryboardOutput && !effectivePromoteName) {
      setError(m.errors.needHeadline);
      return;
    }
    if (isUgcPresenterOutput && !product.trim()) {
      setError(m.errors.needProductName);
      return;
    }
    if (
      promotionMode === "physical" &&
      !usesCompositor &&
      !product.trim()
    ) {
      setError(m.errors.needProductNameSetup);
      return;
    }
    if (isContentResearchVideoPath) {
      if (!effectivePromoteName) {
        setError(
          promotionMode === "concept"
            ? m.errors.needHeadline
            : m.errors.needProductNameSetup,
        );
        return;
      }
      if (!referenceAd || !referenceIsVideo) {
        setError(m.wizard.researchReelMp4Missing);
        return;
      }
    }
    if (useReferenceVideo && referenceAd && referenceIsVideo) {
      if (!effectivePromoteName) {
        setError(
          promotionMode === "concept"
            ? m.errors.needHeadline
            : m.errors.needProductNameSetup,
        );
        return;
      }
      if (!isExplicitVideoDuration(videoSettings.duration)) {
        setError(m.wizard.researchReelPickDurationFirst);
        return;
      }
      if (researchReelAnalyzeBusy) {
        setError(m.wizard.researchReelAnalyzing);
        return;
      }
      if (!researchReelAnalysis && !storyboardPlan && !videoPrompt.trim()) {
        const ok = await analyzeResearchReel(referenceAd);
        if (!ok) {
          setError(m.errors.researchReelAnalyzeFailed);
          return;
        }
      }
    }
    const setupImageGate = evaluateProceedToImageGate({
      promotionMode,
      workflowMode,
      promptExtra,
      effectivePromoteName,
      hasReferenceImage: Boolean(imageRefPhoto),
      referenceAnalyzeBusy,
      imageCreativeMode,
      headline,
      visualStyleId,
      hasProductPhoto: Boolean(productPhoto),
      isStoryboardOutput,
    });
    if (setupImageGate) {
      setError(resolveSetupImageGateMessage(setupImageGate));
      return;
    }
    if (productPhoto && promotionMode === "concept") {
      setUseOriginalImage(true);
    }
    if (
      workflowMode === "video-only" &&
      !isStoryboardOutput &&
      promotionMode === "concept" &&
      !effectivePromoteName &&
      videoCreativeMode === "product-promo" &&
      !isCreativeVideoStyle(visualStyleId) &&
      !isBrandVideoStyle(visualStyleId)
    ) {
      setError(m.errors.needHeadline);
      return;
    }
    if (workflowMode === "video-only") {
      // Storyboard needs scene stills from step 2 before Seedance.
      setStepKey(isStoryboardOutput ? "image" : "video");
    } else {
      setStepKey("image");
    }
  }

  function goBackFromImage() {
    setStepKey("setup");
  }

  function goBackFromVideo() {
    if (workflowMode === "combined" || (workflowMode === "video-only" && isStoryboardOutput)) {
      setStepKey("image");
      return;
    }
    setStepKey("setup");
  }

  function refineSlideUrls(): string[] {
    if (campaignSlides.length > 0) {
      return campaignSlides.map((s: CampaignSlide) => s.imageUrl);
    }
    return imageVariantUrls;
  }

  function applyRefinedImage(
    url: string,
    endpoint?: string,
    slideIndex?: number,
    slideUrls?: string[],
  ) {
    if (!normalizeGeneratedImageUrl(url)) return;
    const idx = slideIndex ?? selectedVariantIndex;
    const urls = slideUrls ?? refineSlideUrls();
    setImageUrl(url);
    setImageGenKey((k: number) => k + 1);
    setLastImageEndpoint(endpoint ?? null);
    setUseOriginalImage(false);
    if (urls.length > 1) {
      setSelectedVariantIndex(idx);
      setImageVariantUrls(urls.map((u, i) => (i === idx ? url : u)));
      setCampaignSlides((prev: CampaignSlide[]) =>
        prev.length > 0
          ? prev.map((slide, i) => (i === idx ? { ...slide, imageUrl: url } : slide))
          : prev,
      );
    } else {
      setImageVariantUrls([url]);
      setSelectedVariantIndex(0);
      setCampaignSlides((prev: CampaignSlide[]) => {
        if (prev.length === 0) return prev;
        return prev.map((slide, i) => (i === idx ? { ...slide, imageUrl: url } : slide));
      });
    }
  }

  function onQuickFixLogoSelected(file: File | null) {
    setQuickFixLogoFile(file);
  }

  function resolveRefineSourceUrl(): string | null {
    const slideIndex = selectedVariantIndex;
    const slideSource = campaignSlides[slideIndex]?.imageUrl;
    const variantSource = imageVariantUrls[slideIndex];
    const raw =
      normalizeGeneratedImageUrl(slideSource) ??
      normalizeGeneratedImageUrl(variantSource) ??
      normalizeGeneratedImageUrl(imageUrl);
    if (!raw) return null;
    if (raw.startsWith("http")) return normalizeImageSourceUrl(raw);
    if (typeof window === "undefined") return raw;
    return normalizeImageSourceUrl(`${window.location.origin}${raw}`);
  }

  async function refineGeneratedImageWithLogo(userNote?: string) {
    if (!quickFixLogoFile) {
      setError(m.errors.needQuickFixLogo);
      return;
    }
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }

    const slideIndex = selectedVariantIndex;
    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.set("mode", "refine-logo");
      fd.set("source_image_url", sourceUrl);
      fd.set("logo_image", quickFixLogoFile);
      fd.set("logo_placement", quickFixLogoPlacement);
      fd.set("user_note", userNote?.trim() ?? "");
      fd.set("endpoint", EDIT_ENDPOINT);
      fd.set("aspect_ratio", "auto");
      fd.set("num_images", "1");
      const data = await postGenerateImage(fd);
      const urls = (data.imageUrls ?? [data.imageUrl])
        .map((u) => (typeof u === "string" ? normalizeGeneratedImageUrl(u) : null))
        .filter((u): u is string => Boolean(u));
      if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(urls[0], data.endpoint, slideIndex, refineSlideUrls());
      if (quickFixCredits > 0) setQuickFixCredits((v: number) => Math.max(0, v - 1));
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  async function refineGeneratedImage(userNote: string) {
    const note = userNote.trim();
    if (!note) return;
    const slideIndex = selectedVariantIndex;
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }

    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const data = await postGenerateImageJson({
        mode: "refine",
        prompt: buildImageRefinePrompt(note),
        endpoint: EDIT_ENDPOINT,
        aspect_ratio: "auto",
        num_images: 1,
        image_urls: [sourceUrl],
      });
      const urls = (data.imageUrls ?? [data.imageUrl])
        .map((u) => (typeof u === "string" ? normalizeGeneratedImageUrl(u) : null))
        .filter((u): u is string => Boolean(u));
      if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(urls[0], data.endpoint, slideIndex, refineSlideUrls());
      if (quickFixCredits > 0) setQuickFixCredits((v: number) => Math.max(0, v - 1));
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  async function applyImageCanvasOverlay(layers: import("@/lib/image-canvas-layers").ImageCanvasLayer[]) {
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }
    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const res = await fetch("/api/burn-image-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image_url: sourceUrl, layers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.refineFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      if (!normalizeGeneratedImageUrl(data.imageUrl)) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(
        data.imageUrl,
        undefined,
        selectedVariantIndex,
        refineSlideUrls(),
      );
      setImagePreOverlayUrl(null);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  function exportableSlideUrl(raw: string | undefined | null): string {
    const url = raw?.trim() ?? "";
    if (!url) return "";
    if (url.startsWith("http")) return normalizeImageSourceUrl(url);
    if (url.startsWith("/api/pipeline-files/") || isLibraryAssetUrl(url) || url.startsWith("/api/library/download/")) {
      if (typeof window === "undefined") return url;
      return normalizeImageSourceUrl(`${window.location.origin}${url}`);
    }
    return "";
  }

  function listExportableSlides(): Array<{ index: number; label: string; url: string }> {
    if (campaignSlides.length > 0) {
      return campaignSlides
        .map((slide: CampaignSlide, index: number) => ({
          index,
          label: campaignSlideLabel(slide.role, slide.title),
          url: exportableSlideUrl(slide.imageUrl),
        }))
        .filter((s) => Boolean(s.url));
    }
    if (imageVariantUrls.length > 1) {
      return imageVariantUrls
        .map((url, index) => ({
          index,
          label:
            index === 0
              ? headline.trim() || product.trim() || `Slide ${index + 1}`
              : `${headline.trim() || product.trim() || "Slide"} ${index + 1}`,
          url: exportableSlideUrl(url),
        }))
        .filter((s) => Boolean(s.url));
    }
    const single = resolveRefineSourceUrl();
    if (!single) return [];
    return [
      {
        index: 0,
        label: headline.trim() || product.trim() || "image",
        url: single,
      },
    ];
  }

  function applyAdPackHookVariant(index: number) {
    if (!adPackPlan?.hookVariants?.[index]) return;
    const variant = adPackPlan.hookVariants[index];
    const durationSec = resolveWizardVideoDurationSec();
    const captionLines = layoutHookSplitCaptions(
      variant.hookScript,
      variant.voiceoverScript,
      durationSec,
    );
    setSelectedAdPackHookIndex(index);
    setAdPackPlan({
      ...adPackPlan,
      hookScript: variant.hookScript,
      voiceoverScript: variant.voiceoverScript,
      captionLines,
      hookVariants: adPackPlan.hookVariants.map((item, i) =>
        i === index ? { ...item, captionLines } : item,
      ),
    });
    setCaptionLines(captionLines);
    setVoicePreviewTracks([]);
    setSelectedVoicePreviewId(null);
  }

  async function inpaintFromRegions(regions: ImageEditRegion[]) {
    const ready = regions.filter((r) => r.instruction.trim());
    if (!ready.length) {
      setError(m.wizard.quickFixRegionNeedZone);
      return;
    }
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }
    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const { width, height } = await analyzeImageUrl(sourceUrl);
      const maskBlob = await regionsToInpaintMaskBlob(ready, width, height);
      const prompt = regionsInpaintPrompt(ready);
      const fd = new FormData();
      fd.set("source_image_url", sourceUrl);
      fd.set("prompt", prompt);
      fd.set("inpaint_mode", isEraseIntent(prompt) ? "erase" : "fill");
      fd.set("mask_image", new File([maskBlob], "mask.png", { type: "image/png" }));
      if (!isEraseIntent(prompt)) fd.set("brand_kit", JSON.stringify(brandKit));
      const res = await fetch("/api/inpaint-image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.refineFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      await applyRefinedImage(data.imageUrl as string);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  async function inpaintGeneratedImage(maskBlob: Blob, prompt: string) {
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }
    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.set("source_image_url", sourceUrl);
      fd.set("prompt", prompt);
      fd.set("inpaint_mode", isEraseIntent(prompt) ? "erase" : "fill");
      fd.set("mask_image", new File([maskBlob], "mask.png", { type: "image/png" }));
      if (!isEraseIntent(prompt)) fd.set("brand_kit", JSON.stringify(brandKit));
      const res = await fetch("/api/inpaint-image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.refineFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      await applyRefinedImage(data.imageUrl as string);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  function quickFixImage(requirement: string) {
    if (imageBusy) return;
    void refineGeneratedImage(requirement);
  }

  async function refineGeneratedImageWithRegions(regions: ImageEditRegion[]) {
    const slideIndex = selectedVariantIndex;
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }

    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      let hintFile: File | undefined;
      try {
        const blob = await buildRegionHintImageBlob(
          `${imageUrl}${imageUrl?.includes("?") ? "&" : "?"}v=${imageGenKey}`,
          regions,
        );
        hintFile = new File([blob], "region-hint.png", { type: "image/png" });
      } catch {
        hintFile = undefined;
      }

      const fd = new FormData();
      fd.set("mode", "refine-regions");
      fd.set("source_image_url", sourceUrl);
      fd.set("regions", JSON.stringify(regions));
      if (hintFile) fd.set("region_hint_image", hintFile);
      fd.set("endpoint", EDIT_ENDPOINT);
      fd.set("aspect_ratio", "auto");
      fd.set("num_images", "1");

      const data = await postGenerateImage(fd);
      const urls = (data.imageUrls ?? [data.imageUrl])
        .map((u) => (typeof u === "string" ? normalizeGeneratedImageUrl(u) : null))
        .filter((u): u is string => Boolean(u));
      if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(urls[0], data.endpoint, slideIndex, refineSlideUrls());
      if (quickFixCredits > 0) setQuickFixCredits((v: number) => Math.max(0, v - 1));
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  async function stripImageTextForOverlay() {
    const current = imageUrl;
    if (!normalizeGeneratedImageUrl(current)) {
      setError(m.errors.needRefineImage);
      return;
    }
    if (!imagePreOverlayUrl) setImagePreOverlayUrl(current);
    await refineGeneratedImage(
      "Remove all on-image text, logos, captions, and marketing typography. Repaint those areas cleanly to match the surrounding illustration.",
    );
  }

  async function applyImageTextOverlay(layers: ImageTextLayer[]) {
    const sourceUrl = resolveRefineSourceUrl();
    if (!sourceUrl) {
      setError(m.errors.needRefineImage);
      return;
    }

    setError(null);
    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      const data = await postBurnImageText({ image_url: sourceUrl, layers });
      if (!normalizeGeneratedImageUrl(data.imageUrl)) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(
        data.imageUrl,
        undefined,
        selectedVariantIndex,
        refineSlideUrls(),
      );
      setImagePreOverlayUrl(null);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.refineFailed));
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  function restoreImageBeforeTextOverlay() {
    const prev = normalizeGeneratedImageUrl(imagePreOverlayUrl);
    if (!prev) return;
    applyRefinedImage(
      prev,
      lastImageEndpoint ?? undefined,
      selectedVariantIndex,
      refineSlideUrls(),
    );
    setImagePreOverlayUrl(null);
  }

  function imageTextOverlaySeedLayers(): import("@/lib/image-canvas-layers").ImageCanvasLayer[] {
    return seedBrandCanvasLayers({ headline, subline, brandKit, brandProfile });
  }

  function quickFixVideo(requirement: string, opts?: Partial<VideoSettings>) {
    if (quickFixCredits <= 0) return;
    const merged = [promptExtra.trim(), requirement].filter(Boolean).join(" | ");
    setPromptExtra(merged);
    if (opts) setVideoSettings((prev: VideoSettings) => ({ ...prev, ...opts }));
    setQuickFixCredits((v: number) => Math.max(0, v - 1));
    setError(null);
    setStepKey("video");
  }

  function buildComposeFormData(mode: "image" | "video"): FormData {
    const fd = new FormData();
    fd.set("template_id", templateId);
    fd.set("mode", mode);
    fd.set("headline", headline.trim());
    fd.set("subline", subline.trim());
    fd.set("brand", business.trim());
    fd.set("signoff", offer.trim());
    if (productPhoto) fd.set("product_image", productPhoto);
    if (mode === "video") fd.set("bgm_track", bgmTrack);
    return fd;
  }

  function canGenerateImage(): boolean {
    if (usesCompositor) return Boolean(productPhoto && headline.trim());
    if (isStoryboardOutput) {
      if (isConceptStoryboardOutput) {
        return Boolean(
          effectivePromoteName && (storyboardPlan || storyboardBrief.trim() || headline.trim()),
        );
      }
      return Boolean(productPhoto && product.trim());
    }
    if (isUgcPresenterOutput) {
      return Boolean(productPhoto && product.trim());
    }
    if (isCinematicStitchOutput || isConceptCinematicSingleOutput) {
      return Boolean(
        headline.trim() || creativeVideoBrief.trim() || product.trim() || conceptIdea.trim(),
      );
    }
    if (promotionMode === "concept" && conceptStyleAllowsTextOnlyImage(visualStyleId)) {
      if (visualStyleId === "service-promo" || visualStyleId === "website-launch") {
        if (!business.trim()) return false;
      }
      if (conceptStyleRequiresHeadline(visualStyleId) && !headline.trim()) return false;
      if (imageCreativeMode === "reference-concept") {
        if (!imageRefPhoto) return false;
        if (productPhoto) return true;
        // Concept + reference only → style-only (copy from step 1, palette from reference)
        return true;
      }
      if (productPhoto || imageRefPhoto) return true;
      if (effectiveImageMode === "describe") return imagePrompt.trim().length > 0;
      return true;
    }
    if (visualStyleId === "info-poster") {
      return Boolean(productPhoto && headline.trim());
    }
    if (isBrandVisualStyle(visualStyleId)) {
      return Boolean(productPhoto && headline.trim());
    }
    if (imageCreativeMode === "reference-concept") {
      return Boolean(productPhoto && imageRefPhoto);
    }
    if (effectiveImageMode === "reference") {
      return Boolean(imageRefPhoto);
    }
    if (effectiveImageMode === "describe") return imagePrompt.trim().length > 0;
    return Boolean(productPhoto);
  }

  async function composeImage(): Promise<string> {
    const res = await fetch("/api/compose", {
      method: "POST",
      body: buildComposeFormData("image"),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.polishFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    return data.imageUrl as string;
  }

  async function composeVideo(): Promise<string> {
    const res = await fetch("/api/compose", {
      method: "POST",
      body: buildComposeFormData("video"),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    if (data.bgmAdded) setBgmNote(m.wizard.bgmNote);
    else if (!data.bgmAdded) setBgmNote(m.wizard.bgmFallbackNote);
    return data.videoUrl as string;
  }

  async function generateImage(): Promise<string | null> {
    setError(null);
    setUseOriginalImage(false);

    if (usesCompositor) {
      if (!headline.trim()) {
        setError(m.errors.needHeadline);
        return null;
      }
      if (!productPhoto) {
        setError(m.errors.needPhoto);
        return null;
      }
      setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
      setImageBusy(true);
      try {
        const url = await composeImage();
        setImageUrl(url);
        imageUrlRef.current = url;
        void refreshImagePostflight(url);
        return url;
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.polishFailed));
        return null;
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
    }

    if (visualStyleId === "info-poster" && !headline.trim()) {
      setError(m.errors.needHeadline);
      return null;
    }
    if (isBrandVisualStyle(visualStyleId)) {
      if (!headline.trim()) {
        setError(m.errors.needHeadline);
        return null;
      }
    }

    if (isStoryboardOutput) {
      if (isConceptStoryboardOutput) {
        if (!effectivePromoteName) {
          setError(m.errors.needHeadline);
          return null;
        }
      } else {
        if (!product.trim()) {
          setError(m.errors.needProductName);
          return null;
        }
        if (!productPhoto) {
          setError(m.errors.needPhoto);
          return null;
        }
      }
      setImageJobMeta({
        kind: "storyboard",
        startedAt: Date.now(),
        sceneCount: estimateStoryboardSceneCount(),
      });
      setImageBusy(true);
      try {
        const fd = new FormData();
        fd.set("visual_style", visualStyleId);
        fd.set("art_style", artStyleId);
        fd.set("promotion_mode", promotionMode);
        if (brandProfile) fd.set("brand_profile", JSON.stringify(brandProfile));
        fd.set("brand_kit", JSON.stringify(brandKit));
        fd.set(
          "product_name",
          isConceptStoryboardOutput ? effectivePromoteName : product.trim(),
        );
        if (conceptIdea.trim()) fd.set("concept_idea", conceptIdea.trim());
        fd.set("business", business.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("storyboard_brief", storyboardBrief.trim());
        fd.set("duration", storyboardTrimDuration);
        fd.set("scene_count", storyboardSceneCount);
        fd.set("prompt_market", promptMarket);
        fd.set("subject_framing", subjectFraming);
        fd.set("prompt_extra", effectivePromptExtra());
        fd.set("aspect_ratio", effectiveImageAspectRatio);
        fd.set(
          "endpoint",
          isConceptStoryboardOutput && !productPhoto && !imageRefPhoto
            ? TEXT_ENDPOINT
            : referenceStrategy.sendPixelsToFal || (referenceStrategy.kind === "style-only" && imageRefPhoto)
              ? EDIT_ENDPOINT
              : TEXT_ENDPOINT,
        );
        // Prefer the user-reviewed plan (DeepSeek outline they can edit before generate).
        if (storyboardPlan) {
          fd.set("storyboard_plan", JSON.stringify(storyboardPlan));
        }
        if (researchReelAnalysis) {
          fd.set("research_reel_analysis", JSON.stringify(researchReelAnalysis));
        }
        attachReferenceToForm(fd);
        const data = await postStoryboardImages(fd);
        applyGeneratedStoryboard(
          data.scenes,
          data.plan,
          data.seedancePrompt,
          data.endpoint,
        );
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.storyboardFailed));
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
      return null;
    }

    const cinematicSceneTarget = isConceptCinematicStyle(visualStyleId) ? cinematicSceneCount : 0;
    if (cinematicSceneTarget > 0) {
      if (
        !headline.trim() &&
        !creativeVideoBrief.trim() &&
        !product.trim() &&
        !conceptIdea.trim()
      ) {
        setError(m.errors.creativeBriefRequired);
        return null;
      }
      setImageJobMeta({
        kind: "cinematic-reel",
        startedAt: Date.now(),
        sceneCount: cinematicSceneTarget,
      });
      setImageBusy(true);
      try {
        const creativeBrief =
          creativeVideoBrief.trim() ||
          [headline.trim(), subline.trim(), offer.trim(), conceptIdea.trim()]
            .filter(Boolean)
            .join(" | ");
        const planRes = await fetch("/api/plan-cinematic-reel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: product.trim(),
            headline: headline.trim(),
            subline: subline.trim(),
            business: business.trim(),
            offer: offer.trim(),
            creativeBrief,
            promptExtra: effectivePromptExtra(),
            promptMarket,
            referenceImageNote: conceptImageVisionNote.trim() || undefined,
            artStyleId,
            sceneCount: cinematicSceneTarget,
          }),
        });
        const planData = await planRes.json();
        if (!planRes.ok) throw new Error(planData.error ?? m.errors.storyboardFailed);
        const plan = planData.plan;
        setCinematicReelPlan(plan);

        const genRes = await fetch("/api/generate-cinematic-scenes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            aspect_ratio: effectiveImageAspectRatio,
            art_style: artStyleId,
          }),
        });
        const genData = await genRes.json();
        if (!genRes.ok) throw new Error(genData.error ?? m.errors.storyboardFailed);
        const scenes = genData.scenes as CinematicSceneResult[];
        setCinematicScenes(scenes);
        setImageUrl(scenes[0]?.imageUrl ?? null);
        setImageVariantUrls(scenes.map((s) => s.imageUrl));
        setSelectedVariantIndex(0);
        setLastImageEndpoint((genData.endpoint as string | undefined) ?? null);
        setVideoPrompt(
          scenes.map((s) => s.videoMotionPrompt).filter(Boolean).join(" · "),
        );
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.storyboardFailed));
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
      return null;
    }

    if (isCampaignOutput) {
      if (!productPhoto && promotionMode !== "concept") {
        setError(m.errors.needPhoto);
        return null;
      }
      setImageJobMeta({
        kind: "campaign",
        startedAt: Date.now(),
        sceneCount: referenceCarouselSlideCount,
      });
      setImageBusy(true);
      try {
        const fd = new FormData();
        fd.set("visual_style", visualStyleId);
        fd.set("art_style", artStyleId);
        if (brandProfile) fd.set("brand_profile", JSON.stringify(brandProfile));
        fd.set("brand_kit", JSON.stringify(brandKit));
        fd.set("product_name", product.trim());
        fd.set("business", business.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("campaign_theme", campaignTheme.trim());
        fd.set("prompt_market", promptMarket);
        fd.set("subject_framing", subjectFraming);
        fd.set("prompt_extra", effectivePromptExtra());
        fd.set("promotion_mode", promotionMode);
        fd.set("aspect_ratio", effectiveImageAspectRatio);
        if (productPhoto) {
          fd.set("reference_image", productPhoto);
        }
        attachReferenceToForm(fd);
        fd.set(
          "endpoint",
          referenceStrategy.sendPixelsToFal ? EDIT_ENDPOINT : TEXT_ENDPOINT,
        );
        const res = await fetch("/api/generate-campaign", { method: "POST", body: fd });
        const data = await readGenerateJson(res);
        if (!res.ok) throw new Error((data.error as string) ?? m.errors.campaignFailed);
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        applyGeneratedCampaign(
          data.slides as Array<{
            role: string;
            title: string;
            headline: string;
            subline: string;
            imageUrl: string;
          }>,
          data.plan as CampaignPlan,
          data.endpoint as string | undefined,
        );
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.campaignFailed));
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
      return null;
    }

    if (isTeachingCarouselOutput) {
      setImageJobMeta({
        kind: "teaching-carousel",
        startedAt: Date.now(),
        sceneCount: referenceCarouselSlideCount,
      });
      setImageBusy(true);
      try {
        const fd = new FormData();
        fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
        fd.set("brand_kit", JSON.stringify(brandKit));
        fd.set("product_name", product.trim());
        fd.set("business", business.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("prompt_market", promptMarket);
        fd.set("subject_framing", subjectFraming);
        fd.set("prompt_extra", effectivePromptExtra());
        fd.set("promotion_mode", promotionMode);
        fd.set("aspect_ratio", effectiveImageAspectRatio);
        fd.set("slide_count", String(referenceCarouselSlideCount));
        for (const f of extraKitPhotos.slice(0, 5)) {
          fd.append("carousel_reference_images", f);
        }
        if (productPhoto) {
          fd.set("reference_image", productPhoto);
        }
        attachReferenceToForm(fd);
        fd.set(
          "endpoint",
          referenceStrategy.sendPixelsToFal ? EDIT_ENDPOINT : TEXT_ENDPOINT,
        );
        const res = await fetch("/api/generate-teaching-carousel", { method: "POST", body: fd });
        const data = await readGenerateJson(res);
        if (!res.ok) throw new Error((data.error as string) ?? m.errors.campaignFailed);
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        applyGeneratedCampaign(
          data.slides as Array<{
            role: string;
            title: string;
            headline: string;
            subline: string;
            imageUrl: string;
          }>,
          data.plan as CampaignPlan,
          data.endpoint as string | undefined,
        );
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.campaignFailed));
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
      return null;
    }

    if (effectiveImageMode === "describe") {
      if (!imagePrompt.trim()) {
        setError(m.errors.needKeyframe);
        return null;
      }
      setImageBusy(true);
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: imagePrompt.trim(),
            endpoint: TEXT_ENDPOINT,
            aspect_ratio: effectiveImageAspectRatio,
            num_images: effectiveImageOutputMode === "ab" ? 2 : 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? m.errors.polishFailed);
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        const urls = (data.imageUrls as string[] | undefined) ?? [data.imageUrl as string];
        return applyGeneratedImages(urls, data.endpoint as string | undefined);
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.polishFailed));
        return null;
      } finally {
        setImageBusy(false);
      }
    }

    const useConceptTextOnly =
      promotionMode === "concept" &&
      !productPhoto &&
      !imageRefPhoto &&
      conceptStyleAllowsTextOnlyImage(visualStyleId) &&
      imageCreativeMode !== "reference-concept" &&
      effectiveImageMode !== "reference";

    if (useConceptTextOnly) {
      const builtPrompt = buildWizardImagePrompt(
        getPromptVars(),
        resolveImagePromptMode(visualStyleId, imageCreativeMode, {
          promotionMode,
          workflowMode,
        }),
        brandProfile,
        visualStyleId,
        brandKit,
      );
      const prompt = imagePrompt.trim() || builtPrompt;
      if (!prompt.trim()) {
        setError(m.errors.needHeadline);
        return null;
      }
      setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
      setImageBusy(true);
      try {
        const fd = new FormData();
        fd.set("visual_style", visualStyleId);
        fd.set("art_style", artStyleId);
        if (brandProfile) {
          fd.set("brand_profile", JSON.stringify(brandProfile));
        }
        fd.set("brand_kit", JSON.stringify(brandKit));
        fd.set("business", business.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("prompt_market", promptMarket);
        fd.set("subject_framing", subjectFraming);
        fd.set("prompt_extra", effectivePromptExtra());
        fd.set("workflow_mode", workflowMode);
        fd.set("promotion_mode", promotionMode);
        fd.set("image_text_mode", imageTextMode);
        fd.set("aspect_ratio", effectiveImageAspectRatio);
        fd.set("prompt", prompt);
        fd.set("endpoint", referenceStrategy.sendPixelsToFal ? EDIT_ENDPOINT : TEXT_ENDPOINT);
        fd.set("num_images", effectiveImageOutputMode === "ab" ? "2" : "1");
        // No product/style pixels — logo is not auto-added; user adds it later.

        const res = await fetch("/api/generate-image", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? m.errors.polishFailed);
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        const urls = (data.imageUrls as string[] | undefined) ?? [data.imageUrl as string];
        return applyGeneratedImages(urls, data.endpoint as string | undefined);
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.polishFailed));
        return null;
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
    }

    if (imageCreativeMode === "reference-concept") {
      if (!imageRefPhoto) {
        setError(m.errors.needStyleReference);
        return null;
      }
      const styleOnlyRef =
        referenceStrategy.kind === "style-only" ||
        isContentResearchStyleExtra(promptExtra);
      if (!productPhoto && promotionMode !== "concept" && !styleOnlyRef) {
        setError(m.errors.needPhoto);
        return null;
      }
    } else if (effectiveImageMode === "reference") {
      if (!imageRefPhoto) {
        setError(m.errors.needReferenceImage);
        return null;
      }
    } else if (needsProductUpload && !productPhoto) {
      setError(m.errors.needPhoto);
      return null;
    }

    setImageJobMeta({ kind: "image", startedAt: Date.now(), sceneCount: 1 });
    setImageBusy(true);
    try {
      if (imageRefPhoto && productPhoto && imageCreativeMode !== "reference-concept") {
        setVideoNote(m.wizard.imageRefAutoModeNote);
      }
      const fd = new FormData();
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
      if (brandProfile) {
        fd.set("brand_profile", JSON.stringify(brandProfile));
      }
      fd.set("brand_kit", JSON.stringify(brandKit));
      fd.set("business", business.trim());
      fd.set("headline", headline.trim());
      fd.set("subline", subline.trim());
      fd.set("offer", offer.trim());
      fd.set("prompt_market", promptMarket);
      fd.set("subject_framing", subjectFraming);
      fd.set("prompt_extra", effectivePromptExtra());
      fd.set("workflow_mode", workflowMode);
      fd.set("promotion_mode", promotionMode);
      fd.set("image_text_mode", imageTextMode);
      fd.set("aspect_ratio", effectiveImageAspectRatio);
      fd.set("endpoint", referenceStrategy.sendPixelsToFal ? EDIT_ENDPOINT : TEXT_ENDPOINT);
      fd.set("num_images", effectiveImageOutputMode === "ab" ? "2" : "1");
      attachReferenceToForm(fd);

      const res = await fetch("/api/generate-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.polishFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      const urls = (data.imageUrls as string[] | undefined) ?? [data.imageUrl as string];
      if (!urls.some((u) => normalizeGeneratedImageUrl(u))) {
        throw new Error(m.errors.imageGenNoUrl);
      }
      return applyGeneratedImages(urls, data.endpoint as string | undefined);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.polishFailed));
      return null;
    } finally {
      setImageBusy(false);
      setImageJobMeta(null);
    }
  }

  async function runShipItPipeline() {
    if (!shipItEligible) {
      setError(m.wizard.shipItUnsupported);
      return;
    }
    setShipItPipelineBusy(true);
    setError(null);
    try {
      applyShipItDefaults();
      let keyframe = imageUrlRef.current;
      if (!keyframe) {
        keyframe = await generateImage();
      }
      if (!keyframe) return;
      const review = await refreshImageVisionReview(keyframe);
      if (visionGateBlocksShipIt(review)) {
        setError(m.wizard.imageVisionShipItBlocked);
        return;
      }
      if (stepKey === "image") setStepKey("video");
      await generateVideo({ imageUrlOverride: keyframe });
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.videoFailed));
    } finally {
      setShipItPipelineBusy(false);
    }
  }

  function useOriginalAsKeyframe() {
    if (!productPhoto) return;
    setUseOriginalImage(true);
    setImageUrl(null);
    setError(null);
  }

  function finishImageStep() {
    if (
      workflowMode === "combined" &&
      !usesCompositor &&
      !isStoryboardOutput &&
      !isCinematicStitchOutput &&
      !imageUrl &&
      !(promotionMode === "concept" && useOriginalImage && productPhoto)
    ) {
      setError(m.errors.needGeneratedImage);
      return;
    }
    if (isStoryboardOutput && storyboardScenes.length === 0) {
      setError(m.errors.storyboardVideoPromptRequired);
      return;
    }
    if ((isCinematicStitchOutput || cinematicStitchReady) && cinematicScenes.length < cinematicSceneCount) {
      setError(formatCinematicCopy(m.errors.cinematicStitchNeedScenes));
      return;
    }
    if (isConceptCinematicSingleOutput && cinematicScenes.length < 1 && !imageUrl) {
      setError(m.errors.needGeneratedImage);
      return;
    }
    if (!hasFinalImage) {
      setError(
        !usesCompositor && productPhoto && !imageUrl && !useOriginalImage
          ? m.errors.needAiImage
          : workflowMode === "image-only" && effectiveImageMode === "describe"
            ? m.errors.needKeyframe
            : m.errors.needPhoto,
      );
      return;
    }
    setError(null);
    if (
      workflowMode === "video-only" &&
      !usesCompositor &&
      !imageUrl &&
      productPhoto
    ) {
      setUseOriginalImage(true);
    }
    // Storyboard / cinematic scene stills always continue to video, even if mode drifted to image-only.
    if (
      workflowMode === "image-only" &&
      !isStoryboardOutput &&
      !isCinematicStitchOutput &&
      !isConceptCinematicSingleOutput
    ) {
      setStepKey("done");
    } else {
      if (workflowMode === "image-only") setWorkflowMode("combined");
      setStepKey("video");
    }
  }

  function onReferenceAdFile(file: File | null) {
    setReferenceAd(file);
    if (file) {
      setSelectedReferenceClipId(null);
      setError(null);
      if (file.type.startsWith("video/")) {
        if (workflowMode === "combined") {
          selectVisualStyle("storyboard-video");
          setImageAspectRatio("9:16");
          setVideoCreativeMode("reference-concept");
          setImageCreativeMode("reference-concept");
          if (promotionMode === "concept") {
            setImageInputMode("reference");
          }
        }
        const url = URL.createObjectURL(file);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const dur = v.duration;
          if (Number.isFinite(dur)) {
            setRefVideoDurationSec(dur);
            if (dur > 15.5) {
              setVideoNote(
                m.wizard.referenceVideoTooLong.replace("{seconds}", String(Math.round(dur))),
              );
            }
          }
        };
        v.src = url;
      }
    }
  }

  async function ensureReferenceVideoFalUrl(refVideo: File): Promise<string> {
    if (referenceVideoFalUrl?.startsWith("http")) return referenceVideoFalUrl;
    const fd = new FormData();
    fd.append("video", refVideo);
    const res = await fetch("/api/prepare-reference-video", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        (data.error as string | undefined) ?? m.errors.videoFailed,
      );
    }
    const url = String(data.videoUrl ?? "");
    if (!url.startsWith("http")) throw new Error(m.errors.videoFailed);
    setReferenceVideoFalUrl(url);
    if (typeof data.durationSec === "number") setRefVideoDurationSec(data.durationSec);
    return url;
  }

  async function makeReferenceVideo(refVideo: File): Promise<string> {
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const outputDuration =
      videoSettings.duration === "auto" || Number(videoSettings.duration) > 15
        ? "8"
        : String(videoSettings.duration);
    const refFalUrl = await ensureReferenceVideoFalUrl(refVideo);
    const fd = new FormData();
    fd.set("mode", "reference");
    fd.set(
      "prompt",
      seedancePromptForGenerate(
        buildResearchR2vPrompt({
          researchAnalysis: researchReelAnalysis,
          videoPrompt,
          fallbackPrompt:
            buildReferenceVideoPrompt(getPromptVars(), templateId) +
            " Follow @Video1 shot structure and timing as closely as the model allows. Do not apply a generic slow push-in unless @Video1 uses it.",
        }),
      ),
    );
    fd.set("reference_video_urls", refFalUrl);
    const refSec = refVideoDurationSec;
    if (refSec && Number.isFinite(refSec)) {
      fd.set("ref_duration_sec", String(refSec));
    }
    if (workflowMode === "combined" && imageUrl) {
      fd.set("image_ref_url", imageUrl);
    } else if (productPhoto) {
      fd.append("images", productPhoto);
    } else if (imageUrl) {
      fd.set("image_ref_url", imageUrl);
    }
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", outputDuration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("reference_negative_prompt", buildReferenceVideoNegative(tpl));
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const usedKling =
      data.generationMode === "kling-storyboard-fallback" ||
      Boolean(data.seedanceBlockedCode);
    const pathNote = data.generationMode
      ? `${m.wizard.videoGenPathLabel}: ${data.generationMode}${data.endpoint ? ` · ${data.endpoint}` : ""}${typeof data.referenceVideoCount === "number" ? ` · ${data.referenceVideoCount} ref video` : ""}`
      : "";
    const notes = [
      usedKling ? m.wizard.klingStoryboardFallbackNote : m.wizard.referenceModeNote,
      pathNote,
      workflowMode !== "combined" && !productPhoto && imageUrl
        ? m.wizard.videoRefUseProductPhoto
        : "",
      data.note as string | undefined,
    ].filter(Boolean);
    setVideoNote(notes.join(" · "));
    return data.videoUrl as string;
  }

  async function fileFromImageUrl(url: string): Promise<File | null> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new File([blob], "keyframe.png", { type: blob.type || "image/png" });
    } catch {
      return null;
    }
  }

  /** Same-origin relative paths so the server can materialize library/pipeline assets. */
  function toGenerateReferenceUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("blob:")) return trimmed;
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const parsed = new URL(trimmed);
        if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
          return `${parsed.pathname}${parsed.search}`;
        }
      }
    } catch {
      /* keep as-is */
    }
    return trimmed;
  }

  async function appendStoryboardImageRefs(
    fd: FormData,
    scenes: Array<{ imageUrl: string }>,
  ): Promise<number> {
    const urls: string[] = [];
    let fileCount = 0;
    for (const scene of scenes) {
      const raw = scene.imageUrl?.trim();
      if (!raw) continue;
      if (raw.startsWith("blob:")) {
        const file = await fileFromImageUrl(raw);
        if (file) {
          fd.append("images", file);
          fileCount += 1;
        }
        continue;
      }
      const ref = toGenerateReferenceUrl(raw);
      if (ref) urls.push(ref);
    }
    if (urls.length) fd.set("reference_image_urls", urls.join("\n"));
    return urls.length + fileCount;
  }

  async function readGenerateJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (
        res.status === 413 ||
        /request entity too large|payload too large|entity too large/i.test(text)
      ) {
        return {
          error: m.errors.requestTooLarge,
          code: "REQUEST_TOO_LARGE",
        };
      }
      if (
        res.status === 504 ||
        res.status === 524 ||
        /function.?invocation.?timeout|an error occurred|took too long|gateway timeout/i.test(
          text,
        )
      ) {
        return {
          error: m.errors.timeout,
          code: "TIMEOUT",
        };
      }
      return {
        error: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
          m.errors.videoFailed,
      };
    }
  }

  async function ensureEndFrameUrl(): Promise<string | null> {
    if (endFrameUrl) return endFrameUrl;
    if (endFramePhoto || !videoSettings.autoSecondFrame) return null;
    if (videoSettings.creativity === "subtle") return null;

    const ref = imageUrl
      ? await fileFromImageUrl(imageUrl)
      : (productPhoto ?? null);
    if (!ref) return null;

    setVideoPhase("second-frame");
    const pv = getPromptVars();
    const fd = new FormData();
    fd.set("reference_image", ref);
    fd.set("prompt", buildEndFrameImagePrompt(pv));
    fd.set("visual_style", visualStyleId);
    fd.set("product_name", product.trim());
    fd.set("business", business.trim());
    fd.set("headline", headline.trim());
    fd.set("subline", subline.trim());
    fd.set("offer", offer.trim());
    fd.set("prompt_market", promptMarket);
    fd.set("subject_framing", subjectFraming);
    fd.set("prompt_extra", effectivePromptExtra());
    fd.set("workflow_mode", workflowMode);
    fd.set("aspect_ratio", tpl.aspectRatio);
    fd.set("endpoint", EDIT_ENDPOINT);
    fd.set("num_images", "1");
    if (
      imageRefPhoto &&
      referenceStrategy.sendPixelsToFal &&
      productPhoto
    ) {
      fd.set("image_creative_mode", "reference-concept");
      fd.set("style_reference_image", imageRefPhoto);
    } else {
      fd.set("image_creative_mode", "promo-ai");
    }
    appendReferenceFormFields(fd);

    const res = await fetch("/api/generate-image", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.polishFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const url = data.imageUrl as string;
    setEndFrameUrl(url);
    return url;
  }

  async function makeStoryboardVideo(): Promise<string> {
    const prompt =
      videoPrompt.trim() || storyboardPlan?.seedancePrompt?.trim() || "";
    if (!prompt) throw new Error(m.errors.storyboardVideoPromptRequired);

    const orderedScenes = normalizeStoryboardIndices(storyboardScenes);
    if (orderedScenes.length < 1) throw new Error(m.errors.needKeyframe);

    // Kling-first: Seedance R2V often blocks people likenesses, then Kling still runs —
    // that double wait exceeds the gateway timeout ("請求逾時"). Skip Seedance for
    // multi-scene storyboard and animate+stitch with Kling directly.
    return makeKlingStoryboardVideo(orderedScenes, prompt);
  }

  async function makeKlingStoryboardVideo(
    scenes: StoryboardSceneResult[],
    _seedancePrompt: string,
  ): Promise<string> {
    setVideoPhase("video");
    const fd = new FormData();
    fd.set("theme", storyboardPlan?.theme?.trim() || headline.trim() || product.trim());
    fd.set("total_duration_sec", storyboardTrimDuration);
    fd.set(
      "scenes_meta",
      JSON.stringify(
        scenes.map((s) => ({
          startSec: s.startSec,
          endSec: s.endSec,
          sceneDescriptionZh: s.sceneDescriptionZh,
          imagePrompt: s.imagePrompt,
        })),
      ),
    );
    const refCount = await appendStoryboardImageRefs(fd, scenes);
    if (refCount < 1) throw new Error(m.errors.needKeyframe);

    const res = await fetch("/api/generate-kling-storyboard", { method: "POST", body: fd });
    const data = await readGenerateJson(res);
    if (!res.ok) {
      throw new Error(
        (typeof data.error === "string" ? data.error : null) ?? m.errors.klingStoryboardFailed,
      );
    }
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const clipDurations = Array.isArray(data.clipDurations)
      ? (data.clipDurations as number[])
      : undefined;
    const videoDurationSec = clipDurations?.length
      ? clipDurations.reduce((a, b) => a + Number(b), 0)
      : Number(storyboardTrimDuration) || undefined;
    if (videoDurationSec && videoDurationSec > 0) {
      lastStoryboardVideoDurationSecRef.current = videoDurationSec;
    }
    const storyboardCaps = captionLinesFromStoryboardScenes(scenes, { videoDurationSec });
    if (storyboardCaps.length) {
      setCaptionLines(storyboardCaps);
      setCaptionBurnEnabled(true);
    }
    setVideoNote(
      [
        m.wizard.klingStoryboardFallbackNote,
        `${m.wizard.storyboardTrimDurationLabel}: ${storyboardTrimDuration}s`,
        data.generationMode && data.endpoint
          ? `${m.wizard.videoGenPathLabel}: ${data.generationMode} · ${data.endpoint}`
          : "",
        typeof data.clipCount === "number"
          ? m.wizard.klingStoryboardClipCount.replace("{n}", String(data.clipCount))
          : "",
        storyboardCaps.length ? m.wizard.storyboardCaptionsAutoNote : "",
        data.note as string | undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function makeDigitalPresenterVideo(
    packOverride?: AdPackPlan | null,
  ): Promise<string> {
    if (presenterSourceMode === "custom-keyframe" && !imageUrl) {
      throw new Error(m.errors.needGeneratedImage);
    }
    const pack = packOverride ?? adPackPlan;
    const caps = pack?.captionLines ?? captionLines;
    const script =
      pack?.voiceoverScript?.trim() ||
      caps
        .map((l: CaptionLine) => l.text.trim())
        .filter(Boolean)
        .join("，");
    if (!script.trim()) {
      throw new Error(m.wizard.ugcPresenter.needScript);
    }

    const selectedPreview = voicePreviewTracks.find((t: VoicePreviewTrack) => t.id === selectedVoicePreviewId);
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const fd = new FormData();
    if (presenterSourceMode === "custom-keyframe" && imageUrl) {
      fd.set("image_url", imageUrl);
    }
    fd.set("product_name", product.trim());
    if (selectedPreview?.audioUrl) {
      fd.set("speech_url", selectedPreview.audioUrl);
      if (selectedPreview.presetId) fd.set("voice_preset", selectedPreview.presetId);
    } else {
      fd.set("script", script);
      fd.set("locale", voiceoverLocale);
    }
    fd.set("talking_style", "expressive");
    fd.set("resolution", vOpts.resolution);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("presenter_mode", presenterSourceMode);
    if (presenterSourceMode === "stock-avatar") {
      fd.set("stock_avatar_id", presenterAvatarId);
    }

    const res = await fetch("/api/generate-digital-presenter", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.ugcPresenterFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    setVideoNote(
      [
        m.wizard.ugcPresenter.videoPreflight,
        data.note as string | undefined,
        data.generationMode && data.endpoint
          ? `${m.wizard.videoGenPathLabel}: ${data.generationMode} · ${data.endpoint}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function makeCinematicClipFromImage(
    imageUrl: string,
    motionPrompt: string,
    sceneIndex = 1,
    totalScenes = 1,
  ): Promise<string> {
    const useBeatRotation =
      isConceptCinematicStyle(visualStyleId) && totalScenes > 1;
    const creativity =
      videoSettings.creativity === "subtle" && isConceptCinematicStyle(visualStyleId)
        ? CINEMATIC_REEL_VIDEO_CREATIVITY
        : videoSettings.creativity;
    const motionStyle = useBeatRotation
      ? cinematicMotionStyleForScene(sceneIndex, totalScenes)
      : videoSettings.motionStyle === "static-glow" && isConceptCinematicStyle(visualStyleId)
        ? "gentle-orbit"
        : videoSettings.motionStyle;
    const camera = cameraForMotion(motionStyle);
    const vOpts = resolveVideoGenerationOpts(templateId, {
      ...videoSettings,
      creativity,
      motionStyle,
    });
    const motionStrength = cinematicMotionStrength(motionStyle, creativity);
    const fullPrompt = buildCinematicClipMotionPrompt({
      sceneMotionPrompt: motionPrompt,
      creativity,
      camera: vOpts.camera,
      motionStyle,
      sceneIndex,
      totalScenes,
      referenceMotionNote: extractReferenceMotionNote(effectivePromptExtra()),
    });
    const fd = new FormData();
    fd.set("mode", "image");
    fd.set("prompt", fullPrompt);
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", "8");
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("motion_strength", String(motionStrength));
    fd.set("camera", vOpts.camera);
    fd.set("negative_prompt", negativePrompt);
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");
    fd.set("image_start_url", imageUrl);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    return data.videoUrl as string;
  }

  async function makeCinematicStitchVideo(): Promise<string> {
    if (cinematicScenes.length < cinematicSceneCount) {
      throw new Error(m.errors.storyboardVideoPromptRequired);
    }
    const clipUrls: string[] = [];
    for (const scene of cinematicScenes) {
      clipUrls.push(
        await makeCinematicClipFromImage(
          scene.imageUrl,
          scene.videoMotionPrompt,
          scene.sceneIndex,
          cinematicScenes.length,
        ),
      );
    }
    const res = await fetch("/api/stitch-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_urls: clipUrls }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    setVideoNote(
      [
        formatCinematicCopy(m.wizard.cinematicStitchVideoPreflight),
        `${m.wizard.cinematicStitchClipCount}: ${clipUrls.length}`,
        m.wizard.cinematicStitchFfmpegNote,
        data.note as string | undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function makeProductAssistantVideo(): Promise<string> {
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const prompt =
      productVideoPlan?.seedancePrompt?.trim() ||
      videoPrompt.trim() ||
      "";
    if (!prompt) throw new Error(m.errors.needProductVideoPlan);

    const fd = new FormData();
    fd.set("mode", "reference");
    fd.set(
      "prompt",
      seedancePromptForGenerate(
        productVideoPlan?.seedancePrompt?.trim() ||
          videoPrompt.trim() ||
          "",
      ),
    );
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", vOpts.duration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("negative_prompt", negativePrompt);
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");

    if (productPhoto) fd.append("images", productPhoto);
    if (packagingPhoto) fd.append("images", packagingPhoto);
    for (const f of extraKitPhotos.slice(0, 2)) fd.append("images", f);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const pathNote = data.generationMode
      ? `${m.wizard.videoGenPathLabel}: ${data.generationMode}${data.endpoint ? ` · ${data.endpoint}` : ""}${typeof data.referenceImageCount === "number" ? ` · ${data.referenceImageCount} images` : ""}`
      : "";
    setVideoNote(
      [
        data.generationMode === "kling-storyboard-fallback" || data.seedanceBlockedCode
          ? m.wizard.klingStoryboardFallbackNote
          : m.wizard.productVideoAssistantPreflight,
        productVideoPlan?.motionSummaryZh,
        pathNote,
        data.note as string | undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function makeMultiAngleVideo(): Promise<string> {
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const pv = getPromptVars();
    const fd = new FormData();
    fd.set("mode", "reference");
    fd.set(
      "prompt",
      seedancePromptForGenerate(
        videoPrompt.trim() || buildMultiAngleVideoPrompt(pv, videoPromptOpts(), templateId),
      ),
    );
    if (referenceAd && referenceIsVideo) fd.append("videos", referenceAd);
    if (productPhoto) fd.append("images", productPhoto);
    for (const f of extraAnglePhotos) fd.append("images", f);
    if (imageUrl) fd.set("image_ref_url", imageUrl);
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", vOpts.duration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("motion_strength", String(vOpts.motionStrength));
    fd.set("camera", vOpts.camera);
    fd.set("negative_prompt", negativePrompt);
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const pathNote = data.generationMode
      ? `${m.wizard.videoGenPathLabel}: ${data.generationMode}`
      : "";
    setVideoNote(
      [
        data.generationMode === "kling-storyboard-fallback" || data.seedanceBlockedCode
          ? m.wizard.klingStoryboardFallbackNote
          : null,
        pathNote,
        m.wizard.videoRichMotionNote,
        data.note as string | undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function makeTextToVideo(): Promise<string> {
    if (!videoPrompt.trim()) {
      throw new Error(m.errors.creativeVideoPromptRequired);
    }
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const fd = new FormData();
    fd.set("mode", "text");
    fd.set("prompt", seedancePromptForGenerate(videoPrompt.trim()));
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", vOpts.duration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("motion_strength", String(vOpts.motionStrength));
    fd.set("camera", vOpts.camera);
    fd.set("negative_prompt", negativePrompt);
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const pathNote = data.generationMode
      ? `${m.wizard.videoGenPathLabel}: ${data.generationMode}${data.endpoint ? ` · ${data.endpoint}` : ""}`
      : "";
    if (pathNote) setVideoNote(pathNote);
    return data.videoUrl as string;
  }

  async function makeImageToVideo(imageStartUrlOverride?: string): Promise<string> {
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const pv = getPromptVars();
    const promptOpts = videoPromptOpts();
    let endUrl: string | null = endFrameUrl;
    const skipAutoEndFrame =
      promotionMode === "concept" && isAiPlannedVideoStyle(visualStyleId);
    if (!endUrl && !endFramePhoto && videoSettings.autoSecondFrame && !skipAutoEndFrame) {
      endUrl = await ensureEndFrameUrl();
    }
    const dualFrame = Boolean(endUrl || endFramePhoto);
    if (dualFrame) promptOpts.dualFrame = true;

    const plannedOnly =
      promotionMode === "concept" && isAiPlannedVideoStyle(visualStyleId);
    if (plannedOnly && !videoPrompt.trim()) {
      throw new Error(m.errors.creativeVideoPromptRequired);
    }
    const defaultPrompt = buildWizardVideoPrompt(templateId, pv, promptOpts);
    const rawPrompt = videoPrompt.trim() || (plannedOnly ? "" : defaultPrompt);
    const fd = new FormData();
    fd.set("mode", "image");
    fd.set("prompt", seedancePromptForGenerate(rawPrompt));
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", vOpts.duration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
    fd.set("generate_audio", "false");
    fd.set("motion_strength", String(vOpts.motionStrength));
    fd.set("camera", vOpts.camera);
    fd.set("negative_prompt", negativePrompt);
    fd.set("avoid_on_screen_text", vOpts.avoidOnScreenText ? "true" : "false");
    fd.set("fast", vOpts.fast ? "true" : "false");

    const startUrl = imageStartUrlOverride ?? imageUrl;
    if (startUrl) fd.set("image_start_url", startUrl);
    else if (productPhoto) fd.set("image_start", productPhoto);

    if (endFramePhoto) fd.set("image_end", endFramePhoto);
    else if (endUrl) fd.set("image_end_url", endUrl);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    const usedKling =
      data.generationMode === "kling-storyboard-fallback" ||
      Boolean(data.seedanceBlockedCode);
    const pathNote = data.generationMode
      ? `${m.wizard.videoGenPathLabel}: ${data.generationMode}${data.endpoint ? ` · ${data.endpoint}` : ""}`
      : "";
    const notes = [
      usedKling ? m.wizard.klingStoryboardFallbackNote : null,
      pathNote,
      dualFrame ? m.wizard.videoRichMotionNote : undefined,
      data.note as string | undefined,
      referenceAd && referenceIsVideo ? m.wizard.videoRefIgnoredOnImageMode : "",
    ].filter(Boolean);
    if (notes.length) setVideoNote(notes.join(" · "));
    return data.videoUrl as string;
  }

  function resolveWizardVideoDurationSec(): number {
    const stitchReady =
      isConceptCinematicStyle(visualStyleId) &&
      cinematicSceneCount > 1 &&
      cinematicScenes.length >= cinematicSceneCount;
    const singleCinematicReady =
      isConceptCinematicStyle(visualStyleId) &&
      cinematicSceneCount === 1 &&
      cinematicScenes.length >= 1;
    return isStoryboardOutput
      ? Number(storyboardTrimDuration) || 8
      : stitchReady
        ? cinematicScenes.length * CINEMATIC_CLIP_SEC
        : singleCinematicReady
          ? CINEMATIC_CLIP_SEC
          : videoSettings.duration === "auto"
            ? 10
            : Number(videoSettings.duration) || 10;
  }

  async function fetchAdPackPlan(): Promise<AdPackPlan> {
    const stitchReady =
      isConceptCinematicStyle(visualStyleId) &&
      cinematicSceneCount > 1 &&
      cinematicScenes.length >= cinematicSceneCount;
    const singleCinematicReady =
      isConceptCinematicStyle(visualStyleId) &&
      cinematicSceneCount === 1 &&
      cinematicScenes.length >= 1;
    const durationSec = resolveWizardVideoDurationSec();

    const scenesForPlan = stitchReady || singleCinematicReady
      ? cinematicScenes.map((scene: CinematicSceneResult) => ({
          imageIndex: scene.sceneIndex,
          role: scene.role,
          startSec: scene.startSec,
          endSec: scene.endSec,
          sceneDescriptionZh: scene.sceneDescriptionZh,
          imagePrompt: scene.imagePrompt,
        }))
      : storyboardScenes.map((scene: StoryboardSceneResult) => ({
          imageIndex: scene.imageIndex,
          role: scene.role,
          startSec: scene.startSec,
          endSec: scene.endSec,
          sceneDescriptionZh: scene.sceneDescriptionZh,
          imagePrompt: scene.imagePrompt ?? scene.role,
        }));

    const res = await fetch("/api/plan-ad-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product,
        headline,
        subline,
        business,
        offer,
        promptMarket,
        durationSec,
        brandProfile,
        videoPrompt,
        promptExtra: [effectivePromptExtra(), creativeVideoBrief.trim()]
          .filter(Boolean)
          .join(" | "),
        storyboardScenes: scenesForPlan,
        musicMood,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.adPackPlanFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    return data.plan as AdPackPlan;
  }

  async function ensureSocialPackReady(): Promise<{
    plan: AdPackPlan | null;
    captions: CaptionLine[];
    aiMusicUrl: string | null;
  }> {
    const needsPack =
      voiceoverEnabled || captionBurnEnabled || musicSource === "ai";
    if (!needsPack) {
      return { plan: adPackPlan, captions: captionLines, aiMusicUrl: null };
    }

    let plan = adPackPlan;
    if (!plan) {
      plan = await fetchAdPackPlan();
      setAdPackPlan(plan);
      setCaptionLines(plan.captionLines ?? []);
    }
    const captions = plan.captionLines ?? captionLines;

    let aiMusicUrl: string | null = null;
    if (musicSource === "ai") {
      const existing = aiMusicTracks.find((t: AiMusicTrack) => t.id === selectedAiMusicId);
      if (existing?.audioUrl) {
        aiMusicUrl = existing.audioUrl;
      } else if (plan.music.promptEn?.trim()) {
        const res = await fetch("/api/generate-music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptEn: plan.music.promptEn,
            durationSec: plan.music.durationSec,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? m.errors.musicGenerateFailed);
        notifyCreditBalance(readCreditBalanceFromResponse(data));
        const tracks = data.tracks ?? [];
        setAiMusicTracks(tracks);
        const firstId = tracks[0]?.id ?? null;
        setSelectedAiMusicId(firstId);
        aiMusicUrl = tracks[0]?.audioUrl ?? null;
      }
    }

    return { plan, captions, aiMusicUrl };
  }

  async function planAdPackReview() {
    setAdPackPlanBusy(true);
    setError(null);
    try {
      const plan = await fetchAdPackPlan();
      setAdPackPlan(plan);
      setSelectedAdPackHookIndex(0);
      setCaptionLines(plan.captionLines ?? []);
      setVoicePreviewTracks([]);
      setSelectedVoicePreviewId(null);
      setAdPackReviewOpen(true);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.adPackPlanFailed));
    } finally {
      setAdPackPlanBusy(false);
    }
  }

  async function generateVoicePreviews() {
    const script =
      adPackPlan?.voiceoverScript?.trim() ||
      captionLines
        .map((l: CaptionLine) => l.text.trim())
        .filter(Boolean)
        .join("，");
    if (!script) {
      setError(m.wizard.adPack.needVoiceoverScript);
      return;
    }
    setVoicePreviewBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/preview-script-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          locale: voiceoverLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.voiceoverFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      const tracks = (data.tracks ?? []) as VoicePreviewTrack[];
      setVoicePreviewTracks(tracks);
      setSelectedVoicePreviewId(tracks[0]?.id ?? null);
      const previewErrors = (data.errors ?? []) as Array<{ presetId: string; message: string }>;
      if (previewErrors.length > 0) {
        setVideoNote(
          m.wizard.adPack.voicePreviewPartial.replace(
            "{failed}",
            String(previewErrors.length),
          ),
        );
      }
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.voiceoverFailed));
    } finally {
      setVoicePreviewBusy(false);
    }
  }

  async function generateAiMusicTracks() {
    const plan = adPackPlan;
    const promptEn = plan?.music.promptEn?.trim();
    if (!promptEn || !plan) {
      setError(m.wizard.adPack.needPlanFirst);
      return;
    }
    setMusicGenerateBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptEn,
          durationSec: plan.music.durationSec,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.musicGenerateFailed);
      notifyCreditBalance(readCreditBalanceFromResponse(data));
      setAiMusicTracks(data.tracks ?? []);
      setSelectedAiMusicId(data.tracks?.[0]?.id ?? null);
      setMusicSource("ai");
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.musicGenerateFailed));
    } finally {
      setMusicGenerateBusy(false);
    }
  }

  function updateCaptionLine(index: number, patch: Partial<CaptionLine>) {
    setCaptionLines((prev: CaptionLine[]) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addCaptionLine() {
    const last = captionLines[captionLines.length - 1];
    const startSec = last ? last.endSec : 0;
    setCaptionLines((prev: CaptionLine[]) => [
      ...prev,
      { startSec, endSec: startSec + 2, text: "", position: "bottom" },
    ]);
  }

  function removeCaptionLine(index: number) {
    setCaptionLines((prev: CaptionLine[]) => prev.filter((_, i) => i !== index));
  }

  function updateStoryboardSceneTiming(index: number, startSec: number, endSec: number) {
    const safeStart = Math.max(0, startSec);
    const safeEnd = Math.max(safeStart + 0.5, endSec);
    setStoryboardScenes((prev: StoryboardSceneResult[]) =>
      prev.map((scene, i) =>
        i === index ? { ...scene, startSec: safeStart, endSec: safeEnd } : scene,
      ),
    );
    if (storyboardPlan) {
      setStoryboardPlan({
        ...storyboardPlan,
        scenes: storyboardPlan.scenes.map((scene: StoryboardScenePlan, i: number) =>
          i === index ? { ...scene, startSec: safeStart, endSec: safeEnd } : scene,
        ),
      });
    }
  }

  function updateStoryboardPlanScene(
    index: number,
    patch: Partial<Pick<StoryboardScenePlan, "sceneDescriptionZh" | "onImageCopyZh" | "imagePrompt" | "role">>,
  ) {
    if (!storyboardPlan) return;
    setStoryboardPlan({
      ...storyboardPlan,
      scenes: storyboardPlan.scenes.map((scene, i) =>
        i === index ? { ...scene, ...patch } : scene,
      ),
    });
  }

  async function planStoryboard() {
    if (isConceptStoryboardOutput) {
      if (!effectivePromoteName) {
        setError(m.errors.needHeadline);
        return;
      }
    } else if (!product.trim()) {
      setError(m.errors.needProductName);
      return;
    }
    setPlanStoryboardBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
      fd.set("promotion_mode", promotionMode);
      if (brandProfile) fd.set("brand_profile", JSON.stringify(brandProfile));
      fd.set(
        "product_name",
        isConceptStoryboardOutput ? effectivePromoteName : product.trim(),
      );
      if (conceptIdea.trim()) fd.set("concept_idea", conceptIdea.trim());
      fd.set("business", business.trim());
      fd.set("headline", headline.trim());
      fd.set("subline", subline.trim());
      fd.set("offer", offer.trim());
      fd.set("storyboard_brief", storyboardBrief.trim());
      fd.set("duration", storyboardTrimDuration);
      fd.set("scene_count", storyboardSceneCount);
      fd.set("prompt_market", promptMarket);
      fd.set("subject_framing", subjectFraming);
      fd.set("prompt_extra", effectivePromptExtra());
      appendReferenceFormFields(fd);
      const res = await fetch("/api/plan-storyboard", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.storyboardFailed);
      setStoryboardPlan(data.plan);
      if (typeof data.seedancePrompt === "string" && data.seedancePrompt.trim()) {
        setVideoPrompt(data.seedancePrompt);
      }
      setVideoPromptPlanNote(data.plan?.productionNotes || null);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.storyboardFailed));
    } finally {
      setPlanStoryboardBusy(false);
    }
  }

  async function dubScriptVoiceIfEnabled(
    videoUrlIn: string,
    packOverride?: AdPackPlan | null,
    captionsOverride?: CaptionLine[],
  ): Promise<string> {
    if (!voiceoverEnabled) return videoUrlIn;
    const pack = packOverride ?? adPackPlan;
    const caps = captionsOverride ?? captionLines;
    const script =
      pack?.voiceoverScript?.trim() ||
      caps
        .map((l: CaptionLine) => l.text.trim())
        .filter(Boolean)
        .join("，");
    if (!script) {
      throw new Error(m.wizard.adPack.needVoiceoverScript);
    }
    const targetDurationSec =
      isConceptCinematicSingleOutput || cinematicScenes.length === 1
        ? CINEMATIC_CLIP_SEC
        : isCinematicStitchOutput || cinematicScenes.length > 1
          ? cinematicScenes.length * CINEMATIC_CLIP_SEC
          : isStoryboardOutput
            ? Number(storyboardTrimDuration) || 8
            : videoSettings.duration === "auto"
              ? 10
              : Number(videoSettings.duration) || 10;
    const selectedPreview = voicePreviewTracks.find((t: VoicePreviewTrack) => t.id === selectedVoicePreviewId);
    const res = await fetch("/api/dub-script-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: videoUrlIn,
        script: selectedPreview ? undefined : script,
        locale: voiceoverLocale,
        target_duration_sec: targetDurationSec,
        speech_url: selectedPreview?.audioUrl,
        voice_preset: selectedPreview?.presetId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.voiceoverFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    setVideoNote((prev: string | undefined) =>
      [prev, m.wizard.adPack.voiceoverAppliedNote].filter(Boolean).join(" · "),
    );
    return data.videoUrl as string;
  }

  async function burnScriptCaptionsIfEnabled(
    videoUrlIn: string,
    captionsOverride?: CaptionLine[],
    opts?: { force?: boolean },
  ): Promise<string> {
    let caps = captionsOverride ?? captionLines;
    const hook = adPackPlan?.hookScript?.trim();
    const body = adPackPlan?.voiceoverScript?.trim();
    if (hook && body && hook !== body) {
      caps = layoutHookSplitCaptions(hook, body, resolveWizardVideoDurationSec());
    }
    if ((!captionBurnEnabled && !opts?.force) || caps.length === 0) return videoUrlIn;
    const res = await fetch("/api/burn-script-captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: videoUrlIn, caption_lines: caps }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
    notifyCreditBalance(readCreditBalanceFromResponse(data));
    setVideoNote((prev: string | undefined) =>
      [
        prev,
        data.softSubtitles
          ? m.wizard.adPack.captionsSoftTrackNote
          : m.wizard.adPack.captionsAppliedNote,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    return data.videoUrl as string;
  }

  async function addBgm(videoUrlIn: string, aiMusicUrlOverride?: string | null): Promise<string> {
    const selectedAi = aiMusicTracks.find((t: AiMusicTrack) => t.id === selectedAiMusicId);
    const aiUrl = aiMusicUrlOverride ?? selectedAi?.audioUrl;
    const body: {
      video_url: string;
      track?: string;
      music_url?: string;
      replace_source_audio?: boolean;
    } = {
      video_url: videoUrlIn,
      replace_source_audio: true,
    };
    if (musicSource === "ai" && aiUrl) {
      body.music_url = aiUrl;
    } else {
      body.track = bgmTrack;
    }

    const res = await fetch("/api/add-bgm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setBgmNote(
        musicSource === "ai" && selectedAiMusicId ?
          m.wizard.adPack.aiBgmNote
        : m.wizard.bgmNote,
      );
      return data.videoUrl as string;
    }
    if (data.code === "BGM_FILES_MISSING") {
      setBgmNote(m.wizard.bgmFallbackNote);
      throw new Error(m.errors.bgmFilesMissing);
    }
    throw new Error(data.error ?? m.errors.videoFailed);
  }

  async function generateVideo(opts?: { imageUrlOverride?: string }) {
    if (promotionMode === "concept" && videoCreativeMode === "product-assistant") {
      setVideoCreativeMode("product-promo");
      setError(m.errors.conceptVideoAssistantBlocked);
      return;
    }

    const conceptTextVideoReady =
      conceptTextVideoEligible && Boolean(videoPrompt.trim());
    // Safety net: if cinematic scenes are ready, force stitch path even if UI toggle drifted.
    const shouldCinematicStitch =
      isCinematicStitchOutput ||
      (isConceptCinematicStyle(visualStyleId) &&
        cinematicSceneCount > 1 &&
        cinematicScenes.length >= cinematicSceneCount);

    if (isStoryboardOutput && storyboardScenes.length === 0) {
      setError(m.errors.storyboardVideoPromptRequired);
      return;
    }
    if (isUgcPresenterOutput && presenterSourceMode === "custom-keyframe" && !imageUrl) {
      setError(m.errors.needGeneratedImage);
      return;
    }
    if (shouldCinematicStitch && cinematicScenes.length < cinematicSceneCount) {
      setError(formatCinematicCopy(m.errors.cinematicStitchNeedScenes));
      return;
    }
    if (
      !isStoryboardOutput &&
      !shouldCinematicStitch &&
      workflowMode === "combined" &&
      videoCreativeMode === "image-to-video" &&
      !imageUrl &&
      !opts?.imageUrlOverride &&
      !usesCompositor
    ) {
      setError(m.errors.needGeneratedImage);
      return;
    }
    if (!isStoryboardOutput && videoCreativeMode === "reference-concept" && !useReferenceVideo) {
      setError(m.errors.needReferenceVideo);
      return;
    }
    if (
      workflowMode === "video-only" &&
      !usesCompositor &&
      !productPhoto &&
      !conceptTextVideoReady &&
      !directReferenceR2vReady &&
      !(isStoryboardOutput && storyboardScenes.length > 0)
    ) {
      setError(m.errors.needPhoto);
      return;
    }
    if (usesProductAssistant && !productVideoPlan?.seedancePrompt) {
      setError(m.errors.needProductVideoPlan);
      return;
    }
    if (isBrandVideoStyle(visualStyleId) && !videoPrompt.trim()) {
      setError(m.errors.brandVideoPromptRequired);
      return;
    }
    if (isCreativeVideoStyle(visualStyleId) && !shouldCinematicStitch && !videoPrompt.trim()) {
      setError(m.errors.creativeVideoPromptRequired);
      return;
    }
    if (
      promotionMode === "concept" &&
      isAiPlannedVideoStyle(visualStyleId) &&
      !shouldCinematicStitch &&
      !isConceptCinematicSingleOutput &&
      !directReferenceR2vReady &&
      !videoPrompt.trim()
    ) {
      setError(m.errors.conceptVideoPlanRequired);
      return;
    }
    if (useMultiAngleVideo && !useReferenceVideo) {
      setError(m.errors.extraAnglesNeedRefVideo);
      return;
    }
    if (!hasFinalImage && !opts?.imageUrlOverride && !conceptTextVideoReady && !directReferenceR2vReady) {
      setError(usesCompositor ? m.errors.needHeadline : m.errors.needKeyframe);
      return;
    }

    setError(null);
    setBgmNote(undefined);
    setVideoNote(undefined);
    setVideoBusy(true);
    setVideoJobStartedAt(Date.now());
    setVideoPhase("video");

    try {
      let url: string;
      let socialPack: Awaited<ReturnType<typeof ensureSocialPackReady>> | null = null;
      if (isUgcPresenterOutput || captionBurnEnabled) {
        setVideoPhase("video");
        socialPack = await ensureSocialPackReady();
      }

      const generationKind = resolveVideoGenerationKind({
        usesCompositor,
        isStoryboardOutput,
        isUgcPresenterOutput,
        shouldCinematicStitch,
        isConceptCinematicSingleOutput,
        cinematicSceneCount,
        cinematicScenesLength: cinematicScenes.length,
        usesProductAssistant,
        conceptTextVideoReady,
        videoCreativeMode,
        useReferenceVideo,
        hasReferenceAd: Boolean(referenceAd),
        useMultiAngleVideo,
      });

      switch (generationKind) {
        case "compositor":
          setVideoPhase("video");
          url = await composeVideo();
          setVideoNote(m.wizard.compositorVideoHint);
          break;
        case "storyboard":
          url = await makeStoryboardVideo();
          break;
        case "digital-presenter":
          url = await makeDigitalPresenterVideo(socialPack?.plan);
          break;
        case "cinematic-stitch":
          url = await makeCinematicStitchVideo();
          break;
        case "concept-cinematic-single":
          url = await makeCinematicClipFromImage(
            cinematicScenes[0].imageUrl,
            cinematicScenes[0].videoMotionPrompt,
            cinematicScenes[0].sceneIndex,
            cinematicScenes.length,
          );
          break;
        case "product-assistant":
          url = await makeProductAssistantVideo();
          break;
        case "text-to-video":
          url = await makeTextToVideo();
          break;
        case "reference-r2v":
          url = await makeReferenceVideo(referenceAd!);
          break;
        case "multi-angle-r2v":
          url = await makeMultiAngleVideo();
          break;
        case "image-to-video":
        default:
          if (
            referenceAd &&
            referenceIsVideo &&
            videoCreativeMode !== "reference-concept"
          ) {
            setVideoNote(m.wizard.videoRefIgnoredOnImageMode);
          }
          url = await makeImageToVideo(opts?.imageUrlOverride);
          break;
      }
      if (!usesCompositor) {
        if (isUgcPresenterOutput) {
          setVideoNote((prev: string | undefined) =>
            [prev, m.wizard.ugcPresenter.voiceBakedInNote].filter(Boolean).join(" · "),
          );
        }
        // Clean silent video by default — BGM / voiceover / captions are added later in /captions
        // so users can change music without re-generating Seedance.
        // Storyboard: always burn scene onImageCopyZh as captions (stills are textless).
        if (isStoryboardOutput) {
          const videoDurationSec =
            lastStoryboardVideoDurationSecRef.current ??
            (Number(storyboardTrimDuration) || undefined);
          const caps = captionLinesFromStoryboardScenes(storyboardScenes, {
            videoDurationSec: videoDurationSec || undefined,
          });
          if (caps.length > 0) {
            setCaptionLines(caps);
            setCaptionBurnEnabled(true);
            setVideoPhase("captions");
            const urlBeforeCaptionBurn = url;
            try {
              url = await burnScriptCaptionsIfEnabled(url, caps, { force: true });
            } catch {
              setVideoNote((prev: string | undefined) =>
                [prev, m.wizard.adPack.captionBurnSkippedNote].filter(Boolean).join(" · "),
              );
            }
            setCaptionHandoffVideoUrl(urlBeforeCaptionBurn);
          } else {
            setCaptionHandoffVideoUrl(url);
          }
        } else if (captionBurnEnabled && (socialPack?.captions.length ?? captionLines.length) > 0) {
          setVideoPhase("captions");
          const urlBeforeCaptionBurn = url;
          try {
            url = await burnScriptCaptionsIfEnabled(url, socialPack?.captions);
          } catch {
            setVideoNote((prev: string | undefined) =>
              [prev, m.wizard.adPack.captionBurnSkippedNote].filter(Boolean).join(" · "),
            );
          }
          setCaptionHandoffVideoUrl(urlBeforeCaptionBurn);
        } else {
          setCaptionHandoffVideoUrl(url);
        }
      } else {
        setCaptionHandoffVideoUrl(url);
      }
      // Storyboard/caption burn used to rewrite to /api/pipeline-files/…; durable outputs
      // are now /api/library/download/…. Only a leftover fal CDN URL means burn/stitch never stuck.
      const wantsProcessed = !isUgcPresenterOutput && (captionBurnEnabled || isStoryboardOutput);
      if (
        wantsProcessed &&
        isFalCdnUrl(url) &&
        !isLibraryAssetUrl(url) &&
        !isPipelineFileUrl(url)
      ) {
        throw new Error(m.errors.postProcessIncomplete);
      }
      setVideoUrl(url);
      setQuickFixCredits(1);
      savePromptSnapshot(
        createPromptSnapshot({
          kind: "video",
          templateId,
          visualStyleId,
          imagePrompt,
          videoPrompt,
          negativePrompt,
        }),
      );
      setStepKey("done");
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.videoFailed));
    } finally {
      setVideoBusy(false);
      setVideoJobStartedAt(null);
    }
  }

  function resetProject() {
    setWorkflowMode("combined");
    setStepKey("setup");
    setTemplateId("product-reel");
    setVisualStyleId(DEFAULT_VISUAL_STYLE);
    setImageCreativeMode("promo-ai");
    setVideoCreativeMode("image-to-video");
    setVideoSettings(DEFAULT_VIDEO_SETTINGS);
    setEndFrameUrl(null);
    setEndFramePhoto(null);
    setExtraAnglePhotos([]);
    setPackagingPhoto(null);
    setExtraKitPhotos([]);
    setProductVideoPlan(null);
    setSelectedReferenceClipId(null);
    setImageInputMode(getTemplateConfig("paper-sticker-reel").defaultImageInputMode);
    setProduct("");
    setHeadline("");
    setSubline("");
    setBusiness("");
    setOffer("");
    setImageUrl(null);
    setImageVariantUrls([]);
    setSelectedVariantIndex(0);
    setImageOutputMode(DEFAULT_IMAGE_OUTPUT_MODE);
    setImageAspectRatio(defaultImageAspectRatioForWorkflow("combined"));
    setCampaignTheme("");
    setCampaignPlan(null);
    setCampaignSlides([]);
    setStoryboardBrief("");
    setStoryboardPlan(null);
    setStoryboardScenes([]);
    setBrandProfile(null);
    setBrandAnalyzeNote(null);
    setCreativeVideoBrief("");
    setConceptImageVisionNote("");
    setConceptIdea("");
    setVideoPromptPlanNote(null);
    setUploadQualityWarning(null);
    setUseOriginalImage(false);
    setVideoUrl(null);
    setCaptionHandoffVideoUrl(null);
    setVideoNote(undefined);
    setBgmNote(undefined);
    setQuickFixCredits(0);
    setImagePostflight(null);
    setImageQualityChecklist({ productReadable: false, textLegible: false });
    setShipItPipelineBusy(false);
    setProductPhoto(null);
    setImageRefPhoto(null);
    setReferenceAd(null);
    setError(null);
    setBgmTrack("calm");
    setPromptMarket(locale === "en" ? "en" : locale === "zh-cn" ? "cn" : "hk");
    setSubjectFraming("auto");
    setPromptExtra("");
    setArtStyleId(DEFAULT_ART_STYLE);
    setVoicePreviewTracks([]);
    setSelectedVoicePreviewId(null);
  }

  const bgmOptions: { id: BgmTrackId; label: string }[] = [
    { id: "calm", label: m.wizard.bgmCalm },
    { id: "upbeat", label: m.wizard.bgmUpbeat },
    { id: "warm", label: m.wizard.bgmWarm },
  ];

  const conceptTextVideoReady =
    conceptTextVideoEligible && Boolean(videoPrompt.trim());

  const continueSetupLabel = isContentResearchReelVideo
    ? m.wizard.continueToSimilarVideo
    : workflowMode === "video-only"
      ? m.wizard.continueToVideo
      : m.wizard.continueToImage;

  const setupImageGateReason =
    stepKey === "setup"
      ? evaluateProceedToImageGate({
          promotionMode,
          workflowMode,
          promptExtra,
          effectivePromoteName,
          hasReferenceImage: Boolean(imageRefPhoto),
          referenceAnalyzeBusy,
          imageCreativeMode,
          headline,
          visualStyleId,
          hasProductPhoto: Boolean(productPhoto),
          isStoryboardOutput,
        })
      : null;
  const setupReferenceDurationGateReason =
    stepKey === "setup" && referenceReelNeedsExplicitDuration
      ? ("need_output_duration" as const)
      : null;
  const setupNextDisabled = Boolean(setupImageGateReason || setupReferenceDurationGateReason);
  const setupNextDisabledReason = setupReferenceDurationGateReason
    ? m.wizard.researchReelPickDurationFirst
    : setupImageGateReason
      ? resolveSetupImageGateMessage(setupImageGateReason)
      : null;
  const imageGenerateDisabledReason = imageGenerateBlockReason();

  const imageFinishLabel =
    workflowMode === "image-only" && !isStoryboardOutput && !isCinematicStitchOutput && !isConceptCinematicSingleOutput
      ? m.wizard.finishImage
      : m.wizard.continueToVideo;
  const imageNextDisabled = !hasFinalImage;
  const imageNextDisabledReason = (() => {
    if (!hasFinalImage) return m.errors.needAiImage;
    if (visionReviewNeedsAttention(imageVisionReview)) {
      return m.wizard.imageVisionContinueWarn;
    }
    return null;
  })();
  const shipItVisionBlocked = visionGateBlocksShipIt(imageVisionReview);
  const videoGenerateDisabled =
    (!hasFinalImage && !conceptTextVideoReady && !directReferenceR2vReady) ||
    (isCinematicStitchOutput && cinematicScenes.length < cinematicSceneCount) ||
    videoBusy ||
    researchReelAnalyzeBusy ||
    (promotionMode === "concept" &&
      useReferenceVideo &&
      Boolean(referenceAd) &&
      !referenceR2vReady &&
      !isStoryboardOutput) ||
    planVideoPromptBusy ||
    adPackPlanBusy ||
    musicGenerateBusy ||
    (isContentResearchReelVideo && !researchReelAnalysis && !videoPrompt.trim()) ||
    (isContentResearchPhysicalR2v && !referenceR2vReady) ||
    (promotionMode === "concept" &&
      isAiPlannedVideoStyle(visualStyleId) &&
      !isCinematicStitchOutput &&
      !isConceptCinematicSingleOutput &&
      !directReferenceR2vReady &&
      !videoPrompt.trim()) ||
    (usesProductAssistant && (!productPhoto || !productVideoPlan?.seedancePrompt)) ||
    (isStoryboardOutput && storyboardScenes.length === 0) ||
    (isUgcPresenterOutput && !imageUrl) ||
    (isUgcPresenterOutput &&
      !adPackPlan?.voiceoverScript?.trim() &&
      captionLines.every((l: CaptionLine) => !l.text.trim()));
  const videoGenerateDisabledReason = (() => {
    if (!videoGenerateDisabled) return null;
    if (videoBusy || planVideoPromptBusy || adPackPlanBusy || musicGenerateBusy) {
      return m.wizard.mobileVideoBusy;
    }
    if (researchReelAnalyzeBusy) {
      return m.wizard.researchReelAnalyzing;
    }
    if (
      promotionMode === "concept" &&
      useReferenceVideo &&
      referenceAd &&
      !referenceR2vReady &&
      !isStoryboardOutput
    ) {
      return m.wizard.researchReelAnalyzeFirstHint;
    }
    if (isContentResearchReelVideo && !researchReelAnalysis && !videoPrompt.trim()) {
      return m.wizard.researchReelAnalyzeFirstHint;
    }
    if (isContentResearchPhysicalR2v && !referenceR2vReady) {
      return m.wizard.researchReelAnalyzeFirstHint;
    }
    if (isCinematicStitchOutput && cinematicScenes.length < cinematicSceneCount) {
      return m.errors.cinematicStitchNeedScenes.replace("{count}", String(cinematicSceneCount));
    }
    if (usesProductAssistant && !productPhoto) {
      return m.wizard.productVideoUploadFirstHint;
    }
    if (usesProductAssistant && !productVideoPlan?.seedancePrompt) {
      return m.wizard.productVideoAnalyzeFirstHint;
    }
    if (isStoryboardOutput && storyboardScenes.length === 0) {
      return m.wizard.storyboardVideoNeedScenesHint;
    }
    if (isUgcPresenterOutput && !imageUrl) {
      return m.errors.needGeneratedImage;
    }
    if (
      isUgcPresenterOutput &&
      !adPackPlan?.voiceoverScript?.trim() &&
      captionLines.every((l: CaptionLine) => !l.text.trim())
    ) {
      return m.wizard.ugcPresenter.needAdPackHint;
    }
    if (!hasFinalImage && !conceptTextVideoReady && !directReferenceR2vReady) {
      return m.errors.needAiImage;
    }
    if (
      promotionMode === "concept" &&
      isAiPlannedVideoStyle(visualStyleId) &&
      !isCinematicStitchOutput &&
      !isConceptCinematicSingleOutput &&
      !videoPrompt.trim()
    ) {
      return m.wizard.mobileVideoNeedPrompt;
    }
    return m.wizard.mobileVideoBlocked;
  })();

  const finalImageSrc = imageUrl ?? (useOriginalImage ? uploadPreviewUrl : null);

  const { imageProgressInfo, videoProgressInfo } = useWizardProgress({
    imageBusy,
    videoBusy,
    imageJobMeta,
    videoJobStartedAt,
    progressNow,
    videoPhase,
    usesCompositor,
    labels: {
      storyboardProgressPlanning: m.wizard.storyboardProgressPlanning,
      storyboardProgressRendering: m.wizard.storyboardProgressRendering,
      campaignGenerating: m.wizard.campaignGenerating,
      campaignProgressPlanning: m.wizard.campaignProgressPlanning,
      campaignProgressRendering: m.wizard.campaignProgressRendering,
      teachingCarouselProgressPlanning: m.wizard.teachingCarouselProgressPlanning,
      teachingCarouselProgressRendering: m.wizard.teachingCarouselProgressRendering,
      imageGenerating: m.wizard.imageGenerating,
      progressEta: m.wizard.progressEta,
    },
    formatEta,
  });

  const imagePreflight = (() => {
    if (stepKey !== "image" || usesCompositor) return null;
    const lines: string[] = [];
    if (isStoryboardOutput) {
      lines.push(
        isConceptStoryboardOutput
          ? m.wizard.conceptResearchReelStoryboardImagePreflight
          : m.wizard.imagePreflightStoryboard,
      );
      lines.push(
        `${m.wizard.videoSettingsDuration}: ${
          videoSettings.duration === "auto" ? "auto" : `${videoSettings.duration}s`
        }`,
      );
    } else if (isUgcPresenterOutput) {
      lines.push(m.wizard.ugcPresenter.imagePreflight);
    } else if (isCinematicStitchOutput) {
      lines.push(formatCinematicCopy(m.wizard.imagePreflightCinematicStitch));
    } else if (isConceptCinematicSingleOutput) {
      lines.push(m.wizard.imagePreflightConceptCinematicSingle);
    } else if (promotionMode === "concept" && workflowMode === "image-only") {
      lines.push(m.wizard.imagePreflightConceptSocial);
    } else if (isCampaignOutput) {
      lines.push(m.wizard.imagePreflightCampaign);
      if (usesReferenceConceptForImage && imageRefPhoto && productPhoto) {
        lines.push(m.wizard.imagePreflightCampaignReference);
      }
    } else if (isTeachingCarouselOutput) {
      lines.push(m.wizard.imagePreflightTeachingCarousel);
    } else if (effectiveImageOutputMode === "ab") {
      lines.push(m.wizard.imagePreflightAB);
    } else {
      lines.push(m.wizard.imagePreflightSingle);
    }
    if (!isStoryboardOutput) {
      lines.push(
        m.wizard.imagePreflightAspect.replace("{ratio}", effectiveImageAspectRatio),
      );
    }
    lines.push(
      quickFixCredits > 0
        ? m.wizard.quickFixCreditReady.replace("{count}", String(quickFixCredits))
        : m.wizard.quickFixCreditUsed,
    );
    return lines;
  })();

  const videoPreflight = (() => {
    if (usesCompositor || stepKey !== "video") return null;
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const refMode =
      isStoryboardOutput ||
      isUgcPresenterOutput ||
      (videoCreativeMode === "reference-concept" && useReferenceVideo);
    const autoSecondFrame =
      !isStoryboardOutput &&
      !refMode &&
      !useMultiAngleVideo &&
      videoSettings.autoSecondFrame &&
      !endFramePhoto &&
      !endFrameUrl;
    const styleName = m.wizard.visualStyles[visualStyleId as keyof typeof m.wizard.visualStyles].title;
    const tier = vOpts.fast ? m.wizard.videoPreflightTierFast : m.wizard.videoPreflightTierQuality;
    const durationLabel = vOpts.duration === "auto" ? "auto" : `${vOpts.duration}s`;
    return {
      refMode,
      autoSecondFrame,
      lines: [
        isStoryboardOutput
          ? m.wizard.storyboardVideoPreflight
          : isUgcPresenterOutput
            ? m.wizard.ugcPresenter.videoPreflight
          : isCinematicStitchOutput
            ? formatCinematicCopy(m.wizard.cinematicStitchVideoPreflight)
          : refMode
            ? promotionMode === "concept"
              ? m.wizard.videoPreflightModeConceptRef
              : m.wizard.videoPreflightModeRef
            : m.wizard.videoPreflightModeProduct,
        m.wizard.videoPreflightSettings
          .replace("{resolution}", vOpts.resolution)
          .replace("{duration}", durationLabel)
          .replace("{tier}", tier),
        m.wizard.videoPreflightStyle.replace("{style}", styleName),
        autoSecondFrame
          ? m.wizard.videoPreflightSecondFrame
          : refMode
            ? m.wizard.videoPreflightSingleCall
            : m.wizard.videoPreflightSingleCall,
        isStoryboardOutput || isAiPlannedVideoStyle(visualStyleId)
          ? m.wizard.videoPreflightDeepSeek
          : "",
      ].filter(Boolean),
      costLine: autoSecondFrame
        ? m.wizard.videoPreflightDoubleCall
        :         isStoryboardOutput
          ? `${m.wizard.klingStoryboardFallbackNote} · ${storyboardScenes.length} scene images`
          : isCinematicStitchOutput
            ? formatCinematicCopy(m.wizard.cinematicStitchVideoCost)
            : isAiPlannedVideoStyle(visualStyleId)
              ? `${m.wizard.videoPreflightSingleCall} ${m.wizard.videoPreflightDeepSeek}`
              : m.wizard.videoPreflightSingleCall,
    };
  })();

  const handoffStartedRef = useRef(false);
  useEffect(() => {
    if (handoffStartedRef.current) return;
    handoffStartedRef.current = true;

    const handoff = readStudioAssistantHandoff();
    if (handoff) {
      clearStudioAssistantHandoff();
      void applyStudioAssistantHandoff(handoff, {
        setBrandWebsiteUrl,
        setProduct,
        setBusiness,
        setHeadline,
        setSubline,
        setOffer,
        setConceptIdea,
        setCreativeVideoBrief,
        applyQuickTest8sRecipe,
        applyCinematicStitchRecipe,
        onWorkflowModeChange,
        applyPrimaryPathConcept,
        applyPrimaryPath,
        applyPrimaryPathConceptVideo,
        setStepKey,
        setError,
        analyzeBrand,
        setPromptExtra,
        setImageOutputMode,
        setImageAspectRatio,
        setCampaignTheme,
        selectVisualStyle,
        setImageRefPhoto,
        setImageCreativeMode,
        onImageInputModeChange,
        setExtraKitPhotos,
        setReferenceCarouselSlideCount,
        setContentResearchApplyRef,
        onVideoCreativeModeChange,
        onReferenceAdFile,
      } as Parameters<typeof applyStudioAssistantHandoff>[1]);
      return;
    }

    if (typeof window === "undefined") return;
    const templateRaw = window.sessionStorage.getItem(TEMPLATE_PREF_KEY);
    if (templateRaw && isTemplateId(templateRaw)) {
      window.sessionStorage.removeItem(TEMPLATE_PREF_KEY);
      const styleId = visualStyleForTemplate(templateRaw);
      if (styleId) {
        selectVisualStyle(styleId);
        onWorkflowModeChange("image-only");
        setHeadline("");
        setSubline("");
        setBusiness("");
        setOffer("");
        setProduct("");
      }
    }
  }, []);

  return {
    addBgm,
    addCaptionLine,
    adPackPlan,
    adPackPlanBusy,
    adPackReviewOpen,
    advancedSection,
    analyzeBrand,
    applyGeneratedCampaign,
    applyGeneratedImages,
    applyGeneratedStoryboard,
    applyPrimaryPath,
    applyPrimaryPathConcept,
    applyPrimaryPathConceptVideo,
    applyClosestMatchRecipe,
    applyQuickTest8sRecipe,
    applyCinematicStitchRecipe,
    applyPrimaryPathVideoOnly,
    applyPromptRebuild,
    promotionMode,
    bgmNote,
    bgmOptions,
    bgmTrack,
    brandAnalyzeBusy,
    brandAnalyzeNote,
    brandProfile,
    brandSocialHint,
    brandWebsiteUrl,
    buildComposeFormData,
    business,
    campaignPlan,
    campaignSlideLabel,
    campaignSlides,
    campaignTheme,
    canGenerateImage,
    composeImage,
    composeVideo,
    continueSetupLabel,
    effectivePromoteName,
    setupNextDisabled,
    setupNextDisabledReason,
    imageGenerateDisabledReason,
    creativeVideoBrief,
    conceptImageVisionNote,
    userReferenceBrief,
    referenceStrategy,
    referenceAnalyzeBusy,
    referenceAnalyzeNote,
    researchReelAnalysis,
    researchReelAnalyzeBusy,
    researchReelAnalyzeNote,
    isContentResearchReelVideo,
    isConceptResearchReelStoryboard,
    isConceptStoryboardOutput,
    isContentResearchVideoPath,
    conceptIdea,
    effectiveImageMode,
    effectiveImageOutputMode,
    effectivePromptExtra,
    endFramePhoto,
    endFramePreviewUrl,
    endFrameUrl,
    ensureEndFrameUrl,
    error,
    estimateStoryboardSceneCount,
    extraAnglePhotos,
    fileFromImageUrl,
    finalImageSrc,
    finishImageStep,
    formatEta,
    friendlyError,
    generateImage,
    generateAiMusicTracks,
    generateVoicePreviews,
    generateVideo,
    getPromptVars,
    goBackFromImage,
    goBackFromVideo,
    goNextFromSetup,
    hasFinalImage,
    headline,
    imageBusy,
    imageCreativeMode,
    imageFinishLabel,
    imageGenKey,
    imageInputMode,
    imageJobMeta,
    imageNextDisabled,
    imageNextDisabledReason,
    imageOutputMode,
    imageAspectRatio,
    effectiveImageAspectRatio,
    imagePreflight,
    imagePostflight,
    imagePostflightBusy,
    imageVisionReview,
    imageVisionReviewBusy,
    imageQualityChecklist,
    setImageQualityChecklist,
    imageProgressInfo,
    imagePrompt,
    imageRefPhoto,
    imageRefPreviewUrl,
    imageStepHint,
    imageUrl,
    imageVariantUrls,
    isCampaignOutput,
    isTeachingCarouselOutput,
    isImageWorkflow,
    isStoryboardOutput,
    isUgcPresenterOutput,
    isCinematicStitchOutput,
    isConceptCinematicSingleOutput,
    cinematicStitchReady,
    cinematicScenes,
    cinematicReelPlan,
    cinematicStitchReel,
    cinematicSceneCount,
    setCinematicSceneCount,
    onCinematicSceneCountChange,
    formatCinematicCopy,
    isVideoWorkflow,
    keyframePreview,
    lastImageEndpoint,
    loadReferenceClip,
    locale,
    lockedCampaignMode,
    m,
    makeDigitalPresenterVideo,
    makeImageToVideo,
    makeMultiAngleVideo,
    makeReferenceVideo,
    makeStoryboardVideo,
    musicGenerateBusy,
    musicSource,
    needsProductUpload,
    negativePrompt,
    normalizeStoryboardIndices,
    offer,
    onImageCreativeModeChange,
    onImageInputModeChange,
    onProductPhotoSelected,
    onReferenceAdFile,
    onVideoCreativeModeChange,
    onWorkflowModeChange,
    planAdPackReview,
    planAiVideoPrompt,
    planProductVideo,
    planProductVideoBusy,
    planVideoPromptBusy,
    productVideoPlan,
    packagingPhoto,
    packagingPreviewUrl,
    extraKitPhotos,
    extraKitPreviewUrls,
    referenceCarouselSlideCount,
    setReferenceCarouselSlideCount,
    contentResearchApplyRef,
    setContentResearchApplyRef,
    usesProductAssistant,
    usesConceptTextVideo,
    conceptReferenceR2vReady,
    directReferenceR2vReady,
    referenceR2vReady,
    product,
    productPhoto,
    progressNow,
    promptExtra,
    promptMarket,
    quickFixCredits,
    quickFixImage,
    quickFixLogoFile,
    quickFixLogoPlacement,
    quickFixLogoPreviewUrl,
    quickFixVideo,
    onQuickFixLogoSelected,
    imagePreOverlayUrl,
    imageTextMode,
    setImageTextMode,
    imageTextOverlaySeedLayers,
    applyImageTextOverlay,
    applyImageCanvasOverlay,
    listExportableSlides,
    presenterSourceMode,
    setPresenterSourceMode,
    presenterAvatarId,
    setPresenterAvatarId,
    selectedAdPackHookIndex,
    applyAdPackHookVariant,
    inpaintFromRegions,
    inpaintGeneratedImage,
    brandKit,
    setBrandKit,
    restoreImageBeforeTextOverlay,
    stripImageTextForOverlay,
    refineGeneratedImageWithLogo,
    refineGeneratedImageWithRegions,
    setQuickFixLogoPlacement,
    removeCaptionLine,
    refineGeneratedImage,
    refVideoDurationSec,
    referenceAd,
    referenceClipLoading,
    referenceIsVideo,
    referencePreviewUrl,
    regenerateStoryboardSceneWithAi,
    reorderStoryboardScene,
    replaceStoryboardSceneImage,
    resetProject,
    runShipItPipeline,
    shipItEligible,
    shipItVisionBlocked,
    shipItMode,
    setShipItMode,
    shipItPipelineBusy,
    selectVisualStyle,
    artStyleId,
    setArtStyleId,
    selectedReferenceClipId,
    selectedAiMusicId,
    selectedVariantIndex,
    aiMusicTracks,
    captionBurnEnabled,
    captionHandoffVideoUrl,
    captionLines,
    setAdPackPlan,
    setAdPackPlanBusy,
    setAdPackReviewOpen,
    setBgmNote,
    setBgmTrack,
    setCaptionBurnEnabled,
    setCaptionLines,
    setMusicSource,
    setAiMusicTracks,
    setSelectedAiMusicId,
    setMusicGenerateBusy,
    voicePreviewTracks,
    setVoicePreviewTracks,
    selectedVoicePreviewId,
    setSelectedVoicePreviewId,
    voicePreviewBusy,
    setVoicePreviewBusy,
    setBrandAnalyzeBusy,
    setBrandAnalyzeNote,
    setBrandProfile,
    setBrandSocialHint,
    setBrandWebsiteUrl,
    setBusiness,
    setCampaignPlan,
    setCampaignSlides,
    setCampaignTheme,
    setCreativeVideoBrief,
    setConceptImageVisionNote,
    setUserReferenceBrief,
    setConceptIdea,
    setEndFramePhoto,
    setEndFramePreviewUrl,
    setEndFrameUrl,
    setError,
    setExtraAnglePhotos,
    setExtraKitPhotos,
    setPackagingPhoto,
    setHeadline,
    setImageBusy,
    setImageCreativeMode,
    setImageGenKey,
    setImageInputMode,
    setImageJobMeta,
    setImageOutputMode,
    setImageAspectRatio,
    setImagePrompt,
    setImageRefPhoto,
    setImageRefPreviewUrl,
    setImageUrl,
    setImageVariantUrls,
    setLastImageEndpoint,
    setNegativePrompt,
    setOffer,
    setPlanVideoPromptBusy,
    setProduct,
    setProductPhoto,
    setProgressNow,
    setPromptExtra,
    setPromptMarket,
    setQuickFixCredits,
    setRefVideoDurationSec,
    setReferenceAd,
    setReferenceClipLoading,
    setReferenceIsVideo,
    setReferencePreviewUrl,
    setSelectedReferenceClipId,
    setSelectedVariantIndex,
    setShowAdvancedImage,
    setShowAdvancedSetup,
    setShowAdvancedSetupPrompts,
    setShowAdvancedVideo,
    setStepKey,
    setStoryboardBrief,
    setStoryboardPlan,
    setStoryboardSceneRegenerateBusy,
    setStoryboardSceneReplaceBusy,
    setStoryboardScenes,
    setStoryboardTrimDuration,
    setSubjectFraming,
    setSubline,
    setTemplateId,
    setUploadPreviewUrl,
    setUploadQualityWarning,
    setUseOriginalImage,
    setVideoBusy,
    setVideoCreativeMode,
    setVideoJobStartedAt,
    setVideoNote,
    setVideoPhase,
    setVideoPrompt,
    setVideoPromptPlanNote,
    setVideoSettings,
    setVideoUrl,
    setVisualStyleId,
    setWorkflowMode,
    showAdvancedImage,
    showAdvancedSetup,
    showAdvancedSetupPrompts,
    showAdvancedVideo,
    showVideoReferenceSection,
    slotFilled,
    state,
    stepKey,
    storyboardBrief,
    storyboardPlan,
    storyboardSceneRegenerateBusy,
    storyboardSceneReplaceBusy,
    storyboardScenes,
    storyboardTrimDuration,
    storyboardSceneCount,
    musicMood,
    voiceoverEnabled,
    voiceoverLocale,
    setStoryboardSceneCount,
    setMusicMood,
    setVoiceoverEnabled,
    setVoiceoverLocale,
    subjectFraming,
    subline,
    templateConfig,
    templateId,
    templateSlotStatus,
    tpl,
    trimStoryboardDurations,
    updateCaptionLine,
    updateStoryboardSceneTiming,
    updateStoryboardPlanScene,
    planStoryboard,
    planStoryboardBusy,
    setPlanStoryboardBusy,
    uploadPreviewUrl,
    uploadQualityMessage,
    uploadQualityWarning,
    useMultiAngleVideo,
    useOriginalAsKeyframe,
    useOriginalImage,
    useReferenceVideo,
    usesCompositor,
    usesReferenceConceptForImage,
    usesStyleReference,
    videoBusy,
    videoCreativeMode,
    videoGenerateDisabled,
    videoGenerateDisabledReason,
    videoJobStartedAt,
    videoNote,
    videoPhase,
    videoPreflight,
    videoProgressInfo,
    videoPrompt,
    videoPromptOpts,
    videoPromptPlanNote,
    videoSettings,
    videoStepHint,
    videoUrl,
    visualStyle,
    visualStyleId,
    workflowMode,
  };
}

export type StudioWizardValue = ReturnType<typeof useStudioWizard>;
