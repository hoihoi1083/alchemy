import { useEffect, useState } from "react";
import type { ImagePostflight } from "@/lib/image-postflight";
import type { ImageVisionReview } from "@/lib/image-vision-gate";
import type { ImageUploadWarning } from "@/lib/image-upload-quality";
import type { BgmTrackId } from "@/lib/bgm/tracks";
import type { BrandProfile } from "@/lib/brand-profile";
import type { ProductVideoPlan } from "@/lib/product-video-types";
import type { CampaignPlan } from "@/lib/campaign-types";
import type {
  ImageCreativeMode,
  VideoCreativeMode,
} from "@/lib/creative-workflow";
import {
  DEFAULT_IMAGE_INPUT_MODE,
  type ImageInputMode,
} from "@/lib/image-input-mode";
import {
  defaultImageAspectRatioForWorkflow,
  type ImageAspectRatio,
} from "@/lib/image-aspect-ratio";
import {
  DEFAULT_IMAGE_OUTPUT_MODE,
  type ImageOutputMode,
} from "@/lib/image-output-mode";
import type { ImageTextMode } from "@/lib/image-text-mode";
import type { BrandKit } from "@/lib/brand-kit";
import {
  DEFAULT_BRAND_KIT,
  hydrateBrandKitFromCloud,
  loadBrandKitFromStorage,
} from "@/lib/brand-kit";
import type { PromptMarket, SubjectFraming } from "@/lib/prompts";
import {
  promptMarketFromLocale,
  voiceoverLocaleFromUiLocale,
} from "@/lib/copy-locale";
import type { ReferenceClipId } from "@/lib/reference-clips";
import type { TemplateId } from "@/lib/templates";
import {
  DEFAULT_VIDEO_SETTINGS,
  type VideoSettings,
} from "@/lib/video-settings";
import type { ImageResolutionCap } from "@/lib/billing/entitlements";
import type {
  CinematicReelPlan,
  CinematicSceneResult,
} from "@/lib/cinematic-reel-types";
import type {
  StoryboardSceneResult,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import {
  DEFAULT_VISUAL_STYLE,
  type VisualStyleId,
} from "@/lib/visual-styles";
import { DEFAULT_ART_STYLE, type ArtStyleId } from "@/lib/art-style";
import type { ResearchReelAnalysis } from "@/lib/reel-analysis-types";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";
import type {
  MusicMood,
  StoryboardSceneCount,
  VoiceoverLocale,
} from "@/lib/ad-pack-preferences";
import type { CinematicSceneCount } from "@/lib/cinematic-scene-config";
import type {
  AdPackPlan,
  AiMusicTrack,
  CaptionLine,
  VoicePreviewTrack,
} from "@/lib/ad-pack-types";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import type {
  ContentResearchApplyRef,
  PendingContentResearchPick,
} from "@/lib/content-research-apply";
import type { VideoTimingManifest } from "@/lib/video-timing-manifest";

export type MusicSource = "library" | "ai";

export type PresenterSourceMode = "custom-keyframe" | "stock-avatar";

/** Seedance trim presets plus Kling stitch totals (N × 5s/10s clips). */
export type StoryboardDurationPreset =
  | "4"
  | "6"
  | "8"
  | "10"
  | "12"
  | "15"
  | "20"
  | "25"
  | "30"
  | "35"
  | "40"
  | "45"
  | "50"
  | "55"
  | "60"
  | "90";

export type CampaignSlide = {
  role: string;
  title: string;
  headline: string;
  subline: string;
  imageUrl: string;
};

export type ImageJobMeta = {
  kind: "storyboard" | "cinematic-reel" | "campaign" | "teaching-carousel" | "image";
  startedAt: number;
  sceneCount: number;
};

export type VideoPhase = "video" | "second-frame" | "bgm" | "voiceover" | "captions";

export function useWizardState(locale: "en" | "zh" | "zh-cn" | "zh-tw") {
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("image-only");
  const [stepKey, setStepKey] = useState<WorkflowStepKey>("setup");
  const [visualStyleId, setVisualStyleId] = useState<VisualStyleId>(DEFAULT_VISUAL_STYLE);
  const [artStyleId, setArtStyleId] = useState<ArtStyleId>(DEFAULT_ART_STYLE);
  const [imageCreativeMode, setImageCreativeMode] =
    useState<ImageCreativeMode>("promo-ai");
  const [videoCreativeMode, setVideoCreativeMode] =
    useState<VideoCreativeMode>("image-to-video");
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [selectedReferenceClipId, setSelectedReferenceClipId] =
    useState<ReferenceClipId | null>(null);
  const [referenceClipLoading, setReferenceClipLoading] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId>("product-reel");
  const [product, setProduct] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [business, setBusiness] = useState("");
  const [offer, setOffer] = useState("");
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [showAdvancedSetupPrompts, setShowAdvancedSetupPrompts] = useState(false);
  const [showAdvancedImage, setShowAdvancedImage] = useState(false);
  const [showAdvancedVideo, setShowAdvancedVideo] = useState(false);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackId>("calm");
  const [videoBgmEnabled, setVideoBgmEnabled] = useState(true);
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>(DEFAULT_IMAGE_INPUT_MODE);

  const [promptMarket, setPromptMarket] = useState<PromptMarket>(() =>
    promptMarketFromLocale(locale),
  );
  const [subjectFraming, setSubjectFraming] = useState<SubjectFraming>("auto");
  const [promptExtra, setPromptExtra] = useState("");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [brandSocialHint, setBrandSocialHint] = useState("");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [brandAnalyzeBusy, setBrandAnalyzeBusy] = useState(false);
  const [conceptPlanBusy, setConceptPlanBusy] = useState(false);
  const [brandAnalyzeNote, setBrandAnalyzeNote] = useState<string | null>(null);
  const [creativeVideoBrief, setCreativeVideoBrief] = useState("");
  const [conceptImageVisionNote, setConceptImageVisionNote] = useState("");
  const [userReferenceBrief, setUserReferenceBrief] = useState<UserReferenceBrief | null>(null);
  const [referenceAnalyzeBusy, setReferenceAnalyzeBusy] = useState(false);
  const [referenceAnalyzeNote, setReferenceAnalyzeNote] = useState<string | null>(null);
  const [conceptIdea, setConceptIdea] = useState("");
  const [storyboardBrief, setStoryboardBrief] = useState("");
  const [storyboardPlan, setStoryboardPlan] = useState<VideoStoryboardPlan | null>(null);
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardSceneResult[]>([]);
  const [storyboardGridApproved, setStoryboardGridApproved] = useState(false);
  const [storyboardCellsViewed, setStoryboardCellsViewed] = useState<number[]>([]);
  const [cinematicStitchReel, setCinematicStitchReel] = useState(false);
  const [cinematicSceneCount, setCinematicSceneCount] = useState<CinematicSceneCount>(3);
  const [cinematicReelPlan, setCinematicReelPlan] = useState<CinematicReelPlan | null>(null);
  const [cinematicScenes, setCinematicScenes] = useState<CinematicSceneResult[]>([]);
  const [storyboardTrimDuration, setStoryboardTrimDuration] =
    useState<StoryboardDurationPreset>("8");
  const [storyboardSceneCount, setStoryboardSceneCount] =
    useState<StoryboardSceneCount>("4");
  const [musicMood, setMusicMood] = useState<MusicMood>("auto");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [voiceoverLocale, setVoiceoverLocale] = useState<VoiceoverLocale>(() =>
    voiceoverLocaleFromUiLocale(locale),
  );

  // Website language toggle drives AI output language (and voice locale).
  useEffect(() => {
    setPromptMarket(promptMarketFromLocale(locale));
    setVoiceoverLocale(voiceoverLocaleFromUiLocale(locale));
  }, [locale]);
  const [storyboardSceneReplaceBusy, setStoryboardSceneReplaceBusy] = useState<number | null>(null);
  const [storyboardSceneRegenerateBusy, setStoryboardSceneRegenerateBusy] = useState<number | null>(
    null,
  );
  const [carouselSlideRegenerateBusy, setCarouselSlideRegenerateBusy] = useState<number | null>(
    null,
  );
  const [planVideoPromptBusy, setPlanVideoPromptBusy] = useState(false);
  const [planStoryboardBusy, setPlanStoryboardBusy] = useState(false);
  const [videoPromptPlanNote, setVideoPromptPlanNote] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");

  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [imageRefPhoto, setImageRefPhoto] = useState<File | null>(null);
  const [imageRefPreviewUrl, setImageRefPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageGenKey, setImageGenKey] = useState(0);
  const [lastImageEndpoint, setLastImageEndpoint] = useState<string | null>(null);
  const [imageVariantUrls, setImageVariantUrls] = useState<string[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [imageOutputMode, setImageOutputMode] =
    useState<ImageOutputMode>(DEFAULT_IMAGE_OUTPUT_MODE);
  const [imageResolution, setImageResolution] =
    useState<ImageResolutionCap>("1K");
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>(() =>
    defaultImageAspectRatioForWorkflow("combined"),
  );
  const [campaignTheme, setCampaignTheme] = useState("");
  const [campaignPlan, setCampaignPlan] = useState<CampaignPlan | null>(null);
  const [campaignSlides, setCampaignSlides] = useState<CampaignSlide[]>([]);
  const [uploadQualityWarning, setUploadQualityWarning] = useState<ImageUploadWarning | null>(null);
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const [shipItMode, setShipItMode] = useState(true);
  const [shipItPipelineBusy, setShipItPipelineBusy] = useState(false);
  const [imagePostflight, setImagePostflight] = useState<ImagePostflight | null>(null);
  const [imagePostflightBusy, setImagePostflightBusy] = useState(false);
  const [imageVisionReview, setImageVisionReview] = useState<ImageVisionReview | null>(null);
  const [imageVisionReviewBusy, setImageVisionReviewBusy] = useState(false);
  const [imageQualityChecklist, setImageQualityChecklist] = useState({
    productReadable: false,
    textLegible: false,
  });

  const [referenceAd, setReferenceAd] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [referenceIsVideo, setReferenceIsVideo] = useState(false);
  const [refVideoDurationSec, setRefVideoDurationSec] = useState<number | null>(null);
  const [referenceVideoFalUrl, setReferenceVideoFalUrl] = useState<string | null>(null);
  const [researchReelAnalysis, setResearchReelAnalysis] = useState<ResearchReelAnalysis | null>(
    null,
  );
  const [researchReelAnalyzeBusy, setResearchReelAnalyzeBusy] = useState(false);
  const [researchReelAnalyzeNote, setResearchReelAnalyzeNote] = useState<string | null>(null);

  const [imageBusy, setImageBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPhase, setVideoPhase] = useState<VideoPhase>("video");
  const [imageJobMeta, setImageJobMeta] = useState<ImageJobMeta | null>(null);
  const [videoJobStartedAt, setVideoJobStartedAt] = useState<number | null>(null);
  const [progressNow, setProgressNow] = useState(() => Date.now());
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null);
  const [endFramePhoto, setEndFramePhoto] = useState<File | null>(null);
  const [endFramePreviewUrl, setEndFramePreviewUrl] = useState<string | null>(null);
  const [extraAnglePhotos, setExtraAnglePhotos] = useState<File[]>([]);
  const [packagingPhoto, setPackagingPhoto] = useState<File | null>(null);
  const [packagingPreviewUrl, setPackagingPreviewUrl] = useState<string | null>(null);
  const [sceneFramePhoto, setSceneFramePhoto] = useState<File | null>(null);
  const [sceneFramePreviewUrl, setSceneFramePreviewUrl] = useState<string | null>(null);
  const [sceneFrameUrl, setSceneFrameUrl] = useState<string | null>(null);
  const [sceneFrameBusy, setSceneFrameBusy] = useState(false);
  const [extraKitPhotos, setExtraKitPhotos] = useState<File[]>([]);
  const [extraKitPreviewUrls, setExtraKitPreviewUrls] = useState<string[]>([]);
  const [referenceCarouselSlideCount, setReferenceCarouselSlideCount] = useState(5);
  const [contentResearchApplyRef, setContentResearchApplyRef] =
    useState<ContentResearchApplyRef | null>(null);
  const [pendingContentResearchPick, setPendingContentResearchPick] =
    useState<PendingContentResearchPick | null>(null);
  const [researchRemapBusy, setResearchRemapBusy] = useState(false);
  const [productVideoPlan, setProductVideoPlan] = useState<ProductVideoPlan | null>(null);
  const [planProductVideoBusy, setPlanProductVideoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  /** Video without burned captions — used when opening /captions from Done. */
  const [captionHandoffVideoUrl, setCaptionHandoffVideoUrl] = useState<string | null>(null);
  /** Actual output timing (probed/reported) — optional for handoff to /captions. */
  const [videoTimingManifest, setVideoTimingManifest] = useState<VideoTimingManifest | null>(
    null,
  );
  const [videoNote, setVideoNote] = useState<string | undefined>();
  const [bgmNote, setBgmNote] = useState<string | undefined>();
  const [quickFixCredits, setQuickFixCredits] = useState(0);
  const [quickFixLogoFile, setQuickFixLogoFile] = useState<File | null>(null);
  const [quickFixLogoPreviewUrl, setQuickFixLogoPreviewUrl] = useState<string | null>(null);
  const [quickFixLogoPlacement, setQuickFixLogoPlacement] = useState<
    "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center" | "replace"
  >("bottom-right");
  const [imagePreOverlayUrl, setImagePreOverlayUrl] = useState<string | null>(null);
  const [imageTextMode, setImageTextMode] = useState<ImageTextMode>("integrated");
  const [presenterSourceMode, setPresenterSourceMode] =
    useState<PresenterSourceMode>("custom-keyframe");
  const [presenterAvatarId, setPresenterAvatarId] = useState(
    "Annie Office Sitting Front",
  );
  const [selectedAdPackHookIndex, setSelectedAdPackHookIndex] = useState(0);
  const [brandKit, setBrandKit] = useState<BrandKit>(() =>
    typeof window !== "undefined" ? loadBrandKitFromStorage() : DEFAULT_BRAND_KIT,
  );

  useEffect(() => {
    let cancelled = false;
    void hydrateBrandKitFromCloud().then((kit) => {
      if (!cancelled) setBrandKit(kit);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [adPackPlan, setAdPackPlan] = useState<AdPackPlan | null>(null);
  const [adPackPlanBusy, setAdPackPlanBusy] = useState(false);
  const [adPackReviewOpen, setAdPackReviewOpen] = useState(false);
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>([]);
  const [captionBurnEnabled, setCaptionBurnEnabled] = useState(false);
  const [musicSource, setMusicSource] = useState<MusicSource>("library");
  const [aiMusicTracks, setAiMusicTracks] = useState<AiMusicTrack[]>([]);
  const [selectedAiMusicId, setSelectedAiMusicId] = useState<string | null>(null);
  const [musicGenerateBusy, setMusicGenerateBusy] = useState(false);
  const [voicePreviewTracks, setVoicePreviewTracks] = useState<VoicePreviewTrack[]>([]);
  const [selectedVoicePreviewId, setSelectedVoicePreviewId] = useState<string | null>(null);
  const [voicePreviewBusy, setVoicePreviewBusy] = useState(false);

  return {
    workflowMode,
    setWorkflowMode,
    stepKey,
    setStepKey,
    visualStyleId,
    setVisualStyleId,
    artStyleId,
    setArtStyleId,
    imageCreativeMode,
    setImageCreativeMode,
    videoCreativeMode,
    setVideoCreativeMode,
    videoSettings,
    setVideoSettings,
    selectedReferenceClipId,
    setSelectedReferenceClipId,
    referenceClipLoading,
    setReferenceClipLoading,
    templateId,
    setTemplateId,
    product,
    setProduct,
    headline,
    setHeadline,
    subline,
    setSubline,
    business,
    setBusiness,
    offer,
    setOffer,
    showAdvancedSetup,
    setShowAdvancedSetup,
    showAdvancedSetupPrompts,
    setShowAdvancedSetupPrompts,
    showAdvancedImage,
    setShowAdvancedImage,
    showAdvancedVideo,
    setShowAdvancedVideo,
    bgmTrack,
    setBgmTrack,
    videoBgmEnabled,
    setVideoBgmEnabled,
    imageInputMode,
    setImageInputMode,
    promptMarket,
    setPromptMarket,
    subjectFraming,
    setSubjectFraming,
    promptExtra,
    setPromptExtra,
    brandWebsiteUrl,
    setBrandWebsiteUrl,
    brandSocialHint,
    setBrandSocialHint,
    brandProfile,
    setBrandProfile,
    brandAnalyzeBusy,
    setBrandAnalyzeBusy,
    conceptPlanBusy,
    setConceptPlanBusy,
    brandAnalyzeNote,
    setBrandAnalyzeNote,
    creativeVideoBrief,
    setCreativeVideoBrief,
    conceptImageVisionNote,
    setConceptImageVisionNote,
    userReferenceBrief,
    setUserReferenceBrief,
    referenceAnalyzeBusy,
    setReferenceAnalyzeBusy,
    referenceAnalyzeNote,
    setReferenceAnalyzeNote,
    conceptIdea,
    setConceptIdea,
    storyboardBrief,
    setStoryboardBrief,
    storyboardPlan,
    setStoryboardPlan,
    storyboardScenes,
    setStoryboardScenes,
    storyboardGridApproved,
    setStoryboardGridApproved,
    storyboardCellsViewed,
    setStoryboardCellsViewed,
    cinematicStitchReel,
    setCinematicStitchReel,
    cinematicSceneCount,
    setCinematicSceneCount,
    cinematicReelPlan,
    setCinematicReelPlan,
    cinematicScenes,
    setCinematicScenes,
    storyboardTrimDuration,
    setStoryboardTrimDuration,
    storyboardSceneCount,
    setStoryboardSceneCount,
    musicMood,
    setMusicMood,
    voiceoverEnabled,
    setVoiceoverEnabled,
    voiceoverLocale,
    setVoiceoverLocale,
    storyboardSceneReplaceBusy,
    setStoryboardSceneReplaceBusy,
    storyboardSceneRegenerateBusy,
    setStoryboardSceneRegenerateBusy,
    carouselSlideRegenerateBusy,
    setCarouselSlideRegenerateBusy,
    planVideoPromptBusy,
    setPlanVideoPromptBusy,
    planStoryboardBusy,
    setPlanStoryboardBusy,
    videoPromptPlanNote,
    setVideoPromptPlanNote,
    imagePrompt,
    setImagePrompt,
    videoPrompt,
    setVideoPrompt,
    negativePrompt,
    setNegativePrompt,
    productPhoto,
    setProductPhoto,
    uploadPreviewUrl,
    setUploadPreviewUrl,
    imageRefPhoto,
    setImageRefPhoto,
    imageRefPreviewUrl,
    setImageRefPreviewUrl,
    imageUrl,
    setImageUrl,
    imageGenKey,
    setImageGenKey,
    lastImageEndpoint,
    setLastImageEndpoint,
    imageVariantUrls,
    setImageVariantUrls,
    selectedVariantIndex,
    setSelectedVariantIndex,
    imageOutputMode,
    setImageOutputMode,
    imageResolution,
    setImageResolution,
    imageAspectRatio,
    setImageAspectRatio,
    campaignTheme,
    setCampaignTheme,
    campaignPlan,
    setCampaignPlan,
    campaignSlides,
    setCampaignSlides,
    uploadQualityWarning,
    setUploadQualityWarning,
    useOriginalImage,
    setUseOriginalImage,
    shipItMode,
    setShipItMode,
    shipItPipelineBusy,
    setShipItPipelineBusy,
    imagePostflight,
    setImagePostflight,
    imagePostflightBusy,
    setImagePostflightBusy,
    imageVisionReview,
    setImageVisionReview,
    imageVisionReviewBusy,
    setImageVisionReviewBusy,
    imageQualityChecklist,
    setImageQualityChecklist,
    referenceAd,
    setReferenceAd,
    referencePreviewUrl,
    setReferencePreviewUrl,
    referenceIsVideo,
    setReferenceIsVideo,
    refVideoDurationSec,
    setRefVideoDurationSec,
    referenceVideoFalUrl,
    setReferenceVideoFalUrl,
    researchReelAnalysis,
    setResearchReelAnalysis,
    researchReelAnalyzeBusy,
    setResearchReelAnalyzeBusy,
    researchReelAnalyzeNote,
    setResearchReelAnalyzeNote,
    imageBusy,
    setImageBusy,
    videoBusy,
    setVideoBusy,
    videoPhase,
    setVideoPhase,
    imageJobMeta,
    setImageJobMeta,
    videoJobStartedAt,
    setVideoJobStartedAt,
    progressNow,
    setProgressNow,
    endFrameUrl,
    setEndFrameUrl,
    endFramePhoto,
    setEndFramePhoto,
    endFramePreviewUrl,
    setEndFramePreviewUrl,
    extraAnglePhotos,
    setExtraAnglePhotos,
    packagingPhoto,
    setPackagingPhoto,
    packagingPreviewUrl,
    setPackagingPreviewUrl,
    sceneFramePhoto,
    setSceneFramePhoto,
    sceneFramePreviewUrl,
    setSceneFramePreviewUrl,
    sceneFrameUrl,
    setSceneFrameUrl,
    sceneFrameBusy,
    setSceneFrameBusy,
    extraKitPhotos,
    setExtraKitPhotos,
    extraKitPreviewUrls,
    setExtraKitPreviewUrls,
    referenceCarouselSlideCount,
    setReferenceCarouselSlideCount,
    contentResearchApplyRef,
    setContentResearchApplyRef,
    pendingContentResearchPick,
    setPendingContentResearchPick,
    researchRemapBusy,
    setResearchRemapBusy,
    productVideoPlan,
    setProductVideoPlan,
    planProductVideoBusy,
    setPlanProductVideoBusy,
    error,
    setError,
    videoUrl,
    setVideoUrl,
    captionHandoffVideoUrl,
    setCaptionHandoffVideoUrl,
    videoTimingManifest,
    setVideoTimingManifest,
    videoNote,
    setVideoNote,
    bgmNote,
    setBgmNote,
    quickFixCredits,
    setQuickFixCredits,
    quickFixLogoFile,
    setQuickFixLogoFile,
    quickFixLogoPreviewUrl,
    setQuickFixLogoPreviewUrl,
    quickFixLogoPlacement,
    setQuickFixLogoPlacement,
    imagePreOverlayUrl,
    setImagePreOverlayUrl,
    imageTextMode,
    setImageTextMode,
    presenterSourceMode,
    setPresenterSourceMode,
    presenterAvatarId,
    setPresenterAvatarId,
    selectedAdPackHookIndex,
    setSelectedAdPackHookIndex,
    brandKit,
    setBrandKit,
    adPackPlan,
    setAdPackPlan,
    adPackPlanBusy,
    setAdPackPlanBusy,
    adPackReviewOpen,
    setAdPackReviewOpen,
    captionLines,
    setCaptionLines,
    captionBurnEnabled,
    setCaptionBurnEnabled,
    musicSource,
    setMusicSource,
    aiMusicTracks,
    setAiMusicTracks,
    selectedAiMusicId,
    setSelectedAiMusicId,
    musicGenerateBusy,
    setMusicGenerateBusy,
    voicePreviewTracks,
    setVoicePreviewTracks,
    selectedVoicePreviewId,
    setSelectedVoicePreviewId,
    voicePreviewBusy,
    setVoicePreviewBusy,
  };
}

export type WizardState = ReturnType<typeof useWizardState>;
