"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { applyStudioAssistantHandoff } from "@/lib/studio-assistant-apply-handoff";
import {
	clearStudioAssistantHandoff,
	readStudioAssistantHandoff,
} from "@/lib/studio-assistant-handoff";
import { readStudioDoneResume } from "@/lib/studio-done-resume";
import {
	isTemplateId,
	TEMPLATE_PREF_KEY,
	visualStyleForTemplate,
} from "@/lib/template-pref";
import { useFriendlyError } from "@/hooks/useFriendlyError";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import {
	notifyCreditBalance,
	readCreditBalanceFromResponse,
} from "@/lib/credits-client";
import {
	estimateH3Tokens,
	estimateImageRegenTokens,
	estimateInpaintTokens,
	estimateKlingStoryboardTokens,
	estimateSocialDripTokens,
	h3BillingResolutionForPlan,
	TOKEN_COST,
	videoTokenCost,
} from "@/lib/billing/token-costs";
import {
	cannotAfford,
	estimateImageJobTokens,
	estimateVideoPipelineTokens,
	insufficientTokensMessage,
} from "@/lib/billing/estimate-job-tokens";
import { wizardVideoReadyExtraNote } from "@/lib/video-output-presentation";
import { klingClipDurationForStoryboard } from "@/lib/kling-storyboard-fallback";
import {
  useWizardState,
  type StoryboardDurationPreset,
} from "@/hooks/useWizardState";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { useWizardProgress } from "@/hooks/useWizardProgress";
import {
	allStoryboardCellsViewed,
	retainStoryboardCellViewed,
} from "@/lib/storyboard-cell-review";
import { apiGetBlob, parseStudioApiJson } from "@/lib/api/studio-api";
import {
	trackGenerateFailed,
	trackGenerateStarted,
	trackGenerateSuccess,
} from "@/lib/analytics";
import {
	promptMarketFromLocale,
	voiceoverLocaleFromUiLocale,
} from "@/lib/copy-locale";
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
	isRecipeOwnedVideoMode,
	recipeUsesSilentSeedance,
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
	buildMotionPosterStillPrompt,
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
import type {
	CinematicReelPlan,
	CinematicSceneResult,
} from "@/lib/cinematic-reel-types";
import {
	createPromptSnapshot,
	savePromptSnapshot,
} from "@/lib/prompt-snapshots";
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
import { capUiVideoResolution, imageCapForPlan } from "@/lib/billing/entitlements";
import {
	physicalVideoOnlyNeedsUploadedPhoto,
	resolveVideoGenerationKind,
	storyboardBlocksRecipeVideo,
} from "@/lib/video-generation-path";
import {
	buildMotionPosterPrompt,
	resolveMotionPosterPromptIdentity,
} from "@/lib/shot-recipes";
import {
	MOTION_POSTER_DIALECTS,
	resolveMotionPosterDialect,
	type MotionPosterDialectId,
	type MotionPosterDialectPick,
} from "@/lib/motion-poster-dialects";
import {
	SOCIAL_DRIP_METAPHOR_IDS,
	SOCIAL_DRIP_IG_CAPTION_MAX,
	applySocialDripUserControls,
	buildSocialDripVideoPrompt,
	heuristicSocialDripPlan,
	normalizeSocialDripPlan,
	parseSocialDripMetaphorPick,
	parseSocialDripPourAmount,
	parseSocialDripPourOrigin,
	sanitizeSocialDripIgHandle,
	type SocialDripMetaphorPick,
	type SocialDripPlan,
	type SocialDripPourAmount,
	type SocialDripPourOrigin,
} from "@/lib/social-drip";
import {
	VACUUM_INFLATE_DURATION_SEC,
	buildVacuumInflateVideoPrompt,
} from "@/lib/vacuum-inflate";
import {
	HAND_THROW_SCENE_DURATION_SEC,
	buildHandThrowSceneVideoPrompt,
} from "@/lib/hand-throw-scene";
import {
	WEB_BOUNDARY_BREAK_DURATION_SEC,
	WEB_BOUNDARY_BREAK_MOTION_STRENGTH,
	WEB_BOUNDARY_BREAK_NEGATIVE,
	buildWebBoundaryBreakVideoPrompt,
	clampWebBoundaryBreakDurationSec,
	parseWebBoundaryBreakSchemePick,
	resolveWebBoundaryBreakScheme,
	webBoundaryBreakUsesSinglePlate,
	type WebBoundaryBreakSchemeId,
	type WebBoundaryBreakSchemePick,
} from "@/lib/web-boundary-break";
import {
	PRODUCT_EXPLODE_DURATION_SEC,
	buildProductExplodeVideoPrompt,
} from "@/lib/product-explode";
import {
	BULLET_PRODUCT_ELEVATE_DURATION_SEC,
	buildBulletProductElevateVideoPrompt,
	clampBulletProductElevateDurationSec,
} from "@/lib/bullet-product-elevate";
import {
	CREATIVE_MOTION_DURATION_SEC,
	buildCreativeMotionVideoPrompt,
	parseCreativeMotionSchemePick,
	resolveCreativeMotionScheme,
	type CreativeMotionSchemeId,
	type CreativeMotionSchemePick,
} from "@/lib/creative-motion";
import {
	IMPACT_POSTER_DURATION_SEC,
	buildImpactPosterVideoPrompt,
	impactPosterMotionStrength,
	parseImpactPosterEffectPick,
	parseImpactPosterTonePick,
	resolveImpactPosterEffect,
	resolveImpactPosterTone,
	type ImpactPosterEffectId,
	type ImpactPosterEffectPick,
	type ImpactPosterToneId,
	type ImpactPosterTonePick,
} from "@/lib/impact-poster";
import {
	consumeLandingRecipe,
	isBlockbusterLandingRecipe,
	isH3ShotLandingRecipe,
	isImagePosterLandingRecipe,
	isMotionPosterLandingRecipe,
	isTvcLandingRecipe,
	LANDING_RECIPES,
	type LandingRecipeId,
} from "@/lib/landing-recipes";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import {
	ACTIVE_PROJECT_STORAGE_KEY,
	campaignSlidesFromSnapshot,
	fileFromPersistableUrl,
	persistableMediaUrl,
	storyboardScenesFromSnapshot,
} from "@/lib/wizard-project-snapshot";
import {
	BLOCKBUSTER_DURATION_SEC,
	BLOCKBUSTER_NEGATIVE,
	buildBlockbusterSceneStillPrompt,
	buildBlockbusterVideoPrompt,
	defaultBlockbusterCaptionText,
	isBlockbusterElevatedBridgeCamera,
	orderedBlockbusterRefFiles,
	parseBlockbusterCamera,
	parseBlockbusterTiming,
	type BlockbusterCameraId,
	type BlockbusterCaptionLang,
	type BlockbusterTimingId,
} from "@/lib/blockbuster-ad-recipe";
import {
	buildH3ShotRecipePrompt,
	buildH3ShotRecipeStillPrompt,
	H3_SHOT_RECIPE_DURATION_SEC,
	H3_SHOT_RECIPE_NEGATIVE,
	H3_SHOT_RECIPE_SETTINGS_DURATION,
	DEFAULT_MACRO_SNAP_INTENSITY,
	DEFAULT_FOOD_BULLET_ARC,
	DEFAULT_H3_SHOWREEL_ASPECT,
	foodBulletDurationSec,
	h3ShotRecipeAcceptsReel,
	h3ShotRecipeAllowsKineticType,
	h3ShotRecipeNeedsLifestyleStill,
	h3ShotRecipeNeedsReel,
	isH3ShotRecipeMode,
	parseH3ShowreelAspect,
	parseH3ShowreelSchemePick,
	parseH3SphereMgSchemePick,
	parseH3LogoMgSchemePick,
	parseH3TriangleLightMgSchemePick,
	parseH3GlassTypeMgSchemePick,
	parseH3DesignStudioMgSchemePick,
	resolveH3ShotStillAspectRatio,
	resolveH3ShowreelScheme,
	resolveH3SphereMgScheme,
	resolveH3LogoMgScheme,
	resolveH3TriangleLightMgScheme,
	resolveH3GlassTypeMgScheme,
	resolveH3DesignStudioMgScheme,
	clampTriangleLightMgDurationSec,
	clampGlassTypeMgDurationSec,
	clampDesignStudioMgDurationSec,
	type FoodBulletArc,
	type H3ShotRecipeMode,
	type H3ShowreelAspect,
	type H3ShowreelSchemePick,
	type H3SphereMgSchemePick,
	type H3LogoMgSchemePick,
	type H3TriangleLightMgSchemePick,
	type H3GlassTypeMgSchemePick,
	type H3DesignStudioMgSchemePick,
	type MacroSnapIntensity,
	H3_SHOWREEL_NEGATIVE,
	H3_MOVIE_TITLE_NEGATIVE,
	H3_LOGO_MG_NEGATIVE,
	H3_TRIANGLE_LIGHT_MG_NEGATIVE,
	H3_GLASS_TYPE_MG_NEGATIVE,
	H3_DESIGN_STUDIO_MG_NEGATIVE,
} from "@/lib/h3-shot-recipes";
import { h3ShotRecipeInputsReady, identityRecipeHeroReady, isIdentityVideoRecipeMode } from "@/lib/recipe-path-ux";
import {
	STORYBOARD_RECIPES,
	coerceLuxuryBirthSceneCount,
	coerceFourOrSixSceneCount,
	effectiveStoryboardSceneCount,
	fourOrSixDurationForSceneCount,
	isFourOrSixCoupledRecipe,
	isBrandWarpRecipe,
	isLuxuryBirthRecipe,
	luxuryBirthDurationForSceneCount,
	resolveStoryboardRecipeId,
	storyboardRecipeForbidsReference,
	type StoryboardRecipeId,
} from "@/lib/storyboard-recipes";
import {
	appendCompositionToExtra,
	type CompositionPresetId,
} from "@/lib/composition-presets";
import { resolvePlannerDurationSec } from "@/lib/video-duration-planner";
import {
  DEFAULT_VISUAL_STYLE,
  getVisualStyle,
  isAiPlannedVideoStyle,
  isBrandVideoStyle,
  isCreativeVideoStyle,
  isBrandVisualStyle,
  isCampaignVisualStyle,
	isLockedSinglePosterStyle,
  isStoryboardVideoStyle,
	isUgcPresenterStyle,
  isConceptCinematicStyle,
  isExplosionUnboxStyle,
  isVisualStyleAllowedForWorkflow,
  mergePromptExtra,
  visualStylePromptHint,
  type VisualStyleId,
} from "@/lib/visual-styles";
import {
  extractExplosionUnboxTheme,
  prefillExplosionUnboxFields,
} from "@/lib/explosion-unbox-prompt";
import {
  getTemplateConfig,
  isSlotRequired,
  templateHasSlot,
  type TemplateSlotId,
} from "@/lib/template-slots";
import { getTemplate, type TemplateId } from "@/lib/templates";
import {
	BANANA2_EDIT_ENDPOINT,
	BANANA2_TEXT_ENDPOINT,
} from "@/lib/image-endpoints";
import { loadBrandKitFromStorage, preferNewerBrandKit } from "@/lib/brand-kit";
import {
	buildImageRefinePrompt,
	normalizeImageSourceUrl,
	type LogoPlacement,
} from "@/lib/image-refine-prompt";
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
import { buildH3ReferenceReelProductPrompt } from "@/lib/h3-product-swap-prompt";
import { wizardPromoteName } from "@/lib/wizard-promote-name";
import {
	evaluateProceedToImageGate,
	type SetupImageGateReason,
} from "@/lib/wizard-setup-gate";
import { layoutHookSplitCaptions } from "@/lib/ad-pack-hook-captions";
import { captionLinesFromStoryboardScenes } from "@/lib/storyboard-captions";
import {
	buildManifestFromClipDurations,
	buildSingleClipManifest,
} from "@/lib/video-timing-manifest";
import {
	isFaceHeavyVideoJob,
	klingStitchCanHitDuration,
	resolveVideoEnginePlan,
	stripReferenceVideoTags,
} from "@/lib/video-engine-router";
import {
	evaluateStoryboardVideoAffordability,
	StoryboardEngineChoiceError,
	STORYBOARD_ENGINE_CHOICE_CODE,
	type StoryboardEnginePrefer,
} from "@/lib/video-affordability";
import type { StoryboardEngineChoice } from "@/components/studio/StoryboardEngineChoiceDialog";
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
	USER_REFERENCE_COMPOSITION_REMAP_MARKER,
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
	brandKitForGeneration,
	brandKitWantsLogo,
	effectiveBrandHeadline,
	mergeBrandProfileIntoKit,
	seedBrandCanvasLayers,
} from "@/lib/brand-merge";
import {
	analyzeImageUrl,
  analyzeProductImageFile,
  type ImageUploadWarning,
} from "@/lib/image-upload-quality";
import {
	regionsInpaintPrompt,
	regionsToInpaintMaskBlob,
} from "@/lib/regions-to-inpaint-mask";
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
import {
	brandProfilePromptBlock,
	type BrandProfile,
} from "@/lib/brand-profile";
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
	legacyImageOutputModeToCarousel,
	resolveEffectiveImageOutputMode,
} from "@/lib/carousel-output";
import {
  defaultImageAspectRatioForWorkflow,
  type ImageAspectRatio,
} from "@/lib/image-aspect-ratio";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";
import type { CampaignSlide } from "@/hooks/useWizardState";
import type {
	AdPackPlan,
	AiMusicTrack,
	CaptionLine,
	VoicePreviewTrack,
} from "@/lib/ad-pack-types";
import {
	appendArtStyleSeedanceHintIfNeeded,
	DEFAULT_ART_STYLE,
	isVideoSafeArtStyle,
} from "@/lib/art-style";
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
	studioHref,
} from "@/lib/promotion-mode";

const EDIT_ENDPOINT = BANANA2_EDIT_ENDPOINT;
const TEXT_ENDPOINT = BANANA2_TEXT_ENDPOINT;

export function useStudioWizard(promotionMode: PromotionMode) {
  const { m, locale } = useLocale();
  const friendlyError = useFriendlyError(m);
	const { creditBalance, plan, planReady } = useUserPlanEntitlements();

	/** Client preflight: block before any fal call when balance is known and too low. */
	function blockIfCannotAfford(required: number): boolean {
		if (!cannotAfford(creditBalance, required)) return false;
		setError(
			insufficientTokensMessage(required, creditBalance as number),
		);
		return true;
	}

	function storyboardImagePassesPerScene(): number {
		return Boolean(brandKit?.useBrandLogo && brandKit?.logoUrl?.trim())
			? 2
			: 1;
	}

	async function readGenerateJson(
		res: Response,
	): Promise<Record<string, unknown>> {
		const data = await parseStudioApiJson(res);
		if (data.code === "TIMEOUT") {
			return { ...data, error: m.errors.timeout };
		}
		if (data.code === "REQUEST_TOO_LARGE") {
			return { ...data, error: m.errors.requestTooLarge };
		}
		return data;
	}

	const capVideoRes = useCallback(
		(requested: VideoSettings["resolution"] | "720p" | "1080p" | "480p") =>
			capUiVideoResolution(plan, requested),
		[plan],
	);
	const [storyboardEngineChoice, setStoryboardEngineChoice] =
		useState<StoryboardEngineChoice | null>(null);
	const storyboardPreferEngineRef = useRef<StoryboardEnginePrefer>(null);
  const state = useWizardState(locale);
  const {
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
		preferCompositionRemap,
		setPreferCompositionRemap,
		compositionRemapKeepHero,
		setCompositionRemapKeepHero,
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
		carouselIntent,
		setCarouselIntent,
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
		referenceResearchCdnUrl,
		setReferenceResearchCdnUrl,
		referenceResearchPlatform,
		setReferenceResearchPlatform,
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
		planStoryboardBusy,
		setPlanStoryboardBusy,
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
  } = state;

	const hasProductPhotoLock = Boolean(
		productPhoto || persistableMediaUrl(uploadPreviewUrl),
	);
	const hasConceptHeroLock = Boolean(
		hasProductPhotoLock ||
			imageUrl ||
			brandKit.logoUrl?.trim() ||
			packagingPhoto,
	);

  const promotionInitRef = useRef(false);
	const lastStoryboardVideoDurationSecRef = useRef<number | null>(null);
	const lastVideoTimingManifestRef = useRef<
		import("@/lib/video-timing-manifest").VideoTimingManifest | null
	>(null);
	/** Mode B: Nano Banana already integrated brand logo into cinematic stills. */
	const cinematicLogoIntegratedRef = useRef(false);
	const imageUrlRef = useRef<string | null>(imageUrl);
	useEffect(() => {
		imageUrlRef.current = imageUrl;
	}, [imageUrl]);
	useEffect(() => {
		if (!planReady) return;
		setVideoSettings((prev) => {
			const next = capVideoRes(prev.resolution);
			if (next === prev.resolution) return prev;
			return { ...prev, resolution: next };
		});
	}, [capVideoRes, planReady, setVideoSettings]);
	useEffect(() => {
		if (!planReady) return;
		setImageResolution((prev) => {
			const max = imageCapForPlan(plan);
			const next = max === "4K" ? "2K" : max;
			// Keep lower selection if still allowed
			if (prev === "1K") return prev;
			if (prev === "2K" && (max === "2K" || max === "4K")) return prev;
			return next;
		});
	}, [plan, planReady, setImageResolution]);
	/** Designed 動態海報 still only — never treat a leftover packshot / raw upload as the H3 start. */
	const motionPosterStillUrlRef = useRef<string | null>(null);
	const motionPosterEndUrlRef = useRef<string | null>(null);
	const lastMotionPosterDialectRef = useRef<MotionPosterDialectId | null>(
		null,
	);
	const [motionPosterDialectPick, setMotionPosterDialectPickState] =
		useState<MotionPosterDialectPick>("auto");
	const [macroSnapIntensity, setMacroSnapIntensity] =
		useState<MacroSnapIntensity>(DEFAULT_MACRO_SNAP_INTENSITY);
	const [foodBulletArc, setFoodBulletArcState] =
		useState<FoodBulletArc>(DEFAULT_FOOD_BULLET_ARC);
	function setFoodBulletArc(next: FoodBulletArc) {
		setFoodBulletArcState(next);
		setVideoSettings((s: VideoSettings) => ({
			...s,
			duration: String(foodBulletDurationSec(next)) as VideoSettings["duration"],
		}));
	}
	const [h3ShowreelAspect, setH3ShowreelAspect] =
		useState<H3ShowreelAspect>(DEFAULT_H3_SHOWREEL_ASPECT);
	const [h3ShowreelSchemePick, setH3ShowreelSchemePick] =
		useState<H3ShowreelSchemePick>("auto");
	const [h3SphereMgSchemePick, setH3SphereMgSchemePick] =
		useState<H3SphereMgSchemePick>("auto");
	const [h3LogoMgSchemePick, setH3LogoMgSchemePick] =
		useState<H3LogoMgSchemePick>("auto");
	const [h3TriangleLightMgSchemePick, setH3TriangleLightMgSchemePick] =
		useState<H3TriangleLightMgSchemePick>("auto");
	const [h3GlassTypeMgSchemePick, setH3GlassTypeMgSchemePick] =
		useState<H3GlassTypeMgSchemePick>("auto");
	const [h3DesignStudioMgSchemePick, setH3DesignStudioMgSchemePick] =
		useState<H3DesignStudioMgSchemePick>("auto");
	const socialDripStillUrlRef = useRef<string | null>(null);
	const socialDripEndUrlRef = useRef<string | null>(null);
	const socialDripPlanRef = useRef<SocialDripPlan | null>(null);
	const [socialDripMetaphorPick, setSocialDripMetaphorPickState] =
		useState<SocialDripMetaphorPick>("auto");
	const [socialDripPlanNote, setSocialDripPlanNote] = useState<string | null>(
		null,
	);
	const [socialDripIgHandle, setSocialDripIgHandleState] = useState("");
	const [socialDripIgCaption, setSocialDripIgCaptionState] = useState("");
	const [socialDripPourOrigin, setSocialDripPourOriginState] =
		useState<SocialDripPourOrigin>("overflow");
	const [socialDripPourAmount, setSocialDripPourAmountState] =
		useState<SocialDripPourAmount>("medium");
	const [blockbusterTiming, setBlockbusterTiming] =
		useState<BlockbusterTimingId>("early-reveal");
	const [blockbusterCamera, setBlockbusterCameraState] =
		useState<BlockbusterCameraId>("behind-truck");
	function setBlockbusterCamera(next: BlockbusterCameraId) {
		if (next === blockbusterCamera) return;
		setBlockbusterCameraState(next);
		// Views need different first frames — drop the old plate on switch.
		setSceneFramePhoto(null);
		setSceneFrameUrl(null);
		setSceneFramePreviewUrl(null);
	}
	const [blockbusterCaptionLang, setBlockbusterCaptionLang] =
		useState<BlockbusterCaptionLang>("en");
	const [blockbusterCaptionText, setBlockbusterCaptionText] = useState(
		() => defaultBlockbusterCaptionText("en"),
	);
	const [blockbusterBurnCaptions, setBlockbusterBurnCaptions] = useState(false);
	/** Opt-in: Brand kit logo printed on flying boxes when Packaging is empty. */
	const [blockbusterEndLogo, setBlockbusterEndLogo] = useState(false);
	const [blockbusterHeroHold, setBlockbusterHeroHold] = useState(true);

	function setBlockbusterCaptionLangAndPreset(lang: BlockbusterCaptionLang) {
		setBlockbusterCaptionLang(lang);
		setBlockbusterCaptionText(defaultBlockbusterCaptionText(lang));
	}

	function setSocialDripIgHandle(next: string) {
		setSocialDripIgHandleState(sanitizeSocialDripIgHandle(next));
		socialDripPlanRef.current = null;
		setSocialDripPlanNote(null);
	}
	function setSocialDripIgCaption(next: string) {
		setSocialDripIgCaptionState(
			next.slice(0, SOCIAL_DRIP_IG_CAPTION_MAX),
		);
		socialDripPlanRef.current = null;
		setSocialDripPlanNote(null);
	}
	function setSocialDripPourOrigin(next: SocialDripPourOrigin) {
		setSocialDripPourOriginState(parseSocialDripPourOrigin(next));
		socialDripStillUrlRef.current = null;
		socialDripEndUrlRef.current = null;
		socialDripPlanRef.current = null;
		setSocialDripPlanNote(null);
	}
	function setSocialDripPourAmount(next: SocialDripPourAmount) {
		setSocialDripPourAmountState(parseSocialDripPourAmount(next));
		socialDripStillUrlRef.current = null;
		socialDripEndUrlRef.current = null;
		socialDripPlanRef.current = null;
		setSocialDripPlanNote(null);
	}
	const vacuumInflateStillUrlRef = useRef<string | null>(null);
	const vacuumInflateEndUrlRef = useRef<string | null>(null);
	const creativeMotionStillUrlRef = useRef<string | null>(null);
	const creativeMotionEndUrlRef = useRef<string | null>(null);
	const handThrowStillUrlRef = useRef<string | null>(null);
	const handThrowEndUrlRef = useRef<string | null>(null);
	const webBoundaryStillUrlRef = useRef<string | null>(null);
	const webBoundaryEndUrlRef = useRef<string | null>(null);
	const lastWebBoundarySchemeRef = useRef<WebBoundaryBreakSchemeId | null>(
		null,
	);
	const [webBoundarySchemePick, setWebBoundarySchemePickState] =
		useState<WebBoundaryBreakSchemePick>("auto");
	function setWebBoundarySchemePick(next: WebBoundaryBreakSchemePick) {
		setWebBoundarySchemePickState(parseWebBoundaryBreakSchemePick(next));
	}
	const productExplodeStillUrlRef = useRef<string | null>(null);
	const productExplodeEndUrlRef = useRef<string | null>(null);
	const bulletElevateStillUrlRef = useRef<string | null>(null);
	const bulletElevateEndUrlRef = useRef<string | null>(null);
	const lastCreativeMotionSchemeRef = useRef<CreativeMotionSchemeId | null>(
		null,
	);
	const [creativeMotionSchemePick, setCreativeMotionSchemePickState] =
		useState<CreativeMotionSchemePick>("auto");
	const impactPosterStillUrlRef = useRef<string | null>(null);
	const impactPosterEndUrlRef = useRef<string | null>(null);
	const lastImpactPosterEffectRef = useRef<ImpactPosterEffectId | null>(null);
	const [impactPosterTonePick, setImpactPosterTonePickState] =
		useState<ImpactPosterTonePick>("auto");
	const [impactPosterEffectPick, setImpactPosterEffectPickState] =
		useState<ImpactPosterEffectPick>("auto");
	const [storyboardRecipeId, setStoryboardRecipeIdState] =
		useState<StoryboardRecipeId>("classic-tvc");
	const [compositionPresetId, setCompositionPresetId] =
		useState<CompositionPresetId>("standard");

	function setStoryboardRecipeId(next: StoryboardRecipeId) {
		const id = resolveStoryboardRecipeId(next);
		setStoryboardRecipeIdState(id);
		const def = STORYBOARD_RECIPES[id];
		if (isLuxuryBirthRecipe(id)) {
			const currentCount = storyboardSceneCount === "3" ? "3" : "5";
			setStoryboardSceneCount(currentCount);
			// Auto-couple duration to scene count
			setStoryboardTrimDuration(
				String(luxuryBirthDurationForSceneCount(currentCount)) as typeof storyboardTrimDuration,
			);
			onReferenceAdFile(null);
			return;
		}
		if (isFourOrSixCoupledRecipe(id)) {
			const currentCount = isBrandWarpRecipe(id)
				? storyboardSceneCount === "6"
					? "6"
					: "4"
				: storyboardSceneCount === "4"
					? "4"
					: "6";
			setStoryboardSceneCount(currentCount);
			setStoryboardTrimDuration(
				String(
					fourOrSixDurationForSceneCount(currentCount),
				) as typeof storyboardTrimDuration,
			);
			return;
		}
		if (storyboardRecipeForbidsReference(id)) {
			onReferenceAdFile(null);
		}
		void def;
	}

	/** Wrapper used by UI — auto-couples duration when Luxury birth / Premium punch is active. */
	function setLuxuryAwareSceneCount(next: StoryboardSceneCount) {
		setStoryboardSceneCount(next);
		if (isLuxuryBirthRecipe(storyboardRecipeId)) {
			const coerced = coerceLuxuryBirthSceneCount(next);
			setStoryboardTrimDuration(
				String(luxuryBirthDurationForSceneCount(coerced)) as typeof storyboardTrimDuration,
			);
		} else if (isFourOrSixCoupledRecipe(storyboardRecipeId)) {
			const coerced = isBrandWarpRecipe(storyboardRecipeId)
				? next === "6"
					? "6"
					: "4"
				: coerceFourOrSixSceneCount(next);
			setStoryboardTrimDuration(
				String(fourOrSixDurationForSceneCount(coerced)) as typeof storyboardTrimDuration,
			);
		}
	}

	function setMotionPosterDialectPick(next: MotionPosterDialectPick) {
		setMotionPosterDialectPickState((prev) => {
			if (prev !== next) {
				motionPosterStillUrlRef.current = null;
				motionPosterEndUrlRef.current = null;
			}
			return next;
		});
	}

	function setSocialDripMetaphorPick(next: SocialDripMetaphorPick) {
		setSocialDripMetaphorPickState((prev) => {
			if (prev !== next) {
				socialDripStillUrlRef.current = null;
				socialDripEndUrlRef.current = null;
				socialDripPlanRef.current = null;
				setSocialDripPlanNote(null);
			}
			return next;
		});
	}

	function setCreativeMotionSchemePick(next: CreativeMotionSchemePick) {
		setCreativeMotionSchemePickState((prev) => {
			if (prev !== next) {
				creativeMotionStillUrlRef.current = null;
				creativeMotionEndUrlRef.current = null;
			}
			return next;
		});
	}

	function setImpactPosterTonePick(next: ImpactPosterTonePick) {
		setImpactPosterTonePickState((prev) => {
			if (prev !== next) {
				impactPosterStillUrlRef.current = null;
				impactPosterEndUrlRef.current = null;
			}
			return next;
		});
	}

	function setImpactPosterEffectPick(next: ImpactPosterEffectPick) {
		setImpactPosterEffectPickState((prev) => {
			if (prev !== next) {
				impactPosterStillUrlRef.current = null;
				impactPosterEndUrlRef.current = null;
			}
			return next;
		});
	}

	const motionPosterAspectRef = useRef(imageAspectRatio);
	useEffect(() => {
		if (videoCreativeMode !== "motion-poster") {
			motionPosterAspectRef.current = imageAspectRatio;
			return;
		}
		if (motionPosterAspectRef.current === imageAspectRatio) return;
		motionPosterAspectRef.current = imageAspectRatio;
		motionPosterStillUrlRef.current = null;
		motionPosterEndUrlRef.current = null;
	}, [imageAspectRatio, videoCreativeMode]);

	function previewMotionPosterDialect(): MotionPosterDialectId {
		return resolveMotionPosterDialect({
			pick: motionPosterDialectPick,
			product,
			headline,
			subline,
			extra: promptExtra,
			conceptIdea,
			conceptMode: promotionMode === "concept",
			stable: true,
		}).id;
	}

	const storyboardSceneSig = storyboardScenes
		.map((s) => `${s.imageIndex}:${s.imageUrl}`)
		.join("|");
	const storyboardSceneSigRef = useRef(storyboardSceneSig);
	useEffect(() => {
		if (storyboardSceneSigRef.current === storyboardSceneSig) return;
		const prevSig = storyboardSceneSigRef.current;
		storyboardSceneSigRef.current = storyboardSceneSig;
		setStoryboardGridApproved(false);
		setStoryboardCellsViewed((viewed) =>
			retainStoryboardCellViewed(viewed, prevSig, storyboardSceneSig),
		);
	}, [
		storyboardSceneSig,
		setStoryboardGridApproved,
		setStoryboardCellsViewed,
	]);

	const storyboardAllCellsViewed = allStoryboardCellsViewed(
		storyboardScenes.length,
		storyboardCellsViewed,
	);

	function markStoryboardCellViewed(index: number) {
		if (!Number.isInteger(index) || index < 0) return;
		setStoryboardCellsViewed((prev) =>
			prev.includes(index) ? prev : [...prev, index],
		);
	}

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
				const next = defaultVisualStyleForWorkflow(
					"concept",
					workflowMode,
				);
        setVisualStyleId(next);
        setTemplateId(getVisualStyle(next).templateId);
				setImageInputMode(
					getTemplateConfig(getVisualStyle(next).templateId)
						.defaultImageInputMode,
				);
      }
    }
  }, [promotionMode, visualStyleId, workflowMode, setVideoCreativeMode]);

  useEffect(() => {
		if (promotionMode !== "concept" || workflowMode !== "video-only")
			return;
    if (videoCreativeMode === "product-assistant") {
      setVideoCreativeMode("product-promo");
    }
  }, [promotionMode, workflowMode, videoCreativeMode, setVideoCreativeMode]);

  useEffect(() => {
    setVoicePreviewTracks([]);
    setSelectedVoicePreviewId(null);
  }, [voiceoverLocale, setVoicePreviewTracks, setSelectedVoicePreviewId]);

  useEffect(() => {
		const timer = window.setInterval(
			() => setProgressNow(Date.now()),
			1000,
		);
    return () => window.clearInterval(timer);
  }, [imageBusy, videoBusy, setProgressNow]);

  const tpl = getTemplate(templateId);
  const visualStyle = getVisualStyle(visualStyleId);
  const templateConfig = getTemplateConfig(templateId);
  const usesCompositor = visualStyle.usesCompositor;
  const lockedCampaignMode = isCampaignVisualStyle(visualStyleId);
	const lockedSingleImageMode = isLockedSinglePosterStyle(visualStyleId);
  const effectiveImageOutputMode: ImageOutputMode = resolveEffectiveImageOutputMode({
    imageOutputMode,
    carouselIntent,
    carouselSlideCount: referenceCarouselSlideCount,
    lockedCampaignMode,
    lockedSingleImageMode,
  });
  const isCampaignOutput = effectiveImageOutputMode === "campaign";
	const isTeachingCarouselOutput =
		effectiveImageOutputMode === "teaching-carousel";
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
				.replaceAll(
					"{totalSec}",
					String(cinematicTotalDurationSec(count)),
				),
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
		(isCreativeVideoStyle(visualStyleId) ||
			isExplosionUnboxStyle(visualStyleId) ||
			isBrandVideoStyle(visualStyleId)) &&
    !productPhoto &&
    !imageUrl;
  const usesConceptTextVideo = conceptTextVideoEligible;
	const effectiveImageAspectRatio: ImageAspectRatio =
		isStoryboardOutput ||
		isCinematicStitchOutput ||
		isConceptCinematicSingleOutput
    ? "9:16"
    : imageAspectRatio;
  const showVideoReferenceSection = videoCreativeMode === "reference-concept";
  const effectiveImageMode: ImageInputMode =
		templateId === "custom"
			? imageInputMode
			: templateConfig.defaultImageInputMode;
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
	const isContentResearchReelVideo =
		isContentResearchReelPath && isStoryboardOutput;
	const isContentResearchPhysicalR2v =
		isContentResearchReelPath &&
		promotionMode === "physical" &&
		workflowMode === "video-only" &&
		useReferenceVideo;
	const isConceptResearchReelStoryboard =
		promotionMode === "concept" && isContentResearchReelVideo;
	const isConceptStoryboardOutput =
		promotionMode === "concept" && isStoryboardOutput;
	/** Any uploaded reference MP4 in reference-concept mode (research or manual). */
	const referenceReelNeedsExplicitDuration =
		useReferenceVideo &&
		Boolean(referenceAd && referenceIsVideo) &&
		!isExplicitVideoDuration(videoSettings.duration);
	const reelAnalyzeOutputDurationSec =
		resolveWizardOutputDurationSec(videoSettings);
	const shouldAnalyzeReferenceVideo =
		useReferenceVideo &&
		Boolean(referenceAd && effectivePromoteName) &&
		isExplicitVideoDuration(videoSettings.duration);
	const referenceVideoAnalyzeIncludesStoryboard = isStoryboardOutput;
	/** Image still plan when storyboard + research cover — reel path owns plan when MP4 present. */
	const referenceImageAnalyzeIncludesStoryboard =
		isStoryboardOutput &&
		!(useReferenceVideo && referenceAd && referenceIsVideo && shouldAnalyzeReferenceVideo);
	const isVideoWorkflow =
		workflowMode === "video-only" || workflowMode === "combined";
	const isImageWorkflow =
		workflowMode === "image-only" || workflowMode === "combined";

  const usesReferenceConceptForImage =
		!isLockedSinglePosterStyle(visualStyleId) &&
		(imageCreativeMode === "reference-concept" ||
			Boolean(imageRefPhoto && productPhoto));

	const referenceStrategy = useMemo(
		() =>
			resolveReferenceStrategy({
				promotionMode,
				imageOutputMode: effectiveImageOutputMode,
				visualStyleId,
				workflowMode,
				imageCreativeMode: isLockedSinglePosterStyle(visualStyleId)
					? "promo-ai"
					: imageCreativeMode,
				hasReferenceUpload:
					!isLockedSinglePosterStyle(visualStyleId) &&
					Boolean(imageRefPhoto),
				hasProductPhoto: hasProductPhotoLock,
				hasReferenceBrief:
					!isLockedSinglePosterStyle(visualStyleId) &&
					(Boolean(userReferenceBrief) ||
						Boolean(conceptImageVisionNote.trim())),
				preferCompositionRemap:
					!isLockedSinglePosterStyle(visualStyleId) &&
					preferCompositionRemap,
				compositionRemapKeepHero:
					!isLockedSinglePosterStyle(visualStyleId) &&
					preferCompositionRemap &&
					compositionRemapKeepHero,
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
			preferCompositionRemap,
			compositionRemapKeepHero,
			hasProductPhotoLock,
		],
	);

	const appendReferenceFormFields = useCallback(
		(fd: FormData) => {
			fd.set("image_output_mode", effectiveImageOutputMode);
			fd.set("promotion_mode", promotionMode);
			if (userReferenceBrief) {
				fd.set("reference_brief", JSON.stringify(userReferenceBrief));
			}
			if (preferCompositionRemap) {
				fd.set("prefer_composition_remap", "1");
			}
			if (preferCompositionRemap && compositionRemapKeepHero) {
				fd.set("composition_remap_keep_hero", "1");
			}
		},
		[
			effectiveImageOutputMode,
			promotionMode,
			userReferenceBrief,
			preferCompositionRemap,
			compositionRemapKeepHero,
		],
	);

	const attachReferenceToForm = useCallback(
		(fd: FormData) => {
			// Designed / parts posters never borrow a reference — product (+ angles) only.
			const lockedPoster = isLockedSinglePosterStyle(visualStyleId);
			// Both research cover and manual style upload land in imageRefPhoto.
			// Generate maps: reference_image (主圖) = IMAGE1 product; style_reference = IMAGE2 look.
			// Order matters: nano-banana/edit prioritizes the first image as the hero subject.
			const useConceptRef =
				!lockedPoster &&
				(imageCreativeMode === "reference-concept" ||
					Boolean(imageRefPhoto && productPhoto));
			fd.set(
				"image_creative_mode",
				lockedPoster
					? "promo-ai"
					: useConceptRef
						? "reference-concept"
						: imageCreativeMode,
			);
			fd.set(
				"image_mode",
				lockedPoster
					? "product-ad"
					: effectiveImageMode === "reference"
						? "reference"
						: useConceptRef
							? "product-style"
							: "product-ad",
			);
			if (productPhoto) {
				fd.set("reference_image", productPhoto);
			}
			if (!lockedPoster && imageRefPhoto) {
				fd.set("style_reference_image", imageRefPhoto);
			}
			for (const f of extraKitPhotos.slice(0, 4)) {
				fd.append("product_angle_images", f);
			}
			if (!lockedPoster) {
				appendReferenceFormFields(fd);
			}
			fd.set("resolution", imageResolution);
		},
		[
			visualStyleId,
			imageCreativeMode,
			imageRefPhoto,
			productPhoto,
			extraKitPhotos,
			effectiveImageMode,
			referenceStrategy.sendPixelsToFal,
			appendReferenceFormFields,
			imageResolution,
		],
	);

	const effectivePromptExtra = useCallback(() => {
		const researchRefreshed = refreshContentResearchPromptExtra(
			promptExtra,
			contentResearchApplyRef,
			promotionMode,
			{ product, headline, conceptIdea },
			promptMarket,
		);
		const mergedBase = usesReferenceConceptForImage
			? researchRefreshed.trim()
			: mergePromptExtra(visualStyleId, researchRefreshed);
		const base = mergeReferencePromptExtra(
			mergedBase,
			userReferenceBrief,
			referenceStrategy,
		);
		const reelBlock =
			storyboardRecipeForbidsReference(storyboardRecipeId)
				? ""
				: researchReelAnalysis
					? researchReelAnalysisPromptBlock(researchReelAnalysis)
					: "";
		const legacyRef =
			!userReferenceBrief && conceptImageVisionNote.trim()
				? conceptImageVisionNote.trim()
				: "";
		let combined =
			legacyRef &&
			!base.includes(USER_REFERENCE_MARKER) &&
			!base.includes(USER_REFERENCE_STYLE_ONLY_MARKER) &&
			!base.includes(USER_REFERENCE_LAYOUT_TRANSFER_MARKER) &&
			!base.includes(USER_REFERENCE_COMPOSITION_REMAP_MARKER) &&
			!isContentResearchStyleExtra(base)
				? [base, legacyRef, reelBlock].filter(Boolean).join(" | ")
				: [base, reelBlock].filter(Boolean).join(" | ");
		combined = appendCompositionToExtra(
			combined,
			compositionPresetId,
			artStyleId,
		);
		return combined;
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
		promptMarket,
		storyboardRecipeId,
		compositionPresetId,
		artStyleId,
	]);

  const getPromptVars = useCallback(
    () =>
      buildPromptVariables({
        product,
        business,
        offer,
				headline: effectiveBrandHeadline(
        headline,
					brandKit,
					brandProfile,
				),
        subline,
        market: promptMarket,
        framing: subjectFraming,
        extra: effectivePromptExtra(),
        artStyle: artStyleId,
				imageTextMode,
				compositionPreset: compositionPresetId,
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
			compositionPresetId,
			brandKit,
			brandProfile,
    ],
  );

  const usesStyleReference =
    templateHasSlot(templateId, "styleRef") && Boolean(imageRefPhoto);
	const needsProductUpload = isConceptStoryboardOutput
      ? false
		: promotionMode === "concept" &&
			  conceptStyleAllowsTextOnlyImage(visualStyleId)
			? false
			: effectiveImageMode === "product-ad" ||
				effectiveImageMode === "product-style";

  const videoPromptOpts = useCallback((): VideoPromptOpts => {
    const dual = Boolean(
      endFrameUrl ||
        endFramePhoto ||
			(videoSettings.autoSecondFrame &&
				videoSettings.creativity !== "subtle"),
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
				videoCreativeMode === "motion-poster"
					? buildMotionPosterStillPrompt(pv, {
							conceptMode: promotionMode === "concept",
							dialect: previewMotionPosterDialect(),
						})
					: buildWizardImagePrompt(
							pv,
							resolveImagePromptMode(
								visualStyleId,
								imageCreativeMode,
								{
            promotionMode,
            workflowMode,
								},
							),
          brandProfile,
          visualStyleId,
							brandKit,
						),
			);
			setNegativePrompt(
				buildNegativePrompt(template, pv.framing, artStyleId),
			);
			if (videoCreativeMode === "motion-poster") {
				const identity = resolveMotionPosterPromptIdentity({
					product,
					headline,
					conceptIdea,
					conceptMode: promotionMode === "concept",
				});
				const durationRaw = String(videoSettings.duration);
				const durationSec = resolvePlannerDurationSec(durationRaw, 6);
				setVideoPrompt(
					buildMotionPosterPrompt({
						...identity,
						durationSec,
						mode:
							endFramePhoto || endFrameUrl ? "start-end" : "loop",
						dialect: previewMotionPosterDialect(),
					}),
				);
			} else if (videoCreativeMode === "reference-concept") {
        setVideoPrompt(buildReferenceVideoPrompt(pv, id));
      } else if (useMultiAngleVideo) {
        setVideoPrompt(buildMultiAngleVideoPrompt(pv, vOpts, id));
			} else if (
				isStoryboardVideoStyle(visualStyleId) &&
				storyboardPlan?.seedancePrompt
			) {
        // Keep DeepSeek per-scene Seedance prompt — do not replace with template default.
			} else if (
				usesProductAssistant &&
				productVideoPlan?.seedancePrompt
			) {
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
			product,
			headline,
			conceptIdea,
			promptExtra,
			motionPosterDialectPick,
			videoSettings.duration,
			endFramePhoto,
			endFrameUrl,
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
				hasProductPhoto: hasProductPhotoLock,
				researchAngleId: contentResearchApplyRef?.angle?.id,
			}),
		[
			imageRefPhoto,
			extraKitPhotos,
			promotionMode,
			effectiveImageOutputMode,
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
		imageRefPhoto,
		visualStyleId,
		imageCreativeMode,
		productPhoto,
		effectiveImageOutputMode,
		preferCompositionRemap,
		compositionRemapKeepHero,
		referenceImageAnalyzeIncludesStoryboard,
		storyboardSceneCount,
		videoSettings,
		workflowMode,
		artStyleId,
		subjectFraming,
		offer,
		business,
		promptMarket,
		imageTextMode,
		referenceStrategyKind: "" as string,
	});
	referenceAnalyzeContextRef.current = {
		conceptIdea,
		headline,
		subline,
		product,
		promptExtra,
		contentResearchApplyRef,
		promotionMode,
		imageRefPhoto,
		visualStyleId,
		imageCreativeMode,
		productPhoto,
		effectiveImageOutputMode,
		preferCompositionRemap,
		compositionRemapKeepHero,
		referenceImageAnalyzeIncludesStoryboard,
		storyboardSceneCount,
		videoSettings,
		workflowMode,
		artStyleId,
		subjectFraming,
		offer,
		business,
		promptMarket,
		imageTextMode,
		referenceStrategyKind: referenceStrategy.kind,
	};

	const lastCompletedReferenceAnalyzeKeyRef = useRef<string | null>(null);
	const referenceAnalyzeInFlightKeyRef = useRef<string | null>(null);
	const desiredReferenceAnalyzeKeyRef = useRef<string | null>(null);

	useEffect(() => {
		desiredReferenceAnalyzeKeyRef.current = referenceAnalyzeKey;
		if (!referenceAnalyzeKey) {
			lastCompletedReferenceAnalyzeKeyRef.current = null;
			referenceAnalyzeInFlightKeyRef.current = null;
			setUserReferenceBrief(null);
			setReferenceAnalyzeNote(null);
			setReferenceAnalyzeBusy(false);
			return;
		}
		if (
			lastCompletedReferenceAnalyzeKeyRef.current === referenceAnalyzeKey
		) {
			// Effect may re-run (Strict Mode / File identity) after a cancelled in-flight
			// request left busy=true — clear the spinner without re-billing Florence.
			setReferenceAnalyzeBusy(false);
			return;
		}
		if (referenceAnalyzeInFlightKeyRef.current === referenceAnalyzeKey) {
			// Same file already fetching (Strict Mode remount) — do not start a second Florence.
			return;
		}
		referenceAnalyzeInFlightKeyRef.current = referenceAnalyzeKey;
		const runKey = referenceAnalyzeKey;

		const run = async () => {
			const ctx = referenceAnalyzeContextRef.current;
			const cover = ctx.imageRefPhoto;
			if (!cover) return;
			setReferenceAnalyzeBusy(true);
			setReferenceAnalyzeNote(null);
			try {
				const promptForAnalyze = refreshContentResearchPromptExtra(
					ctx.promptExtra,
					ctx.contentResearchApplyRef,
					ctx.promotionMode,
					{
						product: ctx.product,
						headline: ctx.headline,
						conceptIdea: ctx.conceptIdea,
					},
					promptMarket,
				);
				const fd = new FormData();
				fd.set("reference_image", cover);
				fd.set("promotion_mode", ctx.promotionMode);
				fd.set("image_output_mode", ctx.effectiveImageOutputMode);
				fd.set("visual_style", ctx.visualStyleId);
				fd.set("image_creative_mode", ctx.imageCreativeMode);
				fd.set("has_product_photo", ctx.productPhoto ? "1" : "0");
				fd.set("conceptIdea", ctx.conceptIdea.trim());
				fd.set("headline", ctx.headline.trim());
				fd.set("subline", ctx.subline.trim());
				fd.set("product", ctx.product.trim());
				fd.set("prompt_extra", promptForAnalyze);
				if (ctx.preferCompositionRemap) {
					fd.set("prefer_composition_remap", "1");
				}
				if (ctx.preferCompositionRemap && ctx.compositionRemapKeepHero) {
					fd.set("composition_remap_keep_hero", "1");
				}
				if (ctx.referenceImageAnalyzeIncludesStoryboard) {
					fd.set("plan_storyboard", "true");
					fd.set("workflow_mode", ctx.workflowMode);
					fd.set("scene_count", ctx.storyboardSceneCount);
					fd.set(
						"output_duration_sec",
						String(resolveWizardOutputDurationSec(ctx.videoSettings)),
					);
					fd.set("prompt_market", ctx.promptMarket);
					fd.set("art_style", ctx.artStyleId);
					fd.set("subject_framing", ctx.subjectFraming);
					fd.set("offer", ctx.offer.trim());
					fd.set("business", ctx.business.trim());
					fd.set("reference_strategy_kind", ctx.referenceStrategyKind);
					fd.set("image_text_mode", ctx.imageTextMode);
				}
				// Do NOT send extraKitPhotos as carousel_reference_images.
				// Kit slots are optional product angles, not research style slides — sending
				// them forced N sequential Bagel calls and polluted carousel vision.
				const res = await fetch("/api/analyze-reference", {
					method: "POST",
					body: fd,
				});
				const data = await res.json();
				if (!res.ok)
					throw new Error(data.error ?? "Reference analysis failed.");
				notifyCreditBalance(readCreditBalanceFromResponse(data));
				if (desiredReferenceAnalyzeKeyRef.current !== runKey) return;
				if (referenceAnalyzeInFlightKeyRef.current !== runKey) return;
				lastCompletedReferenceAnalyzeKeyRef.current = runKey;
				const brief = data.brief as UserReferenceBrief;
				setUserReferenceBrief(brief);
				setPromptExtra((prev) => stripContentResearchStyleExtra(prev));
				if (data.storyboardPlan) {
					const plan = data.storyboardPlan as VideoStoryboardPlan;
					setStoryboardPlan(plan);
					const sp = sanitizeStoryboardSeedancePrompt(plan.seedancePrompt);
					if (sp) setVideoPrompt(sp);
					if (plan.totalDurationSec) {
						const dur = String(
							Math.min(15, Math.max(4, Math.round(plan.totalDurationSec))),
						);
						setStoryboardTrimDuration(dur as StoryboardDurationPreset);
					}
					setReferenceAnalyzeNote(m.wizard.researchStoryboardPlanReady);
				} else if (
					typeof data.storyboardPlanError === "string" &&
					data.storyboardPlanError
				) {
					setReferenceAnalyzeNote(data.storyboardPlanError);
				} else {
					const slideCount = Number(data.carouselSlideCount) || 1;
					setReferenceAnalyzeNote(
						slideCount > 1
							? m.wizard.referenceCarouselBriefAnalyzed.replace(
									"{count}",
									String(slideCount),
								)
							: m.wizard.referenceBriefAnalyzed,
					);
				}
			} catch (e: unknown) {
				if (
					desiredReferenceAnalyzeKeyRef.current === runKey &&
					referenceAnalyzeInFlightKeyRef.current === runKey
				) {
					setReferenceAnalyzeNote(
						e instanceof Error
							? e.message
							: m.wizard.referenceBriefAnalyzeFailed,
					);
					// Mark complete on failure too — otherwise UI retries forever on every remount.
					lastCompletedReferenceAnalyzeKeyRef.current = runKey;
				}
			} finally {
				if (referenceAnalyzeInFlightKeyRef.current === runKey) {
					referenceAnalyzeInFlightKeyRef.current = null;
				}
				if (desiredReferenceAnalyzeKeyRef.current === runKey) {
					setReferenceAnalyzeBusy(false);
				}
			}
		};
		void run();
		return () => {
			// Keep inFlight so Strict remount does not start a duplicate Florence.
		};
	}, [
		// Key already fingerprints the cover file + mode — do not also depend on File
		// identity or busy stays true after a cancelled remount with the same key.
		referenceAnalyzeKey,
		m.wizard.referenceBriefAnalyzed,
		m.wizard.referenceCarouselBriefAnalyzed,
		m.wizard.referenceBriefAnalyzeFailed,
		setUserReferenceBrief,
		setReferenceAnalyzeBusy,
		setReferenceAnalyzeNote,
		setPromptExtra,
		promptMarket,
	]);

	const researchReelAnalyzeKeyRef = useRef<string | null>(null);
	/** Prevents overlapping /api/analyze-research-reel while the first is still in flight. */
	const researchReelAnalyzeInFlightKeyRef = useRef<string | null>(null);
	/** Avoid re-billing refine when duration/product/reel unchanged. */
	const researchScriptRefineKeyRef = useRef<string | null>(null);
	const aiVideoPromptDurationRef = useRef<string | null>(null);

	/**
	 * Art-style tail: skip on reference video unless user picked a video-safe grade
	 * (film / CCD / 国风 / cinematic). Illustration styles never glue onto R2V.
	 */
	const seedancePromptForGenerate = useCallback(
		(prompt: string, opts?: { hasReferenceVideo?: boolean }) => {
			const id = artStyleId ?? DEFAULT_ART_STYLE;
			const skipRefIllustration =
				Boolean(opts?.hasReferenceVideo) &&
				(id === "realistic" || !isVideoSafeArtStyle(id));
			return appendArtStyleSeedanceHintIfNeeded(prompt, artStyleId, {
				skip: skipRefIllustration,
			});
		},
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
				const cdnUrl = referenceResearchCdnUrl?.trim() ?? "";
				if (cdnUrl) {
					fd.set("reference_video_url", cdnUrl);
					fd.set(
						"reference_platform",
						referenceResearchPlatform ?? "tiktok",
					);
				} else {
					fd.set("reference_video", videoFile);
				}
				fd.set("product_name", promoteName);
				fd.set("promotion_mode", promotionMode);
				fd.set("conceptIdea", conceptIdea.trim());
				fd.set("headline", headline.trim());
				fd.set("subline", subline.trim());
				fd.set("offer", offer.trim());
				fd.set("business", business.trim());
				fd.set(
					"prompt_extra",
					[
						effectivePromptExtra(),
						brandProfile?.businessName
							? brandProfilePromptBlock(brandProfile)
							: "",
					]
						.filter(Boolean)
						.join("\n"),
				);
				fd.set("prompt_market", promptMarket);
				fd.set("art_style", artStyleId);
				fd.set("subject_framing", subjectFraming);
				fd.set("reference_strategy_kind", referenceStrategy.kind);
				fd.set("scene_count", storyboardSceneCount);
				fd.set("brand_kit", JSON.stringify(brandKit));
				const outDur = resolveWizardOutputDurationSec(videoSettings);
				fd.set("output_duration_sec", String(outDur));
				if (!referenceVideoAnalyzeIncludesStoryboard) {
					fd.set("plan_storyboard", "false");
				}
				fd.set("image_text_mode", imageTextMode);
				const res = await fetch("/api/analyze-research-reel", {
					method: "POST",
					body: fd,
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(
						(data.error as string | undefined) ??
							m.errors.researchReelAnalyzeFailed,
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
					plan = pinStoryboardPlanToReelAnalysis(
						plan,
						analysis,
						promoteName,
					);
					setStoryboardPlan(plan);
					const sp = sanitizeStoryboardSeedancePrompt(
						plan.seedancePrompt,
					);
					if (sp) setVideoPrompt(sp);
					if (plan.totalDurationSec) {
						const dur = String(
							Math.min(
								15,
								Math.max(4, Math.round(plan.totalDurationSec)),
							),
						);
						setStoryboardTrimDuration(
							dur as StoryboardDurationPreset,
						);
					}
				} else if (analysis?.seedancePrompt) {
					const sp = sanitizeStoryboardSeedancePrompt(
						analysis.seedancePrompt,
					);
					if (sp) setVideoPrompt(sp);
				}
				if (
					typeof data.styleReferenceFrameUrl === "string" &&
					data.styleReferenceFrameUrl
				) {
					await applyReelStyleReferenceFrame(
						data.styleReferenceFrameUrl,
					);
				}
				// Clip upload is deferred to ensureReferenceVideoFalUrl at generate time.
				if (
					typeof data.referenceVideoUrl === "string" &&
					data.referenceVideoUrl.startsWith("http")
				) {
					setReferenceVideoFalUrl(data.referenceVideoUrl);
				} else {
					setReferenceVideoFalUrl(null);
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
					e instanceof Error
						? e.message
						: m.errors.researchReelAnalyzeFailed,
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
			brandKit,
			brandProfile,
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
			referenceResearchCdnUrl,
			referenceResearchPlatform,
			setReferenceVideoFalUrl,
			setRefVideoDurationSec,
			videoSettings,
		],
	);

	const referenceAdIdentity = referenceAd
		? `${referenceAd.name}:${referenceAd.size}:${referenceAd.lastModified}`
		: null;
	const prevReferenceAdIdentityRef = useRef<string | null | undefined>(
		undefined,
	);

	useEffect(() => {
		const prev = prevReferenceAdIdentityRef.current;
		prevReferenceAdIdentityRef.current = referenceAdIdentity;

		// Always reset analysis when the reference file changes (or clears).
		setResearchReelAnalysis(null);
		setResearchReelAnalyzeNote(null);
		setReferenceVideoFalUrl(null);
		researchReelAnalyzeKeyRef.current = null;
		researchReelAnalyzeInFlightKeyRef.current = null;
		researchScriptRefineKeyRef.current = null;

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
		if (
			!shouldAnalyzeReferenceVideo ||
			!referenceAd ||
			!reelAnalyzeCacheKey
		)
			return;
		const prevKey = researchReelAnalyzeKeyRef.current;
		if (prevKey === reelAnalyzeCacheKey) return;
		// Same key already running (effect re-ran because analyzeResearchReel deps changed).
		if (researchReelAnalyzeInFlightKeyRef.current === reelAnalyzeCacheKey)
			return;
		if (prevKey && prevKey !== reelAnalyzeCacheKey) {
			setResearchReelAnalysis(null);
			setStoryboardPlan(null);
			// Keep storyboardScenes — wiping here hid fal results after generate
			// whenever duration/name/cache key changed and re-analyze fired.
			setResearchReelAnalyzeNote(
				m.wizard.researchReelReanalyzeForDuration,
			);
			researchScriptRefineKeyRef.current = null;
		}
		researchReelAnalyzeInFlightKeyRef.current = reelAnalyzeCacheKey;
		void analyzeResearchReel(referenceAd).then((ok) => {
			if (
				researchReelAnalyzeInFlightKeyRef.current ===
				reelAnalyzeCacheKey
			) {
				researchReelAnalyzeInFlightKeyRef.current = null;
			}
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
		if (!sceneFramePhoto) {
			setSceneFramePreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(sceneFramePhoto);
		setSceneFramePreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [sceneFramePhoto]);

	useEffect(() => {
		const urls = extraKitPhotos.map((f: File) => URL.createObjectURL(f));
    setExtraKitPreviewUrls(urls);
		return () => urls.forEach((u: string) => URL.revokeObjectURL(u));
  }, [extraKitPhotos]);

	const kitPlanStaleSkipFirstRef = useRef(true);
  useEffect(() => {
		// Skip initial mount — only warn after the kit actually changes mid-session.
		if (kitPlanStaleSkipFirstRef.current) {
			kitPlanStaleSkipFirstRef.current = false;
			return;
		}
		// Kit photos changed — product-assistant vision plan is stale, but keep any
		// editable DeepSeek videoPrompt the user may already be reviewing.
		setProductVideoPlan(null);
		setVideoPromptPlanNote((prev) => {
			const stamp = m.wizard.planStaleAfterAssetChange;
			if (prev?.includes(stamp)) return prev;
			return [prev, stamp].filter(Boolean).join(" — ");
		});
	}, [
		productPhoto,
		packagingPhoto,
		extraKitPhotos,
		m.wizard.planStaleAfterAssetChange,
	]);

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

	const planAiVideoPrompt = useCallback(async (opts?: {
		creativeBrief?: string;
		headline?: string;
		conceptIdea?: string;
	}): Promise<boolean> => {
		if (planVideoPromptBusy) return false;
		if (isRecipeOwnedVideoMode(videoCreativeMode)) return true;

		if (isExplosionUnboxStyle(visualStyleId)) {
			const theme = extractExplosionUnboxTheme({
				conceptIdea: opts?.conceptIdea ?? conceptIdea,
				headline: opts?.headline ?? headline,
				business,
				product,
			});
			const pack = prefillExplosionUnboxFields(theme);
			setConceptIdea(pack.conceptIdea);
			setCreativeVideoBrief(pack.creativeVideoBrief);
			setVideoPrompt(pack.videoPrompt);
			setVideoPromptPlanNote(m.wizard.explosionUnbox.planNote);
			setShowAdvancedVideo(true);
			aiVideoPromptDurationRef.current = String(
				resolveWizardOutputDurationSec(videoSettings),
			);
			return true;
		}

		const brief =
			(opts?.creativeBrief ?? creativeVideoBrief).trim() ||
			[
				(opts?.headline ?? headline).trim(),
				subline.trim(),
				offer.trim(),
				(opts?.conceptIdea ?? conceptIdea).trim(),
			]
				.filter(Boolean)
				.join(" | ");
		const hook = (opts?.headline ?? headline).trim();
		const idea = (opts?.conceptIdea ?? conceptIdea).trim();
		if (
			(isCreativeVideoStyle(visualStyleId) || isExplosionUnboxStyle(visualStyleId)) &&
			!brief &&
			!hook &&
			!idea
		) {
      setError(m.errors.creativeBriefRequired);
			return false;
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
			const outputDurationSec =
				resolveWizardOutputDurationSec(videoSettings);
      const useCreativePlanner =
        isCreativeVideoStyle(visualStyleId) ||
				(promotionMode === "concept" &&
					isBrandVideoStyle(visualStyleId));
      const res = await fetch("/api/plan-video-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: useCreativePlanner
            ? "creative"
						: brandProfile?.businessName ||
							  isBrandVideoStyle(visualStyleId)
              ? "brand"
              : "product",
          brandProfile: brandProfile ?? undefined,
          creativeBrief: brief,
          product: product.trim(),
          business: business.trim(),
          headline: hook,
          subline: subline.trim(),
          offer: offer.trim(),
					duration: String(outputDurationSec),
          hasReferenceVideo: useReferenceVideo,
          textToVideo: conceptTextPlan,
          promotionMode,
          hasKeyframe: Boolean(productPhoto || imageUrl),
          imageVisionNote: conceptImageVisionNote.trim() || undefined,
          conceptIdea: idea || undefined,
					artStyleId,
					subjectFraming,
					promptExtra: effectivePromptExtra(),
        }),
      });
      const data = await res.json();
			if (!res.ok)
				throw new Error(data.error ?? m.errors.planVideoPromptFailed);
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
      if (suggested && !hook) setHeadline(suggested);
			return true;
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.planVideoPromptFailed));
			return false;
    } finally {
      setPlanVideoPromptBusy(false);
    }
  }, [
		planVideoPromptBusy,
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

	const planProductVideo = useCallback(async (): Promise<boolean> => {
		if (planProductVideoBusy) return false;
    if (!productPhoto) {
      setError(m.errors.needPhoto);
			return false;
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
			fd.set(
				"duration",
				String(resolveWizardOutputDurationSec(videoSettings)),
			);
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
				plan.situation
					? `${m.wizard.productVideoSituationLabel}: ${plan.situation}`
					: undefined,
        m.wizard.planProductVideoReady,
      ]
        .filter(Boolean)
        .join(" — ");
      setVideoPromptPlanNote(note);
      setShowAdvancedVideo(true);
			return true;
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.planProductVideoFailed));
			return false;
    } finally {
      setPlanProductVideoBusy(false);
    }
  }, [
		planProductVideoBusy,
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
		// Classic VideoStep uses stepKey "video". Micro-wizard stays on "setup" for fused
		// setup.pre_video — still auto-plan creative/brand motion prompts there.
		const onClassicVideo = stepKey === "video";
		const onMicroVideoSetup =
			stepKey === "setup" && workflowMode === "video-only";
		if (!onClassicVideo && !onMicroVideoSetup) return;
		if (usesCompositor || isStoryboardOutput || isUgcPresenterOutput)
      return;
		if (isRecipeOwnedVideoMode(videoCreativeMode)) return;
		if (planVideoPromptBusy) return;
		if (researchReelAnalysis?.seedancePrompt?.trim()) return;
		if (directReferenceR2vReady) return;
		if (useReferenceVideo && isContentResearchStyle) return;
		// If user already has an editable prompt, never auto-wipe/replan on duration or
		// settings tweaks — only soft-note so they can re-run AI plan deliberately.
		if (videoPrompt.trim()) {
			const plannedDuration = String(
				resolveWizardOutputDurationSec(videoSettings),
			);
			if (
				isAiPlannedVideoStyle(visualStyleId) &&
				aiVideoPromptDurationRef.current &&
				aiVideoPromptDurationRef.current !== plannedDuration
			) {
				setVideoPromptPlanNote((prev) =>
					prev?.includes(m.wizard.planVideoPromptDurationRefresh)
						? prev
						: [prev, m.wizard.planVideoPromptDurationStale]
								.filter(Boolean)
								.join(" — "),
				);
			}
      return;
    }
    if (
      (isCreativeVideoStyle(visualStyleId) || isExplosionUnboxStyle(visualStyleId)) &&
      !creativeVideoBrief.trim() &&
      !headline.trim()
    ) {
      return;
    }
    void planAiVideoPrompt();
  }, [
    stepKey,
		workflowMode,
    visualStyleId,
    usesCompositor,
    isStoryboardOutput,
		isUgcPresenterOutput,
    usesProductAssistant,
		videoCreativeMode,
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
		m.wizard.planVideoPromptDurationStale,
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
			if (!res.ok)
				throw new Error(data.error ?? m.errors.brandAnalyzeFailed);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
      const profile = data.profile as BrandProfile;
      setBrandProfile(profile);
			let mergedKit = brandKit;
			setBrandKit((prev) => {
				mergedKit = mergeBrandProfileIntoKit(profile, prev);
				saveBrandKitToStorage(mergedKit);
				return mergedKit;
			});
			setBrandAnalyzeNote(
				(data.sourceNote as string) + " — " + profile.summary,
			);
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
		setImageInputMode(
			getTemplateConfig(style.templateId).defaultImageInputMode,
		);
    if (!isBrandVisualStyle(id)) {
      setBrandProfile(null);
      setBrandAnalyzeNote(null);
    }
    if (isCampaignVisualStyle(id)) {
      setImageOutputMode("carousel");
      setCarouselIntent("promo");
      setReferenceCarouselSlideCount(3);
    }
    if (isAiPlannedVideoStyle(id)) {
      setVideoPrompt("");
      setVideoPromptPlanNote(null);
    } else {
      setVideoPromptPlanNote(null);
    }
    if (!isCreativeVideoStyle(id) && !isExplosionUnboxStyle(id)) {
      setCreativeVideoBrief("");
    }
    if (isExplosionUnboxStyle(id)) {
      const pack = prefillExplosionUnboxFields(
        extractExplosionUnboxTheme({ conceptIdea, headline, business, product }),
      );
      setConceptIdea(pack.conceptIdea);
      setCreativeVideoBrief(pack.creativeVideoBrief);
      setVideoPrompt(pack.videoPrompt);
      setVideoPromptPlanNote(m.wizard.explosionUnbox.planNote);
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
			cinematicLogoIntegratedRef.current = false;
    }
		setVideoSettings((prev: VideoSettings) => ({
      ...prev,
      motionStyle: defaultMotionStyleForTemplate(style.templateId),
      ...(isStoryboardVideoStyle(id)
        ? {
						resolution: capVideoRes("720p"),
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
				return hasProductPhotoLock;
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
			setImageInputMode(
				getTemplateConfig(templateId).defaultImageInputMode,
			);
    } else if (mode === "image-only") {
      setImageInputMode(DEFAULT_IMAGE_INPUT_MODE);
    }
    if (mode === "video-only") {
			setVideoSettings(
				videoSettingsForWorkflow("video-only", templateId, plan),
			);
			// Don't keep combined's storyboard lock — video-only defaults to animate-one-photo.
			selectVisualStyle(
				defaultVisualStyleForWorkflow(promotionMode, mode),
			);
			return;
    }
    if (mode === "combined") {
			setVideoSettings(videoSettingsForWorkflow("combined", templateId, plan));
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
			selectVisualStyle(
				defaultVisualStyleForWorkflow(promotionMode, mode),
			);
		}
	}

	function applyLockedImagePosterStyle(
		styleId:
			| "designed-poster"
			| "parts-poster"
			| "gaming-cover"
			| "sports-big-words"
			| "jelly-3d",
	) {
		if (workflowMode === "video-only") setWorkflowMode("image-only");
		selectVisualStyle(styleId);
		setImageCreativeMode("promo-ai");
		setImageOutputMode("single");
		// Locked posters ignore reference layout/style borrow.
		setImageRefPhoto(null);
		setUserReferenceBrief(null);
		setReferenceAnalyzeNote(null);
	}

	function applyPrimaryPath(
		path:
			| "quick"
			| "model"
			| "designed"
			| "parts"
			| "gaming-cover"
			| "sports-big-words"
			| "jelly-3d"
			| "storyboard"
			| "reference"
			| "ugc-presenter"
			| "remap",
	) {
    setError(null);
    setStepKey("setup");
		if (path === "remap") {
			if (workflowMode === "video-only") setWorkflowMode("image-only");
			selectVisualStyle("product");
			setImageOutputMode("single");
			setImageCreativeMode("reference-concept");
			setPreferCompositionRemap(true);
			return;
		}
		setPreferCompositionRemap(false);
		setCompositionRemapKeepHero(false);
		if (path === "reference") {
			setWorkflowMode("image-only");
			selectVisualStyle("product");
			setImageCreativeMode("reference-concept");
			return;
		}
    if (path === "quick") {
			// Image ads stay in the current image workflow — do not force combined/storyboard.
			if (workflowMode === "video-only") setWorkflowMode("image-only");
      selectVisualStyle("product");
			setImageCreativeMode("promo-ai");
			return;
		}
		if (path === "designed") {
			applyLockedImagePosterStyle("designed-poster");
			return;
		}
		if (path === "parts") {
			applyLockedImagePosterStyle("parts-poster");
			return;
		}
		if (path === "gaming-cover") {
			applyLockedImagePosterStyle("gaming-cover");
			return;
		}
		if (path === "sports-big-words") {
			applyLockedImagePosterStyle("sports-big-words");
			return;
		}
		if (path === "jelly-3d") {
			applyLockedImagePosterStyle("jelly-3d");
      return;
    }
    if (path === "model") {
			if (workflowMode === "video-only") setWorkflowMode("image-only");
      selectVisualStyle("model-wear");
			setImageCreativeMode("promo-ai");
			// Avoid catalog framing killing the model in the prompt.
			setSubjectFraming((prev) =>
				prev === "product-only" || prev === "no-people" ? "auto" : prev,
			);
      return;
    }
		setWorkflowMode("combined");
		if (path === "ugc-presenter") {
			selectVisualStyle("ugc-presenter");
			setImageOutputMode("single");
			setVoiceoverEnabled(true);
			setVoiceoverLocale(voiceoverLocaleFromUiLocale(locale));
			setVideoSettings((prev: VideoSettings) => ({
				...prev,
				duration: "6",
				resolution: capVideoRes("720p"),
				fast: false,
			}));
			return;
		}
		// 圖+片 primary paths → storyboard reel (not single-poster animate).
    selectVisualStyle("storyboard-video");
		setVideoSettings(videoSettingsForWorkflow("combined", templateId, plan));
	}

	function applyPrimaryPathConcept(
		path:
			| "info"
			| "brand"
			| "pricing"
			| "website"
			| "designed"
			| "gaming-cover"
			| "sports-big-words"
			| "jelly-3d"
			| "remap",
	) {
    setError(null);
    setStepKey("setup");
    if (workflowMode !== "video-only") {
      setImageAspectRatio("4:5");
      setImageOutputMode("single");
    }
		if (path === "remap") {
			selectVisualStyle("info-poster");
			setImageOutputMode("single");
			setImageCreativeMode("reference-concept");
			setPreferCompositionRemap(true);
			return;
		}
		setPreferCompositionRemap(false);
		setCompositionRemapKeepHero(false);
    if (path === "info") selectVisualStyle("info-poster");
		else if (
			path === "designed" ||
			path === "gaming-cover" ||
			path === "sports-big-words" ||
			path === "jelly-3d"
		) {
			const styleId = path === "designed" ? "designed-poster" : path;
			selectVisualStyle(styleId);
			setImageOutputMode("single");
			setImageCreativeMode("promo-ai");
			setImageRefPhoto(null);
			setUserReferenceBrief(null);
			setReferenceAnalyzeNote(null);
		} else if (path === "brand") selectVisualStyle("brand-fit");
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
		cinematicLogoIntegratedRef.current = false;
    selectVisualStyle("concept-cinematic");
		setVideoSettings((prev: VideoSettings) => ({
			...videoSettingsForWorkflow("combined", "creative-video", plan),
      duration: "8",
			resolution: capVideoRes("720p"),
			creativity: CINEMATIC_REEL_VIDEO_CREATIVITY,
			motionStyle: "gentle-orbit",
      fast: false,
      autoSecondFrame: false,
    }));
  }

	function applyPrimaryPathConceptVideo(
		path: "brand" | "creative" | "cinematic" | "explosion-unbox",
	) {
    if (path === "cinematic") {
      applyConceptCinematicWorkflow(false);
      return;
    }
    setError(null);
    setWorkflowMode("video-only");
		setVideoSettings(videoSettingsForWorkflow("video-only", templateId, plan));
    setStepKey("setup");
		if (path === "explosion-unbox") {
			selectVisualStyle("explosion-unbox");
			setVideoCreativeMode("product-promo");
			setVideoSettings((prev: VideoSettings) => ({
				...prev,
				duration:
					prev.duration === "auto" || Number(prev.duration) > 12
						? "8"
						: prev.duration,
				autoSecondFrame: false,
			}));
			return;
		}
		selectVisualStyle(path === "brand" ? "brand-video" : "creative-video");
		if (referenceAd && referenceIsVideo) {
			setVideoCreativeMode("reference-concept");
		} else {
			setVideoCreativeMode("product-promo");
		}
  }

  function applyCinematicStitchRecipe() {
    applyConceptCinematicWorkflow(true);
  }

	function onCinematicSceneCountChange(count: CinematicSceneCount) {
		setCinematicSceneCount(count);
		setCinematicStitchReel(count > 1);
		setCinematicReelPlan(null);
		setCinematicScenes([]);
		cinematicLogoIntegratedRef.current = false;
		setAdPackPlan(null);
		setCaptionLines([]);
  }

  function applyClosestMatchRecipe() {
    applyConceptCinematicWorkflow(true);
    setMusicMood("cinematic");
		setMusicSource("library");
		setVoiceoverEnabled(false);
		setVoiceoverLocale(voiceoverLocaleFromUiLocale(locale));
		setCaptionBurnEnabled(false);
  }

  function applyQuickTest8sRecipe() {
    applyConceptCinematicWorkflow(false);
    setUseOriginalImage(false);
    setMusicMood("cinematic");
		setMusicSource("library");
		setVoiceoverEnabled(false);
		setVoiceoverLocale(voiceoverLocaleFromUiLocale(locale));
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
		path:
			| "assistant"
			| "storyboard"
			| "brand"
			| "creative"
			| "ugc-presenter",
  ) {
    setError(null);
		// UGC needs a talking-head keyframe then HeyGen — use combined image→video, not Seedance video-only.
		if (path === "ugc-presenter") {
			applyPrimaryPath("ugc-presenter");
			return;
		}
    setWorkflowMode("video-only");
		setVideoSettings(videoSettingsForWorkflow("video-only", templateId, plan));
    setStepKey("setup");
    if (path === "assistant") {
      setVideoCreativeMode("product-assistant");
      selectVisualStyle("product");
      return;
    }
    setVideoCreativeMode("product-promo");
    if (path === "storyboard") selectVisualStyle("storyboard-video");
    else if (path === "brand") selectVisualStyle("brand-video");
		else selectVisualStyle("product");
	}

	function applyLandingRecipe(recipeId: LandingRecipeId) {
		const def = LANDING_RECIPES[recipeId];
		const isPoster = isMotionPosterLandingRecipe(recipeId);
		const isBlockbuster = isBlockbusterLandingRecipe(recipeId);
		const isH3Shot = isH3ShotLandingRecipe(recipeId);
		const isImagePoster = isImagePosterLandingRecipe(recipeId);
		const isTvc = isTvcLandingRecipe(recipeId);
		const lockH3 = isPoster || isBlockbuster || isH3Shot;
		setError(null);
		onWorkflowModeChange(def.workflowMode);
		selectVisualStyle(def.visualStyleId);
		if (def.storyboardSceneCount) {
			setStoryboardSceneCount(def.storyboardSceneCount);
		}
		if (def.duration) {
			setVideoSettings((s) => ({
				...s,
				duration: def.duration!,
				autoSecondFrame: lockH3 ? false : s.autoSecondFrame,
				videoEngine: lockH3 ? "minimax-h3" : s.videoEngine,
			}));
		}
		if (def.storyboardRecipeId) {
			setStoryboardRecipeId(def.storyboardRecipeId);
		} else if (isTvc && def.duration && def.duration !== "auto") {
			setStoryboardTrimDuration(
				def.duration as typeof storyboardTrimDuration,
			);
		}
		if (def.visualStyleId === "explosion-unbox") {
			const pack = prefillExplosionUnboxFields();
			setConceptIdea(pack.conceptIdea);
			setCreativeVideoBrief(pack.creativeVideoBrief);
			setVideoPrompt(pack.videoPrompt);
			setVideoPromptPlanNote(m.wizard.explosionUnbox.planNote);
		}
		if (isImagePoster) {
			setVideoCreativeMode("product-promo");
		} else if (def.videoCreativeMode) {
			onVideoCreativeModeChange(def.videoCreativeMode);
		}
		if (isTvc) {
			applyPrimaryPath("storyboard");
		}
		setStepKey("setup");
  }

  async function onProductPhotoSelected(file: File | null) {
    setProductPhoto(file);
    setImageUrl(null);
    setImageVariantUrls([]);
    setSelectedVariantIndex(0);
		motionPosterStillUrlRef.current = null;
		motionPosterEndUrlRef.current = null;
		socialDripStillUrlRef.current = null;
		socialDripEndUrlRef.current = null;
    setUseOriginalImage(
      Boolean(file) &&
				videoCreativeMode !== "motion-poster" &&
				videoCreativeMode !== "social-drip" &&
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

	async function refreshImageVisionReview(
		url: string,
	): Promise<ImageVisionReview | null> {
		setImageVisionReviewBusy(true);
		try {
			const absoluteUrl =
				url.startsWith("http") || typeof window === "undefined"
					? url
					: url.startsWith("/")
						? `${window.location.origin}${url}`
						: url;
			const res = await fetch("/api/review-generated-image", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					image_url: absoluteUrl,
					product: product.trim(),
					headline: effectiveBrandHeadline(
						headline,
						brandKit,
						brandProfile,
					),
					image_text_mode: imageTextMode,
				}),
			});
			const data = (await res.json()) as {
				review?: ImageVisionReview;
				error?: string;
			};
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
			setImageQualityChecklist({
				productReadable: false,
				textLegible: false,
			});
		} catch {
			setImagePostflight(null);
		} finally {
			setImagePostflightBusy(false);
		}
		// Motion poster still is an intermediate keyframe on the video path — skip vision QA
		// (not shown in UI, and applyGeneratedImages + imageUrl effect must not double-fire it).
		if (videoCreativeMode === "motion-poster") {
			setImageVisionReview(null);
			return;
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

	// Designed / parts posters = one finished commercial still (not A/B / campaign / teaching).
	// Also drop any reference — these posters never borrow layout/style.
	useEffect(() => {
		if (!isLockedSinglePosterStyle(visualStyleId)) return;
		if (imageOutputMode !== "single") setImageOutputMode("single");
		if (imageCreativeMode !== "promo-ai") setImageCreativeMode("promo-ai");
		if (imageRefPhoto) setImageRefPhoto(null);
		if (userReferenceBrief) setUserReferenceBrief(null);
		if (referenceAnalyzeNote) setReferenceAnalyzeNote(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- snap when locked poster style
	}, [visualStyleId, imageOutputMode, imageCreativeMode, imageRefPhoto, userReferenceBrief, referenceAnalyzeNote]);

	// Hard lock: 圖+片 (except UGC / cinematic / recipe / Quick Ad) must stay on storyboard-video.
	// Prevents drift into 單圖動態 / 教學輪播 / 一鍵出片 after research or mode sync.
	useEffect(() => {
		if (workflowMode !== "combined") return;
		if (isRecipeOwnedVideoMode(videoCreativeMode)) return;
		// Step 4 Template → Quick Ad (product-assistant) must not be forced into storyboard.
		if (
			videoCreativeMode === "product-assistant" ||
			videoCreativeMode === "reference-concept"
		) {
			return;
		}
		if (
			isUgcPresenterStyle(visualStyleId) ||
			isConceptCinematicStyle(visualStyleId)
		)
			return;
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
	}, [
		workflowMode,
		visualStyleId,
		imageOutputMode,
		shipItMode,
		useOriginalImage,
		videoCreativeMode,
	]);

	const storyboardTextModeSeededRef = useRef(false);
	useEffect(() => {
		if (videoCreativeMode === "motion-poster") {
			storyboardTextModeSeededRef.current = false;
			setImageTextMode("textless");
			return;
		}
		const onStoryboard =
			isStoryboardOutput &&
			(workflowMode === "combined" || workflowMode === "video-only");
		if (onStoryboard) {
			if (!storyboardTextModeSeededRef.current) {
				storyboardTextModeSeededRef.current = true;
				setImageTextMode("textless");
			}
			return;
		}
		storyboardTextModeSeededRef.current = false;
	}, [workflowMode, isStoryboardOutput, videoCreativeMode]);

	useEffect(() => {
		if (
			!imageUrl ||
			useOriginalImage ||
			isStoryboardOutput ||
			isCinematicStitchOutput
		) {
			if (!imageUrl) {
				setImagePostflight(null);
				setImageVisionReview(null);
			}
			return;
		}
		void refreshImagePostflight(imageUrl);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when output URL or target aspect changes
	}, [
		imageUrl,
		effectiveImageAspectRatio,
		workflowMode,
		useOriginalImage,
		isStoryboardOutput,
		isCinematicStitchOutput,
	]);

	function normalizeGeneratedImageUrl(
		raw: string | undefined | null,
	): string | null {
		const u = raw?.trim() ?? "";
		if (!u) return null;
		if (u.startsWith("http")) return u;
		if (u.startsWith("/api/pipeline-files/")) return u;
		// Durable R2 library URLs — fal succeeded; API mirrored to /api/library/download/:id
		if (isLibraryAssetUrl(u) || u.startsWith("/api/library/download/"))
			return u;
		// Last resort: keep same-origin relative URLs so storyboard confirm UI still shows.
		if (u.startsWith("/")) return u;
		return null;
	}

	function applyGeneratedImages(
		urls: string[],
		endpoint?: string,
	): string | null {
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
		if (videoCreativeMode === "motion-poster") {
			motionPosterStillUrlRef.current = list[0];
			if (list[1]) motionPosterEndUrlRef.current = list[1];
		}
		setImageGenKey((k: number) => k + 1);
    setLastImageEndpoint(endpoint ?? null);
    setUseOriginalImage(false);
    setQuickFixCredits(1);
		// Postflight/vision QA runs from the imageUrl effect — do not call again here.
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
			const planScene = plan.scenes.find(
				(p) => p.imageIndex === scene.imageIndex,
			);
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
		const nearest = ["4", "6", "8", "10", "12"].reduce((best, d) => {
        const bestDiff = Math.abs(Number(best) - plan.totalDurationSec);
        const nextDiff = Math.abs(Number(d) - plan.totalDurationSec);
        return nextDiff < bestDiff ? d : best;
		}, "8") as StoryboardDurationPreset;
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

	function normalizeStoryboardIndices(
		scenes: StoryboardSceneResult[],
	): StoryboardSceneResult[] {
    return scenes.map((scene, i) => ({ ...scene, imageIndex: i + 1 }));
  }

  function reorderStoryboardScene(from: number, to: number) {
		setStoryboardScenes((prev: StoryboardSceneResult[]) => {
			if (from < 0 || to < 0 || from >= prev.length || to >= prev.length)
				return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return normalizeStoryboardIndices(next);
    });
  }

  function trimStoryboardDurations(targetSecRaw: StoryboardDurationPreset) {
    setStoryboardTrimDuration(targetSecRaw);
		const asVideoDuration =
			targetSecRaw === "4" ||
			targetSecRaw === "6" ||
			targetSecRaw === "8" ||
			targetSecRaw === "10" ||
			targetSecRaw === "12"
				? (targetSecRaw as VideoDuration)
				: ("12" as VideoDuration);
		setVideoSettings((prev: VideoSettings) => ({
      ...prev,
			duration: asVideoDuration,
    }));
    const targetSec = Number(targetSecRaw);
		setStoryboardScenes((prev: StoryboardSceneResult[]) => {
      if (!prev.length) return prev;
			const originalDurations = prev.map((scene) =>
				Math.max(1, scene.endSec - scene.startSec),
			);
			const totalOriginal =
				originalDurations.reduce((sum, v) => sum + v, 0) || 1;
			let assigned = originalDurations.map((d) =>
				Math.max(1, Math.round((d / totalOriginal) * targetSec)),
			);
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
		setStoryboardPlan((prev: VideoStoryboardPlan | null) =>
			prev ? { ...prev, totalDurationSec: targetSec } : prev,
		);
	}

	/** Kling I2V only supports 5s or 10s per still — set equal clip spans for stitch. */
	function applyKlingStoryboardClipDuration(clipSec: 5 | 10) {
		setStoryboardScenes((prev: StoryboardSceneResult[]) => {
			if (!prev.length) return prev;
			let cursor = 0;
			return prev.map((scene) => {
				const startSec = cursor;
				const endSec = cursor + clipSec;
				cursor = endSec;
				return { ...scene, startSec, endSec };
			});
		});
		const n = Math.max(1, storyboardScenes.length);
		const total = n * clipSec;
		const preset = String(total) as StoryboardDurationPreset;
		setStoryboardTrimDuration(preset);
		setVideoSettings((prev: VideoSettings) => ({
			...prev,
			duration: clipSec === 5 ? "4" : "10",
		}));
		setStoryboardPlan((prev: VideoStoryboardPlan | null) =>
			prev ? { ...prev, totalDurationSec: total } : prev,
		);
	}

	async function replaceStoryboardSceneImage(
		sceneIndex: number,
		file: File | null,
	) {
    if (!file) return;
    if (sceneIndex < 0 || sceneIndex >= storyboardScenes.length) return;
    setStoryboardSceneReplaceBusy(sceneIndex);
    setError(null);
    try {
      const url = URL.createObjectURL(file);
			setStoryboardScenes((prev: StoryboardSceneResult[]) =>
				prev.map((scene, i) =>
					i === sceneIndex ? { ...scene, imageUrl: url } : scene,
				),
			);
			setImageGenKey((k: number) => k + 1);
    } catch (e: unknown) {
      setError(friendlyError(e, m.errors.storyboardFailed));
    } finally {
      setStoryboardSceneReplaceBusy(null);
    }
  }

	/** One-click: stamp Brand kit logo centered onto a still (no AI redraw). */
	async function stampStoryboardSceneLogo(sceneIndex: number) {
    if (sceneIndex < 0 || sceneIndex >= storyboardScenes.length) return;
		const freshKit = loadBrandKitFromStorage();
		const kit = preferNewerBrandKit(brandKit, freshKit);
		if (!kit.logoUrl?.trim()) {
			setError(m.errors.brandLogoRequired);
      return;
    }
    const scene = storyboardScenes[sceneIndex];
		if (!scene?.imageUrl?.trim()) {
			setError(m.errors.needKeyframe);
      return;
    }
		setStoryboardSceneRegenerateBusy(sceneIndex);
		setError(null);
		try {
			if (kit !== brandKit) setBrandKit(kit);
			const res = await fetch("/api/stamp-brand-logo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					image_urls: [scene.imageUrl],
					brand_kit: { ...kit, useBrandLogo: true },
					placement: "top-right",
				}),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error((data.error as string) ?? "Logo stamp failed.");
			const nextUrl = normalizeGeneratedImageUrl(
				Array.isArray(data.urls) ? String(data.urls[0] ?? "") : "",
			);
			if (!data.logoStamped || !nextUrl) {
				throw new Error(
					typeof data.note === "string" && data.note
						? data.note
						: "Logo stamp did not apply — check Brand kit logo upload.",
				);
			}
			setStoryboardScenes((prev: StoryboardSceneResult[]) =>
				prev.map((s, i) =>
					i === sceneIndex ? { ...s, imageUrl: nextUrl } : s,
				),
			);
			if (sceneIndex === 0) setImageUrl(nextUrl);
			setImageGenKey((k: number) => k + 1);
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.storyboardFailed));
		} finally {
			setStoryboardSceneRegenerateBusy(null);
		}
	}

	async function forkBeforePaidRegenerate(
		hasExistingOutput: boolean,
	): Promise<boolean> {
		try {
			const { maybeForkProjectBeforeRegenerate } = await import(
				"@/lib/project-browse"
			);
			await maybeForkProjectBeforeRegenerate(hasExistingOutput);
			return true;
		} catch (e: unknown) {
			setError(
				e instanceof Error && e.message === "fork_failed"
					? "Could not save as a new project before regenerating. Try again."
					: friendlyError(e, m.errors.polishFailed),
			);
			return false;
		}
	}

	async function regenerateStoryboardSceneWithAi(sceneIndex: number) {
		if (sceneIndex < 0 || sceneIndex >= storyboardScenes.length) return;
		if (
			!isConceptStoryboardOutput &&
			!productPhoto &&
			!hasProductPhotoLock
		) {
			setError(m.errors.needPhoto);
			return;
		}
		const scene = storyboardScenes[sceneIndex];
		if (!scene) return;
    const confirmMessage = m.wizard.storyboardRegenerateConfirm.replace(
      "{scene}",
      String(scene.imageIndex),
    );
    if (!window.confirm(confirmMessage)) return;

    setStoryboardSceneRegenerateBusy(sceneIndex);
    setError(null);
		let regenPhoto = productPhoto;
		if (!regenPhoto && !isConceptStoryboardOutput) {
			regenPhoto = await resolveHydratedProductPhoto();
			if (regenPhoto) setProductPhoto(regenPhoto);
		}
		if (!regenPhoto && !isConceptStoryboardOutput) {
			setError(m.errors.needPhoto);
			setStoryboardSceneRegenerateBusy(null);
			return;
		}
		if (!(await forkBeforePaidRegenerate(true))) {
			setStoryboardSceneRegenerateBusy(null);
			return;
		}
		if (
			blockIfCannotAfford(
				TOKEN_COST.storyboard_scene * storyboardImagePassesPerScene(),
			)
		) {
			setStoryboardSceneRegenerateBusy(null);
			return;
		}
		try {
			const freshKit = loadBrandKitFromStorage();
			const liveKit = preferNewerBrandKit(brandKit, freshKit);
			const kitForGen = brandKitForGeneration(liveKit) ?? liveKit;
			if (liveKit !== brandKit) {
				setBrandKit(liveKit);
			}

			const planForGen: VideoStoryboardPlan =
				storyboardPlan ??
				({
					title: "",
					theme: headline.trim() || product.trim(),
					visualDirection: "",
					totalDurationSec: Number(storyboardTrimDuration) || 8,
					scenes: storyboardScenes.map((s) => ({
						imageIndex: s.imageIndex,
						role: s.role,
						startSec: s.startSec,
						endSec: s.endSec,
						sceneDescriptionZh: s.sceneDescriptionZh,
						onImageCopyZh: s.onImageCopyZh,
						imagePrompt:
							s.imagePrompt?.trim() ||
							"Textless commercial still, 9:16, no readable text or logos.",
					})),
					seedancePrompt: videoPrompt.trim(),
					productionNotes: "",
				} satisfies VideoStoryboardPlan);

      const fd = new FormData();
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
			fd.set("promotion_mode", promotionMode);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(kitForGen));
			fd.set(
				"product_name",
				isConceptStoryboardOutput
					? effectivePromoteName
					: product.trim(),
			);
			if (conceptIdea.trim()) fd.set("concept_idea", conceptIdea.trim());
      fd.set("business", business.trim());
      fd.set("headline", headline.trim());
      fd.set("subline", subline.trim());
      fd.set("offer", offer.trim());
			fd.set("storyboard_brief", storyboardBrief.trim());
			fd.set("duration", storyboardTrimDuration);
			fd.set(
				"scene_count",
				effectiveStoryboardSceneCount(storyboardRecipeId, storyboardSceneCount),
			);
			if (contentResearchApplyRef) {
				fd.set("research_adapted", "1");
			} else {
				fd.set("storyboard_recipe", storyboardRecipeId);
			}
      fd.set("prompt_market", promptMarket);
      fd.set("subject_framing", subjectFraming);
      fd.set("prompt_extra", effectivePromptExtra());
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set("image_text_mode", imageTextMode);
			const needsEdit =
				(referenceStrategy.sendPixelsToFal &&
					Boolean(regenPhoto?.size || productPhoto?.size)) ||
				(Boolean(imageRefPhoto?.size) &&
					(referenceStrategy.kind === "style-only" ||
						referenceStrategy.kind === "mood-only" ||
						referenceStrategy.kind === "layout-transfer" ||
						referenceStrategy.kind === "composition-remap"));
			fd.set("endpoint", needsEdit ? EDIT_ENDPOINT : TEXT_ENDPOINT);
			fd.set("storyboard_plan", JSON.stringify(planForGen));
			fd.set("scene_indexes", String(scene.imageIndex));
			if (
				researchReelAnalysis &&
				!storyboardRecipeForbidsReference(storyboardRecipeId)
			) {
				fd.set(
					"research_reel_analysis",
					JSON.stringify(researchReelAnalysis),
				);
			}
			attachReferenceToForm(fd);
			if (regenPhoto && !fd.get("reference_image")) {
				fd.set("reference_image", regenPhoto);
			}
			const activeProjectId =
				typeof window !== "undefined"
					? window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)
					: null;
			if (activeProjectId?.trim()) {
				fd.set("project_id", activeProjectId.trim());
			}

			const data = await postStoryboardImages(fd);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const next = data.scenes?.[0];
			const nextUrl = normalizeGeneratedImageUrl(next?.imageUrl ?? "");
			if (!nextUrl) throw new Error(m.errors.imageGenNoUrl);

			setStoryboardScenes((prev: StoryboardSceneResult[]) =>
        prev.map((s, i) =>
					i === sceneIndex
						? {
								...s,
								imageUrl: nextUrl,
								imagePrompt: next?.imagePrompt ?? s.imagePrompt,
							}
						: s,
        ),
      );
      if (sceneIndex === 0) setImageUrl(nextUrl);
			setImageGenKey((k: number) => k + 1);
			setLastImageEndpoint(
				(data.endpoint as string | undefined) ?? lastImageEndpoint,
			);
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

	/** Regenerate one A/B variant — keep the other version. */
	async function regenerateAbVariant(variantIndex: number): Promise<void> {
		if (variantIndex < 0 || variantIndex >= imageVariantUrls.length) return;
		if (imageVariantUrls.length <= 1) {
			await generateImage();
			return;
		}
		if (!canGenerateImage()) {
			setError(
				imageGenerateDisabledReason || m.wizard.imageGenerateNotReady,
			);
			return;
		}
		if (!(await forkBeforePaidRegenerate(true))) return;

		if (
			blockIfCannotAfford(
				estimateImageRegenTokens({
					scope: "one",
					outputMode: effectiveImageOutputMode,
				}),
			)
		) {
			return;
		}

		setImageBusy(true);
		setError(null);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
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
			fd.set(
				"endpoint",
				referenceStrategy.sendPixelsToFal
					? EDIT_ENDPOINT
					: TEXT_ENDPOINT,
			);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			if (productPhoto) fd.set("reference_image", productPhoto);
			attachReferenceToForm(fd);

			// Small variation nudge so A/B re-rolls don't clone the sibling.
			if (variantIndex === 1) {
				fd.set(
					"prompt_extra",
					[
						effectivePromptExtra(),
						"A/B variant B: alternate layout / crop / accent emphasis vs version A.",
					]
						.filter(Boolean)
						.join(" | "),
				);
			}

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const nextUrl = normalizeGeneratedImageUrl(
				urls.find((u) => Boolean(u)) ?? null,
			);
			if (!nextUrl) throw new Error(m.errors.imageGenNoUrl);

			setImageVariantUrls((prev) =>
				prev.map((u, i) => (i === variantIndex ? nextUrl : u)),
			);
			if (selectedVariantIndex === variantIndex) {
				setImageUrl(nextUrl);
				imageUrlRef.current = nextUrl;
			}
			setImageGenKey((k: number) => k + 1);
			if (typeof data.endpoint === "string")
				setLastImageEndpoint(data.endpoint);
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.polishFailed));
		} finally {
			setImageBusy(false);
			setImageJobMeta(null);
		}
	}

	/** Regenerate one carousel/campaign slide — not the full set. */
	async function regenerateCarouselSlide(slideIndex: number): Promise<void> {
		if (slideIndex < 0 || slideIndex >= campaignSlides.length) return;
		if (!campaignPlan || campaignSlides.length <= 1) {
			await generateImage();
			return;
		}
		if (!canGenerateImage()) {
			setError(
				imageGenerateDisabledReason || m.wizard.imageGenerateNotReady,
			);
			return;
		}
		// Prefer teaching single-slide API when in teaching mode, or when plan looks like teaching
		// (stored plan may still have body/takeaway fields after a teaching run).
		const useTeaching =
			isTeachingCarouselOutput ||
			Boolean(
				(
					campaignPlan as {
						slides?: Array<{ body?: string; takeaway?: string }>;
					}
				).slides?.some(
					(s) =>
						typeof s.body === "string" ||
						typeof s.takeaway === "string",
				),
			);
		const apiPath = useTeaching
			? "/api/generate-teaching-carousel"
			: "/api/generate-campaign";

		if (!(await forkBeforePaidRegenerate(true))) return;

		if (blockIfCannotAfford(TOKEN_COST.image)) return;

		setCarouselSlideRegenerateBusy(slideIndex);
		setError(null);
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set("headline", headline.trim());
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			if (!useTeaching) fd.set("campaign_theme", campaignTheme.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("promotion_mode", promotionMode);
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set("slide_index", String(slideIndex));
			fd.set("existing_plan", JSON.stringify(campaignPlan));
			fd.set("slide_count", String(campaignSlides.length));
			if (slideIndex > 0 && campaignSlides[0]?.imageUrl) {
				fd.set("series_cover_url", campaignSlides[0].imageUrl);
			}
			if (productPhoto) fd.set("reference_image", productPhoto);
			attachReferenceToForm(fd);
			fd.set(
				"endpoint",
				referenceStrategy.sendPixelsToFal
					? EDIT_ENDPOINT
					: TEXT_ENDPOINT,
			);

			const res = await fetch(apiPath, {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) ?? m.errors.campaignFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const slide = data.slide as
				| {
						role: string;
						title: string;
						headline: string;
						subline: string;
						imageUrl: string;
				  }
				| undefined;
			const nextUrl = normalizeGeneratedImageUrl(
				slide?.imageUrl ?? (data.imageUrl as string),
			);
			if (!nextUrl || !slide) throw new Error(m.errors.campaignFailed);
			setCampaignSlides((prev) =>
				prev.map((s, i) =>
					i === slideIndex
						? {
								...s,
								role: slide.role || s.role,
								title: slide.title || s.title,
								headline: slide.headline || s.headline,
								subline: slide.subline || s.subline,
								imageUrl: nextUrl,
							}
						: s,
				),
			);
			setImageVariantUrls((prev) =>
				prev.map((u, i) => (i === slideIndex ? nextUrl : u)),
			);
			if (selectedVariantIndex === slideIndex) setImageUrl(nextUrl);
			setImageGenKey((k: number) => k + 1);
			if (typeof data.endpoint === "string")
				setLastImageEndpoint(data.endpoint);
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.campaignFailed));
		} finally {
			setCarouselSlideRegenerateBusy(null);
		}
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
		if (isRecipeOwnedVideoMode(mode)) {
			if (
				isStoryboardVideoStyle(visualStyleId) ||
				isUgcPresenterStyle(visualStyleId) ||
				isConceptCinematicStyle(visualStyleId)
			) {
				selectVisualStyle(
					defaultVisualStyleForWorkflow(promotionMode, "video-only"),
				);
			}
		}
    if (mode !== "product-assistant") {
      setProductVideoPlan(null);
    }
    if (mode === "reference-concept") {
			setVideoSettings((s: VideoSettings) => ({
        ...s,
				resolution: capVideoRes("720p"),
				duration:
					s.duration === "auto" || Number(s.duration) > 15
						? "12"
						: s.duration,
        fast: false,
        autoSecondFrame: false,
      }));
    }
		if (mode === "motion-poster") {
			setImageTextMode("textless");
			setUseOriginalImage(false);
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration:
					s.duration === "auto" || Number(s.duration) > 8
						? "6"
						: s.duration,
				autoSecondFrame: false,
				motionStyle: "gentle-orbit",
				videoEngine: "minimax-h3",
			}));
		} else if (mode === "impact-poster") {
			setImageTextMode("textless");
			setUseOriginalImage(false);
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration:
					s.duration === "auto" || Number(s.duration) > 8
						? "6"
						: s.duration,
				autoSecondFrame: false,
				motionStyle: "slow-push",
				videoEngine: "minimax-h3",
			}));
		} else if (mode === "blockbuster") {
			setWorkflowMode("video-only");
			setUseOriginalImage(true);
			setReferenceAd(null);
			setReferencePreviewUrl(null);
			setReferenceIsVideo(false);
			setResearchReelAnalysis(null);
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration: "8",
				autoSecondFrame: false,
				motionStyle: "slow-push",
				videoEngine: "minimax-h3",
			}));
		} else if (mode === "bullet-product-elevate") {
			setWorkflowMode("video-only");
			setUseOriginalImage(true);
			setVideoSettings((s: VideoSettings) => {
				const allowed = new Set(["8", "10", "12"]);
				const nextDur = allowed.has(String(s.duration))
					? (String(s.duration) as "8" | "10" | "12")
					: String(BULLET_PRODUCT_ELEVATE_DURATION_SEC);
				return {
					...s,
					duration: nextDur as VideoSettings["duration"],
					autoSecondFrame: false,
					motionStyle: "slow-push",
					videoEngine: "minimax-h3",
				};
			});
		} else if (mode === "web-boundary-break") {
			setVideoSettings((s: VideoSettings) => {
				const allowed = new Set(["8", "10"]);
				const nextDur = allowed.has(String(s.duration))
					? (String(s.duration) as "8" | "10")
					: String(WEB_BOUNDARY_BREAK_DURATION_SEC);
				return {
					...s,
					duration: nextDur as VideoSettings["duration"],
					autoSecondFrame: false,
					motionStyle: "slow-push",
					videoEngine: "minimax-h3",
				};
			});
		} else if (
			mode === "vacuum-inflate" ||
			mode === "creative-motion" ||
			mode === "hand-throw-scene" ||
			mode === "product-explode"
		) {
			const locked =
				mode === "hand-throw-scene"
					? "6"
					: ("4" as VideoSettings["duration"]);
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration: locked as VideoSettings["duration"],
				autoSecondFrame: false,
				videoEngine: "minimax-h3",
			}));
		} else if (isH3ShotRecipeMode(mode)) {
			setWorkflowMode("video-only");
			setUseOriginalImage(true);
			if (!h3ShotRecipeAcceptsReel(mode)) {
				setReferenceAd(null);
				setReferencePreviewUrl(null);
				setReferenceIsVideo(false);
				setResearchReelAnalysis(null);
			}
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration: H3_SHOT_RECIPE_SETTINGS_DURATION[mode],
				autoSecondFrame: false,
				motionStyle:
					mode === "ecom-orbit" || mode === "object-lock"
						? "gentle-orbit"
						: "slow-push",
				videoEngine: "minimax-h3",
			}));
		} else if (mode === "social-drip") {
			// Social drip owns layout — never carry a research/reference MP4 into H3.
			setUseOriginalImage(false);
			setReferenceAd(null);
			setReferencePreviewUrl(null);
			setReferenceIsVideo(false);
			setResearchReelAnalysis(null);
			setVideoSettings((s: VideoSettings) => ({
				...s,
				duration:
					s.duration === "auto" || Number(s.duration) > 8
						? "6"
						: s.duration,
				autoSecondFrame: false,
				motionStyle: "gentle-orbit",
				videoEngine: "minimax-h3",
			}));
		} else {
			motionPosterStillUrlRef.current = null;
			motionPosterEndUrlRef.current = null;
			socialDripStillUrlRef.current = null;
			socialDripEndUrlRef.current = null;
			socialDripPlanRef.current = null;
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
		: (imageUrl ?? uploadPreviewUrl);

  const hasUploadedKeyframe =
		hasProductPhotoLock &&
		(useOriginalImage ||
			workflowMode === "video-only" ||
			promotionMode === "concept");

  const hasFinalImage = usesCompositor
    ? Boolean((imageUrl || productPhoto) && headline.trim())
    : isStoryboardOutput
      ? storyboardScenes.length > 0
      : isCinematicStitchOutput || cinematicStitchReady
				? cinematicScenes.length >= cinematicSceneCount
        : isConceptCinematicSingleOutput
					? cinematicScenes.length >= 1 ||
						Boolean(imageUrl || useOriginalImage)
					: Boolean(
							imageUrl || useOriginalImage || hasUploadedKeyframe,
						);

	const motionPosterCanAutoStill =
		videoCreativeMode === "motion-poster" &&
		(hasProductPhotoLock ||
			(promotionMode === "concept" &&
				Boolean(
					conceptIdea.trim() || headline.trim() || product.trim(),
				)));

	const socialDripCanAutoStill =
		videoCreativeMode === "social-drip" &&
		(hasProductPhotoLock ||
			(promotionMode === "concept" &&
				Boolean(
					conceptIdea.trim() || headline.trim() || product.trim(),
				)));

	const vacuumInflateCanAutoStill =
		videoCreativeMode === "vacuum-inflate" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const creativeMotionCanAutoStill =
		videoCreativeMode === "creative-motion" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const impactPosterCanAutoStill =
		videoCreativeMode === "impact-poster" &&
		(hasProductPhotoLock ||
			(promotionMode === "concept" &&
				Boolean(
					conceptIdea.trim() || headline.trim() || product.trim(),
				)));

	const handThrowCanAutoStill =
		videoCreativeMode === "hand-throw-scene" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const webBoundaryCanAutoStill =
		videoCreativeMode === "web-boundary-break" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const productExplodeCanAutoStill =
		videoCreativeMode === "product-explode" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const bulletElevateCanAutoStill =
		videoCreativeMode === "bullet-product-elevate" &&
		identityRecipeHeroReady({
			promotionMode,
			hasProductPhoto: hasProductPhotoLock,
			hasConceptHero: hasConceptHeroLock,
		});

	const blockbusterCanGenerate =
		videoCreativeMode === "blockbuster" &&
		(hasProductPhotoLock ||
			(promotionMode === "concept" && hasConceptHeroLock));

	const identityRecipeCanAutoStill =
		vacuumInflateCanAutoStill ||
		creativeMotionCanAutoStill ||
		handThrowCanAutoStill ||
		webBoundaryCanAutoStill ||
		productExplodeCanAutoStill ||
		bulletElevateCanAutoStill;

	function identityNeedKeyframeError(): string {
		if (promotionMode === "concept") return m.wizard.h3ShotNeedConceptHero;
		if (videoCreativeMode === "vacuum-inflate") {
			return m.wizard.vacuumInflateNeedKeyframe;
		}
		if (videoCreativeMode === "hand-throw-scene") {
			return m.wizard.handThrowNeedKeyframe;
		}
		if (videoCreativeMode === "web-boundary-break") {
			return m.wizard.webBoundaryNeedKeyframe;
		}
		if (videoCreativeMode === "product-explode") {
			return m.wizard.productExplodeNeedKeyframe;
		}
		if (videoCreativeMode === "bullet-product-elevate") {
			return m.wizard.bulletProductElevateNeedKeyframe;
		}
		return m.wizard.creativeMotionNeedKeyframe;
	}

	const h3ShotRecipeCanGenerate = h3ShotRecipeInputsReady({
		mode: videoCreativeMode,
		promotionMode,
		hasProductPhoto: hasProductPhotoLock,
		hasReferenceVideo: Boolean(referenceAd && referenceIsVideo),
		// Visual lock only — brief/headline text must not unlock Generate.
		hasConceptHero: hasConceptHeroLock,
		hasLifestyleStill: Boolean(imageUrl || hasProductPhotoLock),
	});

  const advancedSection: "image" | "video" | "all" =
		workflowMode === "image-only"
			? "image"
			: workflowMode === "video-only"
				? "video"
				: "all";

	const imageStepHint = isUgcPresenterOutput
		? m.wizard.ugcPresenter.imageStepIntro
		: isCinematicStitchOutput
			? formatCinematicCopy(m.wizard.cinematicStitchImageStepIntro)
    : isConceptCinematicSingleOutput
      ? m.wizard.conceptCinematicSingleImageStepIntro
				: isConceptStoryboardOutput
					? m.wizard.conceptResearchReelStoryboardImageStepIntro
					: promotionMode === "concept" &&
						  workflowMode === "image-only"
        ? m.wizard.conceptSocialImageStepIntro
        : workflowMode === "image-only"
          ? m.wizard.step2Hints["image-only"]
          : m.wizard.step2Hints.combined;

	const videoStepHint = isUgcPresenterOutput
		? m.wizard.ugcPresenter.videoStepIntro
		: isExplosionUnboxStyle(visualStyleId)
			? m.wizard.explosionUnbox.videoStepIntro
		: cinematicStitchReady || isCinematicStitchOutput
			? formatCinematicCopy(m.wizard.cinematicStitchVideoStepIntro)
      : isConceptCinematicSingleOutput
        ? m.wizard.conceptCinematicSingleVideoStepIntro
      : workflowMode === "video-only"
        ? m.wizard.step3Hints["video-only"]
        : m.wizard.step3Hints.combined;

  const estimateStoryboardSceneCount = useCallback((): number => {
		if (storyboardSceneCount !== "auto")
			return Number(storyboardSceneCount);
    const duration = Number(storyboardTrimDuration) || 8;
    if (duration <= 6) return 4;
    if (duration <= 10) return 5;
    return 6;
  }, [storyboardSceneCount, storyboardTrimDuration]);

  const formatEta = useCallback(
		(sec: number): string => {
			const s = Math.max(1, Math.round(sec));
			if (s >= 60) {
				const minutes = Math.max(1, Math.ceil(s / 60));
				return (m.wizard.progressEtaMinutes ?? m.wizard.progressEta)
					.replace("{minutes}", String(minutes))
					.replace("{seconds}", String(s));
			}
			return m.wizard.progressEta.replace("{seconds}", String(s));
		},
		[m.wizard.progressEta, m.wizard.progressEtaMinutes],
	);

	function resolveSetupImageGateMessage(
		reason: SetupImageGateReason,
	): string {
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
		if (
			(referenceAnalyzeBusy || researchReelAnalyzeBusy) &&
			!userReferenceBrief &&
			!referenceAnalyzeNote
		) {
			return m.wizard.referenceBriefAnalyzingWait;
		}
		if (useReferenceVideo && referenceAd && referenceIsVideo) {
			if (
				!storyboardRecipeForbidsReference(storyboardRecipeId) &&
				!researchReelAnalysis &&
				!storyboardPlan &&
				!videoPrompt.trim()
			) {
				return m.wizard.setupReferenceVideoAnalyzeRequired;
			}
		}
		if (isConceptStoryboardOutput && !effectivePromoteName) {
			return m.errors.needHeadline;
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
			if (!hasProductPhotoLock) return m.errors.needPhoto;
		}
		if (isUgcPresenterOutput) {
			if (!product.trim()) return m.errors.needProductName;
			if (!hasProductPhotoLock) return m.errors.needPhoto;
		}
		if (
			(visualStyleId === "info-poster" ||
				isLockedSinglePosterStyle(visualStyleId)) &&
			!headline.trim()
		) {
			return m.errors.needHeadline;
		}
		if (promotionMode === "physical") {
			if (
				imageCreativeMode === "reference-concept" &&
				imageRefPhoto &&
				!hasProductPhotoLock
			) {
				return m.errors.needPhoto;
			}
			if (
				(visualStyleId === "info-poster" ||
					isLockedSinglePosterStyle(visualStyleId)) &&
				!hasProductPhotoLock
			) {
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
      !isRecipeOwnedVideoMode(videoCreativeMode) &&
      (isCreativeVideoStyle(visualStyleId) || isExplosionUnboxStyle(visualStyleId)) &&
      isVideoWorkflow &&
      !creativeVideoBrief.trim() &&
      !headline.trim() &&
      !(promotionMode === "concept" && conceptIdea.trim())
    ) {
      setError(m.errors.creativeBriefRequired);
      return;
    }
		if (
			isStoryboardOutput &&
			promotionMode === "physical" &&
			!product.trim()
		) {
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
			if (
				!researchReelAnalysis &&
				!storyboardPlan &&
				!videoPrompt.trim()
			) {
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
			hasProductPhoto: hasProductPhotoLock,
			isStoryboardOutput,
			preferCompositionRemap,
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
		if (
			workflowMode === "combined" ||
			(workflowMode === "video-only" && isStoryboardOutput)
		) {
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
					? prev.map((slide, i) =>
							i === idx ? { ...slide, imageUrl: url } : slide,
						)
					: prev,
      );
    } else {
      setImageVariantUrls([url]);
      setSelectedVariantIndex(0);
			setCampaignSlides((prev: CampaignSlide[]) => {
        if (prev.length === 0) return prev;
				return prev.map((slide, i) =>
					i === idx ? { ...slide, imageUrl: url } : slide,
				);
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
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
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
				.map((u) =>
					typeof u === "string"
						? normalizeGeneratedImageUrl(u)
						: null,
				)
				.filter((u): u is string => Boolean(u));
      if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(
        urls[0],
        data.endpoint,
        slideIndex,
				refineSlideUrls(),
      );
			if (quickFixCredits > 0)
				setQuickFixCredits((v: number) => Math.max(0, v - 1));
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
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
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
				.map((u) =>
					typeof u === "string"
						? normalizeGeneratedImageUrl(u)
						: null,
				)
				.filter((u): u is string => Boolean(u));
      if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
      applyRefinedImage(
        urls[0],
        data.endpoint,
        slideIndex,
				refineSlideUrls(),
			);
			if (quickFixCredits > 0)
				setQuickFixCredits((v: number) => Math.max(0, v - 1));
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.refineFailed));
		} finally {
			setImageBusy(false);
			setImageJobMeta(null);
		}
	}

	async function applyImageCanvasOverlay(
		layers: import("@/lib/image-canvas-layers").ImageCanvasLayer[],
	) {
		const sourceUrl = resolveRefineSourceUrl();
		if (!sourceUrl) {
			setError(m.errors.needRefineImage);
			return;
		}
		setError(null);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
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
			if (!normalizeGeneratedImageUrl(data.imageUrl))
				throw new Error(m.errors.imageGenNoUrl);
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
		if (
			url.startsWith("/api/pipeline-files/") ||
			isLibraryAssetUrl(url) ||
			url.startsWith("/api/library/download/")
		) {
			if (typeof window === "undefined") return url;
			return normalizeImageSourceUrl(`${window.location.origin}${url}`);
		}
		return "";
	}

	function listExportableSlides(): Array<{
		index: number;
		label: string;
		url: string;
	}> {
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
							? headline.trim() ||
								product.trim() ||
								`Slide ${index + 1}`
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
		if (blockIfCannotAfford(estimateInpaintTokens(1))) return;
		setError(null);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		setImageBusy(true);
		try {
			const { width, height } = await analyzeImageUrl(sourceUrl);
			const maskBlob = await regionsToInpaintMaskBlob(
				ready,
				width,
				height,
			);
			const prompt = regionsInpaintPrompt(ready);
			const fd = new FormData();
			fd.set("source_image_url", sourceUrl);
			fd.set("prompt", prompt);
			fd.set("inpaint_mode", isEraseIntent(prompt) ? "erase" : "fill");
			fd.set(
				"mask_image",
				new File([maskBlob], "mask.png", { type: "image/png" }),
			);
			if (!isEraseIntent(prompt))
				fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set("product_name", effectivePromoteName);
			fd.set("headline", headline.trim());
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("art_style", artStyleId);
			const res = await fetch("/api/inpaint-image", {
				method: "POST",
				body: fd,
				credentials: "include",
			});
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

	async function inpaintGeneratedImage(
		maskBlob: Blob,
		prompt: string,
		mode: "erase" | "fill" = "fill",
	) {
		const sourceUrl = resolveRefineSourceUrl();
		if (!sourceUrl) {
			setError(m.errors.needRefineImage);
			return;
		}
		if (blockIfCannotAfford(estimateInpaintTokens(1))) return;
		setError(null);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		setImageBusy(true);
		try {
			const useErase =
				mode === "erase" || (mode !== "fill" && isEraseIntent(prompt));
			const fd = new FormData();
			fd.set("source_image_url", sourceUrl);
			fd.set("prompt", prompt);
			fd.set("inpaint_mode", useErase ? "erase" : "fill");
			fd.set(
				"mask_image",
				new File([maskBlob], "mask.png", { type: "image/png" }),
			);
			if (!useErase) fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set("product_name", effectivePromoteName);
			fd.set("headline", headline.trim());
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("art_style", artStyleId);
			const res = await fetch("/api/inpaint-image", {
				method: "POST",
				body: fd,
				credentials: "include",
			});
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
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		setImageBusy(true);
		try {
			let hintFile: File | undefined;
			try {
				const blob = await buildRegionHintImageBlob(
					`${imageUrl}${imageUrl?.includes("?") ? "&" : "?"}v=${imageGenKey}`,
					regions,
				);
				hintFile = new File([blob], "region-hint.png", {
					type: "image/png",
				});
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
				.map((u) =>
					typeof u === "string"
						? normalizeGeneratedImageUrl(u)
						: null,
				)
				.filter((u): u is string => Boolean(u));
			if (!urls.length) throw new Error(m.errors.imageGenNoUrl);
			applyRefinedImage(
				urls[0],
				data.endpoint,
				slideIndex,
				refineSlideUrls(),
			);
			if (quickFixCredits > 0)
				setQuickFixCredits((v: number) => Math.max(0, v - 1));
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
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		setImageBusy(true);
		try {
			const data = await postBurnImageText({
				image_url: sourceUrl,
				layers,
			});
			if (!normalizeGeneratedImageUrl(data.imageUrl))
				throw new Error(m.errors.imageGenNoUrl);
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
		return seedBrandCanvasLayers({
			headline,
			subline,
			brandKit,
			brandProfile,
		});
	}

	function quickFixVideo(requirement: string, opts?: Partial<VideoSettings>) {
		if (quickFixCredits <= 0) return;
		const merged = [promptExtra.trim(), requirement]
			.filter(Boolean)
			.join(" | ");
		setPromptExtra(merged);
		if (opts)
			setVideoSettings((prev: VideoSettings) => ({ ...prev, ...opts }));
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
		if (
			promotionMode === "concept" &&
			videoCreativeMode === "motion-poster"
		) {
			return Boolean(
				conceptIdea.trim() ||
				headline.trim() ||
				product.trim() ||
				productPhoto ||
				imageRefPhoto,
			);
		}
    if (usesCompositor) return Boolean(productPhoto && headline.trim());
    if (isStoryboardOutput) {
			if (isConceptStoryboardOutput) {
				// Align with generateImage(): conceptIdea / headline / product is enough.
				// Story brief + DeepSeek plan are optional (API plans on the fly). Requiring
				// headline||plan||brief blocked research flows that only set conceptIdea.
				return Boolean(effectivePromoteName);
			}
			return Boolean(hasProductPhotoLock && product.trim());
		}
		if (isUgcPresenterOutput) {
			return Boolean(hasProductPhotoLock && product.trim());
    }
    if (isCinematicStitchOutput || isConceptCinematicSingleOutput) {
      return Boolean(
				headline.trim() ||
				creativeVideoBrief.trim() ||
				product.trim() ||
				conceptIdea.trim(),
			);
		}
		if (
			promotionMode === "concept" &&
			conceptStyleAllowsTextOnlyImage(visualStyleId)
		) {
			if (
				visualStyleId === "service-promo" ||
				visualStyleId === "website-launch"
			) {
				// Shop name preferred; concept topic is enough for text-only concept ads.
				if (
					!business.trim() &&
					!conceptIdea.trim() &&
					!effectivePromoteName
				) {
					return false;
				}
			}
			// On-image hook is required for these styles — concept topic alone is not enough.
			if (
				conceptStyleRequiresHeadline(visualStyleId) &&
				!headline.trim()
			) {
				return false;
			}
			const hasConceptCopy = Boolean(
				headline.trim() || conceptIdea.trim() || effectivePromoteName,
			);
      if (imageCreativeMode === "reference-concept") {
				// Research / style-ref path: need ref + copy; product photo optional.
				return Boolean(imageRefPhoto) && hasConceptCopy;
			}
			if (effectiveImageMode === "describe")
				return imagePrompt.trim().length > 0;
			return hasConceptCopy || Boolean(productPhoto || imageRefPhoto);
		}
		if (
			visualStyleId === "info-poster" ||
			isLockedSinglePosterStyle(visualStyleId)
		) {
      return Boolean(productPhoto && headline.trim());
    }
    if (isBrandVisualStyle(visualStyleId)) {
			return Boolean(productPhoto && headline.trim());
    }
    if (imageCreativeMode === "reference-concept") {
			return Boolean(hasProductPhotoLock && imageRefPhoto);
		}
		if (effectiveImageMode === "reference") {
			return Boolean(imageRefPhoto);
		}
		if (effectiveImageMode === "describe")
			return imagePrompt.trim().length > 0;
		return hasProductPhotoLock;
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

		const hasExistingImageOutput = Boolean(
			imageUrlRef.current ||
				imageUrl ||
				storyboardScenes.length > 0 ||
				campaignSlides.length > 0 ||
				cinematicScenes.length > 0,
		);

		// Preflight image job cost before any fal call.
		{
			const isStoryboard =
				workflowMode === "combined" || isStoryboardOutput;
			const out = effectiveImageOutputMode;
			const imageCost = estimateImageJobTokens({
				mode: isStoryboard
					? "storyboard"
					: out === "teaching-carousel" || out === "carousel"
						? "teaching_carousel"
						: out === "ab"
							? "ab"
							: out === "campaign"
								? "campaign"
								: "single",
				sceneCount: isStoryboard
					? estimateStoryboardSceneCount()
					: out === "teaching-carousel" || out === "carousel"
						? referenceCarouselSlideCount
						: undefined,
				numImages:
					out === "ab" ? 2 : out === "campaign" ? 3 : 1,
				passesPerScene: isStoryboard
					? storyboardImagePassesPerScene()
					: 1,
			});
			if (blockIfCannotAfford(imageCost)) return null;
		}

    if (usesCompositor) {
      if (!headline.trim()) {
        setError(m.errors.needHeadline);
				return null;
      }
      if (!productPhoto) {
        setError(m.errors.needPhoto);
				return null;
			}
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
				return null;
			}
			setImageJobMeta({
				kind: "image",
				startedAt: Date.now(),
				sceneCount: 1,
			});
      setImageBusy(true);
      try {
				const url = await composeImage();
				setImageUrl(url);
				imageUrlRef.current = url;
				return url;
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.polishFailed));
				return null;
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
		}

		if (
			(visualStyleId === "info-poster" ||
				isLockedSinglePosterStyle(visualStyleId)) &&
			!headline.trim()
		) {
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
			let storyboardPhoto = productPhoto;
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
				if (!storyboardPhoto) {
					storyboardPhoto = await resolveHydratedProductPhoto();
					if (storyboardPhoto) setProductPhoto(storyboardPhoto);
				}
				if (!storyboardPhoto) {
        setError(m.errors.needPhoto);
					return null;
				}
      }
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
				return null;
			}
      setImageJobMeta({
        kind: "storyboard",
        startedAt: Date.now(),
        sceneCount: estimateStoryboardSceneCount(),
      });
      setImageBusy(true);
      try {
				// Landing / another tab may have updated the kit — prefer freshest before Mode A/B.
				const freshKit = loadBrandKitFromStorage();
				const liveKit = preferNewerBrandKit(brandKit, freshKit);
				const kitForGen = brandKitForGeneration(liveKit) ?? liveKit;
				if (liveKit !== brandKit) {
					setBrandKit(liveKit);
				}

				const buildStoryboardFd = (
					planForGen: VideoStoryboardPlan | null,
					sceneIndexes?: number[],
				) => {
        const fd = new FormData();
        fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
					fd.set("promotion_mode", promotionMode);
					if (brandProfile)
						fd.set("brand_profile", JSON.stringify(brandProfile));
					fd.set("brand_kit", JSON.stringify(kitForGen));
					fd.set(
						"product_name",
						isConceptStoryboardOutput
							? effectivePromoteName
							: product.trim(),
					);
					if (conceptIdea.trim())
						fd.set("concept_idea", conceptIdea.trim());
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
					fd.set("image_text_mode", imageTextMode);
					// Sharp logo stamp is post-gen — only need /edit when product/style refs are sent.
					const needsEdit =
						(referenceStrategy.sendPixelsToFal &&
							Boolean(storyboardPhoto?.size || productPhoto?.size)) ||
						(Boolean(imageRefPhoto?.size) &&
							(referenceStrategy.kind === "style-only" ||
								referenceStrategy.kind === "mood-only" ||
								referenceStrategy.kind === "layout-transfer" ||
								referenceStrategy.kind === "composition-remap"));
					fd.set(
						"endpoint",
						needsEdit ? EDIT_ENDPOINT : TEXT_ENDPOINT,
					);
					if (planForGen) {
						fd.set("storyboard_plan", JSON.stringify(planForGen));
					}
					if (researchReelAnalysis) {
						fd.set(
							"research_reel_analysis",
							JSON.stringify(researchReelAnalysis),
						);
					}
					if (sceneIndexes?.length) {
						fd.set("scene_indexes", sceneIndexes.join(","));
					}
					attachReferenceToForm(fd);
					if (storyboardPhoto && !fd.get("reference_image")) {
						fd.set("reference_image", storyboardPhoto);
					}
					const activeProjectId =
						typeof window !== "undefined"
							? window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)
							: null;
					if (activeProjectId?.trim()) {
						fd.set("project_id", activeProjectId.trim());
					}
					return fd;
				};

				// Nano Banana often takes 2–3 min/scene; Vercel caps ~300–800s — generate in batches of 2.
				const STORYBOARD_BATCH_SIZE = 2;
				let planForGen = storyboardPlan;

				const firstIndexes = planForGen
					? planForGen.scenes
							.slice(0, STORYBOARD_BATCH_SIZE)
							.map((s) => s.imageIndex)
					: [1, 2];
				const first = await postStoryboardImages(
					buildStoryboardFd(planForGen, firstIndexes),
				);
				planForGen = first.plan;
				const mergedScenes: StoryboardSceneResult[] = [...first.scenes];
				setStoryboardPlan(planForGen);
				setStoryboardScenes(
					[...mergedScenes].sort(
						(a, b) => a.imageIndex - b.imageIndex,
					),
				);
				setImageJobMeta({
					kind: "storyboard",
					startedAt: Date.now(),
					sceneCount: planForGen.scenes.length,
				});

				const remaining = planForGen.scenes
					.map((s) => s.imageIndex)
					.filter(
						(idx) =>
							!mergedScenes.some((s) => s.imageIndex === idx),
					);

				let seedancePrompt = first.seedancePrompt;
				let endpoint = first.endpoint;
				if (first.logoNote?.trim()) setVideoNote(first.logoNote.trim());
				for (
					let i = 0;
					i < remaining.length;
					i += STORYBOARD_BATCH_SIZE
				) {
					const batch = remaining.slice(i, i + STORYBOARD_BATCH_SIZE);
					const data = await postStoryboardImages(
						buildStoryboardFd(planForGen, batch),
					);
					planForGen = data.plan;
					seedancePrompt = data.seedancePrompt;
					endpoint = data.endpoint;
					mergedScenes.push(...data.scenes);
					setStoryboardScenes(
						[...mergedScenes].sort(
							(a, b) => a.imageIndex - b.imageIndex,
						),
					);
				}

        applyGeneratedStoryboard(
					[...mergedScenes].sort(
						(a, b) => a.imageIndex - b.imageIndex,
					),
					planForGen,
					seedancePrompt,
					endpoint,
        );
      } catch (e: unknown) {
        setError(friendlyError(e, m.errors.storyboardFailed));
      } finally {
        setImageBusy(false);
        setImageJobMeta(null);
      }
			return null;
    }

		const cinematicSceneTarget = isConceptCinematicStyle(visualStyleId)
			? cinematicSceneCount
			: 0;
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
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
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
					[
						headline.trim(),
						subline.trim(),
						offer.trim(),
						conceptIdea.trim(),
					]
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
						referenceImageNote:
							conceptImageVisionNote.trim() || undefined,
            artStyleId,
            sceneCount: cinematicSceneTarget,
          }),
        });
				const planData = await readGenerateJson(planRes);
				if (!planRes.ok)
					throw new Error(
						(planData.error as string) ?? m.errors.storyboardFailed,
					);
				const plan = planData.plan as CinematicReelPlan;
        setCinematicReelPlan(plan);

				const freshKit = loadBrandKitFromStorage();
				const liveKit = preferNewerBrandKit(brandKit, freshKit);
				const kitForCinematic =
					brandKitForGeneration(liveKit) ?? liveKit;
				if (liveKit !== brandKit) setBrandKit(liveKit);

        const genRes = await fetch("/api/generate-cinematic-scenes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            aspect_ratio: effectiveImageAspectRatio,
            art_style: artStyleId,
						brand_kit: kitForCinematic,
						// Top-right by default so burned captions at bottom stay clear.
						logo_placement:
							quickFixLogoPlacement === "bottom-right" ||
							quickFixLogoPlacement === "bottom-left"
								? "top-right"
								: quickFixLogoPlacement,
          }),
        });
				const genData = await readGenerateJson(genRes);
				if (!genRes.ok)
					throw new Error(
						(genData.error as string) ?? m.errors.storyboardFailed,
					);
        const scenes = genData.scenes as CinematicSceneResult[];
				cinematicLogoIntegratedRef.current = Boolean(
					genData.logoIntegrated,
				);
        setCinematicScenes(scenes);
        setImageUrl(scenes[0]?.imageUrl ?? null);
        setImageVariantUrls(scenes.map((s) => s.imageUrl));
        setSelectedVariantIndex(0);
				setLastImageEndpoint(
					(genData.endpoint as string | undefined) ?? null,
				);
				if (
					typeof genData.logoNote === "string" &&
					genData.logoNote.trim()
				) {
					setVideoNote(genData.logoNote.trim());
				}
        setVideoPrompt(
					scenes
						.map((s) => s.videoMotionPrompt)
						.filter(Boolean)
						.join(" · "),
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
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
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
				if (brandProfile)
					fd.set("brand_profile", JSON.stringify(brandProfile));
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
					referenceStrategy.sendPixelsToFal
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
				);
				const res = await fetch("/api/generate-campaign", {
					method: "POST",
					body: fd,
				});
				const data = await readGenerateJson(res);
				if (!res.ok)
					throw new Error(
						(data.error as string) ?? m.errors.campaignFailed,
					);
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
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
				return null;
			}
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
				// Product kit angles go via attachReferenceToForm → product_angle_images only.
				// Do not send them as carousel_reference_images (that confuses slide-count prompts).
				if (productPhoto) {
					fd.set("reference_image", productPhoto);
				}
				attachReferenceToForm(fd);
				fd.set(
					"endpoint",
					referenceStrategy.sendPixelsToFal
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
				);
				const res = await fetch("/api/generate-teaching-carousel", {
					method: "POST",
					body: fd,
				});
				const data = await readGenerateJson(res);
				if (!res.ok)
					throw new Error(
						(data.error as string) ?? m.errors.campaignFailed,
					);
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
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
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
				const data = await readGenerateJson(res);
				if (!res.ok)
					throw new Error(
						(data.error as string) ?? m.errors.polishFailed,
					);
				notifyCreditBalance(readCreditBalanceFromResponse(data));
				const urls = (data.imageUrls as string[] | undefined) ?? [
					data.imageUrl as string,
				];
				return applyGeneratedImages(
					urls,
					data.endpoint as string | undefined,
				);
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
			if (!headline.trim() && !effectivePromoteName && !business.trim()) {
        setError(m.errors.needHeadline);
				return null;
			}
			if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
				return null;
			}
			setImageJobMeta({
				kind: "image",
				startedAt: Date.now(),
				sceneCount: 1,
			});
      setImageBusy(true);
      try {
				const fd = new FormData();
				fd.set("visual_style", visualStyleId);
				fd.set("art_style", artStyleId);
				if (brandProfile) {
					fd.set("brand_profile", JSON.stringify(brandProfile));
				}
				fd.set("brand_kit", JSON.stringify(brandKit));
				fd.set("product_name", effectivePromoteName || business.trim());
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
				if (videoCreativeMode === "motion-poster") {
					fd.set("motion_poster", "1");
					fd.set(
						"motion_poster_dialect",
						previewMotionPosterDialect(),
					);
					fd.set("image_text_mode", "textless");
				}
				// Let the server run the single-still planner + build the fal prompt.
				fd.set(
					"endpoint",
					referenceStrategy.sendPixelsToFal
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
				);
				fd.set(
					"num_images",
					effectiveImageOutputMode === "ab" ? "2" : "1",
				);
				fd.set("image_output_mode", effectiveImageOutputMode);
				// No product/style pixels — logo is not auto-added; user adds it later.

        const res = await fetch("/api/generate-image", {
          method: "POST",
					body: fd,
				});
				const data = await readGenerateJson(res);
				if (!res.ok)
					throw new Error(
						(data.error as string) ?? m.errors.polishFailed,
					);
				notifyCreditBalance(readCreditBalanceFromResponse(data));
				const urls = (data.imageUrls as string[] | undefined) ?? [
					data.imageUrl as string,
				];
				return applyGeneratedImages(
					urls,
					data.endpoint as string | undefined,
				);
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
				referenceStrategy.kind === "composition-remap" ||
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
		} else if (needsProductUpload && !hasProductPhotoLock) {
      setError(m.errors.needPhoto);
			return null;
		}

		// Library reopen may only keep a preview URL — rebuild a File before fal upload.
		let productPhotoForGen = productPhoto;
		if (!productPhotoForGen && hasProductPhotoLock) {
			productPhotoForGen = await resolveHydratedProductPhoto();
			if (productPhotoForGen) setProductPhoto(productPhotoForGen);
		}
		if (needsProductUpload && !productPhotoForGen && !hasProductPhotoLock) {
			setError(m.errors.needPhoto);
			return null;
		}

		if (!(await forkBeforePaidRegenerate(hasExistingImageOutput))) {
			return null;
		}

		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
    setImageBusy(true);
		trackGenerateStarted("image", {
			style: visualStyleId,
			mode: effectiveImageOutputMode,
		});
		try {
			if (
				imageRefPhoto &&
				productPhotoForGen &&
				imageCreativeMode !== "reference-concept"
			) {
        setVideoNote(m.wizard.imageRefAutoModeNote);
      }
      const fd = new FormData();
      fd.set("visual_style", visualStyleId);
      fd.set("art_style", artStyleId);
      if (brandProfile) {
        fd.set("brand_profile", JSON.stringify(brandProfile));
      }
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName || product.trim()
					: product.trim(),
			);
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
			fd.set(
				"endpoint",
				referenceStrategy.sendPixelsToFal || Boolean(productPhotoForGen)
					? EDIT_ENDPOINT
					: TEXT_ENDPOINT,
			);
      fd.set("num_images", effectiveImageOutputMode === "ab" ? "2" : "1");
			fd.set("image_output_mode", effectiveImageOutputMode);
			if (videoCreativeMode === "motion-poster") {
				fd.set("motion_poster", "1");
				fd.set("motion_poster_dialect", previewMotionPosterDialect());
				fd.set("image_text_mode", "textless");
			}
			attachReferenceToForm(fd);
			if (productPhotoForGen && !fd.get("reference_image")) {
				fd.set("reference_image", productPhotoForGen);
			}

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			if (!urls.some((u) => normalizeGeneratedImageUrl(u))) {
        throw new Error(m.errors.imageGenNoUrl);
      }
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			trackGenerateSuccess("image", {
				style: visualStyleId,
				count: urls.length,
			});
			return applied;
    } catch (e: unknown) {
			trackGenerateFailed("image", { style: visualStyleId });
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
		if (isStoryboardOutput && !storyboardGridApproved) {
			setError(m.wizard.storyboardApproveRequiredHint);
      return;
    }
		if (
			(isCinematicStitchOutput || cinematicStitchReady) &&
			cinematicScenes.length < cinematicSceneCount
		) {
			setError(formatCinematicCopy(m.errors.cinematicStitchNeedScenes));
			return;
		}
		if (
			isConceptCinematicSingleOutput &&
			cinematicScenes.length < 1 &&
			!imageUrl
		) {
      setError(m.errors.needGeneratedImage);
      return;
    }
    if (!hasFinalImage) {
      setError(
				!usesCompositor &&
					productPhoto &&
					!imageUrl &&
					!useOriginalImage
          ? m.errors.needAiImage
					: workflowMode === "image-only" &&
						  effectiveImageMode === "describe"
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
    if (!file) {
      setReferenceResearchCdnUrl(null);
      setReferenceResearchPlatform(null);
    }
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
								m.wizard.referenceVideoTooLong.replace(
									"{seconds}",
									String(Math.round(dur)),
								),
              );
            }
          }
        };
        v.src = url;
      }
    }
  }

  function setReferenceResearchCdn(input: {
    url: string | null;
    platform: import("@/lib/content-research-types").ContentPlatform | null;
  }) {
    setReferenceResearchCdnUrl(input.url);
    setReferenceResearchPlatform(input.platform);
  }

	async function ensureReferenceVideoFalUrl(refVideo: File): Promise<string> {
		if (referenceVideoFalUrl?.startsWith("http"))
			return referenceVideoFalUrl;
		const fd = new FormData();
		fd.append("video", refVideo);
		const res = await fetch("/api/prepare-reference-video", {
			method: "POST",
			body: fd,
		});
		const data = await res.json();
		if (!res.ok) {
			throw new Error(
				(data.error as string | undefined) ?? m.errors.videoFailed,
			);
		}
		const url = String(data.videoUrl ?? "");
		if (!url.startsWith("http")) throw new Error(m.errors.videoFailed);
		setReferenceVideoFalUrl(url);
		if (typeof data.durationSec === "number")
			setRefVideoDurationSec(data.durationSec);
		return url;
	}

	/**
	 * DeepSeek fuse: reel analysis + product photo + exact duration → better R2V script.
	 * Returns the prompt/analysis to use immediately (setState is async).
	 */
	async function refineResearchVideoScriptIfNeeded(): Promise<{
		analysis: typeof researchReelAnalysis;
		videoPrompt: string;
	}> {
		const baselineAnalysis = researchReelAnalysis;
		const baselinePrompt = videoPrompt.trim();
		if (!baselineAnalysis?.seedancePrompt?.trim()) {
			return { analysis: baselineAnalysis, videoPrompt: baselinePrompt };
		}
		const promoteName = wizardPromoteName({
			promotionMode,
			product,
			headline,
			conceptIdea,
		});
		if (!promoteName) {
			return { analysis: baselineAnalysis, videoPrompt: baselinePrompt };
		}
		const durationSec = resolveWizardOutputDurationSec(videoSettings);
		const productKey = productPhoto
			? `${productPhoto.name}:${productPhoto.size}:${productPhoto.lastModified}`
			: imageUrl || "no-product";
		const cacheKey = `${referenceAdIdentity ?? "no-reel"}:${durationSec}:${productKey}:${promoteName}`;
		if (researchScriptRefineKeyRef.current === cacheKey) {
			return {
				analysis: baselineAnalysis,
				videoPrompt: baselinePrompt || baselineAnalysis.seedancePrompt,
			};
		}

		const fd = new FormData();
		fd.set("research_reel_analysis", JSON.stringify(baselineAnalysis));
		fd.set("product_name", promoteName);
		fd.set("headline", headline.trim());
		fd.set("subline", subline.trim());
		fd.set("offer", offer.trim());
		fd.set("duration", String(durationSec));
		fd.set("promotion_mode", promotionMode);
		if (productPhoto) fd.set("product_photo", productPhoto);
		else if (imageUrl?.startsWith("http"))
			fd.set("product_photo_url", imageUrl);

		const res = await fetch("/api/refine-research-video-script", {
			method: "POST",
			body: fd,
		});
		const data = await res.json();
		if (!res.ok) {
			console.warn("[refine-research-video-script]", data.error);
			return { analysis: baselineAnalysis, videoPrompt: baselinePrompt };
		}
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const prompt = String(data.seedancePrompt ?? "").trim();
		if (!prompt) {
			return { analysis: baselineAnalysis, videoPrompt: baselinePrompt };
		}
		researchScriptRefineKeyRef.current = cacheKey;
		const nextAnalysis = {
			...baselineAnalysis,
			seedancePrompt: prompt,
			motionSummary:
				String(data.motionSummary ?? "").trim() ||
				baselineAnalysis.motionSummary,
			productionNotesZh:
				String(data.productionNotesZh ?? "").trim() ||
				baselineAnalysis.productionNotesZh,
		};
		setResearchReelAnalysis(nextAnalysis);
		setVideoPrompt(prompt);
		const beats = String(data.scriptBeatsZh ?? "").trim();
		if (beats) {
			setResearchReelAnalyzeNote(beats);
		}
		return { analysis: nextAnalysis, videoPrompt: prompt };
  }

  async function makeReferenceVideo(refVideo: File): Promise<string> {
		const refined = await refineResearchVideoScriptIfNeeded();
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const outputDuration =
			videoSettings.duration === "auto" ||
			Number(videoSettings.duration) > 15
				? "8"
				: String(videoSettings.duration);
		const refFalUrl = await ensureReferenceVideoFalUrl(refVideo);
		const reelPlan = resolveVideoEnginePlan({
			hasReel: true,
			faceHeavy: isFaceHeavyVideoJob({
				visualStyleId,
				videoCreativeMode,
				subjectFraming,
			}),
		});
		const useH3 = reelPlan.firstEngine === "minimax-h3";
		const heroProduct = await resolveHydratedProductPhoto();
		const promoteName = wizardPromoteName({
			promotionMode,
			product,
			headline,
			conceptIdea,
		});
    const fd = new FormData();
    fd.set("mode", "reference");
		fd.set("promotion_mode", promotionMode);
		const seedanceR2vPrompt = buildResearchR2vPrompt({
			researchAnalysis: refined.analysis,
			videoPrompt: refined.videoPrompt,
			conceptMode: promotionMode === "concept",
			fallbackPrompt:
				buildReferenceVideoPrompt(getPromptVars(), templateId) +
				" Follow @Video1 shot structure and timing as closely as the model allows. Do not apply a generic slow push-in unless @Video1 uses it.",
		});
		const h3ProductSwap =
			useH3 && Boolean(heroProduct) && promotionMode !== "concept";
		fd.set(
			"prompt",
			h3ProductSwap
				? buildH3ReferenceReelProductPrompt({
						durationSec: Number(outputDuration) || 6,
						productName: promoteName,
						motionSummary:
							refined.analysis?.motionSummary?.trim() ||
							refined.videoPrompt,
					})
				: seedancePromptForGenerate(seedanceR2vPrompt, {
						hasReferenceVideo: true,
					}),
		);
		fd.set("reference_video_urls", refFalUrl);
		const refSec = refVideoDurationSec;
    if (refSec && Number.isFinite(refSec)) {
      fd.set("ref_duration_sec", String(refSec));
    }
		if (useH3) {
			if (heroProduct) {
				fd.append("reference_images", heroProduct);
			} else if (workflowMode === "combined" && imageUrl) {
				fd.set("image_start_url", imageUrl);
			} else if (imageUrl) {
				fd.set("image_start_url", imageUrl);
			}
		} else if (workflowMode === "combined" && imageUrl) {
			fd.set("image_ref_url", imageUrl);
		} else if (heroProduct) {
			fd.append("images", heroProduct);
		} else if (imageUrl) {
			fd.set("image_ref_url", imageUrl);
		}
    fd.set("resolution", vOpts.resolution);
		fd.set("duration", outputDuration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
		fd.set("generate_audio", "false");
    fd.set("reference_negative_prompt", buildReferenceVideoNegative(tpl));
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
		fd.set("fast", reelPlan.seedanceFast ? "true" : "false");

		if (useH3) {
			fd.set("reference_video_url", refFalUrl);
		}
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{
				method: "POST",
				body: fd,
			},
		);
    const data = await readGenerateJson(res);
    if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const usedFallback =
			data.generationMode === "kling-storyboard-fallback" ||
			String(data.generationMode ?? "").startsWith(
				"minimax-h3-fallback",
			) ||
			Boolean(data.seedanceBlockedCode);
		const pathNote = wizardVideoReadyExtraNote(data);
    const notes = [
			m.wizard.researchReelCopyingNote,
			usedFallback
				? String(data.generationMode ?? "").startsWith("minimax-h3")
					? m.wizard.seedanceToMinimaxH3FallbackNote
					: m.wizard.seedanceToKlingFallbackNote
				: useH3
					? m.wizard.videoEngineMinimaxH3
					: m.wizard.referenceModeNote,
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
			return new File([blob], "keyframe.png", {
				type: blob.type || "image/png",
			});
    } catch {
      return null;
    }
  }

	/** Reopen-from-library: rebuild a File from the durable preview URL. */
	async function resolveHydratedProductPhoto(): Promise<File | null> {
		if (productPhoto) return productPhoto;
		const preview = persistableMediaUrl(uploadPreviewUrl);
		if (!preview) return null;
		return (
			(await fileFromPersistableUrl(preview, "product-photo")) ??
			(await fileFromImageUrl(preview))
		);
	}

	/** Identity recipes: product photo, packaging, generated still, or brand logo. */
	async function resolveIdentityHeroFile(): Promise<File | null> {
		const photo = await resolveHydratedProductPhoto();
		if (photo) return photo;
		if (packagingPhoto) return packagingPhoto;
		const urls = [
			persistableMediaUrl(imageUrl),
			brandKit.logoUrl?.trim() || null,
		].filter((u): u is string => Boolean(u));
		for (const url of urls) {
			const file = await fileFromImageUrl(url);
			if (file) return file;
		}
		return null;
	}

	async function bindIdentityHeroToKeyframeForm(
		fd: FormData,
		needMessage: string,
	): Promise<void> {
		const heroFile = await resolveIdentityHeroFile();
		if (!heroFile) throw new Error(needMessage);
		fd.set("endpoint", EDIT_ENDPOINT);
		// FX plates: product photo only — never attach research/style ref (IMAGE 2)
		// or dual layout-transfer; that swaps SKU when name and photo disagree.
		fd.set("image_creative_mode", "promo-ai");
		fd.set("image_mode", "product-ad");
		fd.set("reference_image", heroFile);
	}

	/** Same-origin relative paths so the server can materialize library/pipeline assets. */
	function toGenerateReferenceUrl(url: string): string {
		const trimmed = url.trim();
		if (!trimmed) return "";
		if (trimmed.startsWith("blob:")) return trimmed;
		try {
			if (
				trimmed.startsWith("http://") ||
				trimmed.startsWith("https://")
			) {
				const parsed = new URL(trimmed);
				if (
					typeof window !== "undefined" &&
					parsed.origin === window.location.origin
				) {
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

		const res = await fetch("/api/generate-image", {
			method: "POST",
			body: fd,
		});
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

		// MiniMax H3 first (single clip from stills); Kling per-scene + stitch if H3 fails.
		return makeKlingStoryboardVideo(orderedScenes, prompt);
	}

	async function makeKlingStoryboardVideo(
		scenes: StoryboardSceneResult[],
		seedancePrompt: string,
	): Promise<string> {
		setVideoPhase("video");
		const freshKit = loadBrandKitFromStorage();
		const liveKit = preferNewerBrandKit(brandKit, freshKit);
		if (liveKit !== brandKit) setBrandKit(liveKit);
		const logoOn = brandKitWantsLogo(liveKit);

		const motionPlan =
			seedancePrompt.trim() ||
			storyboardPlan?.seedancePrompt?.trim() ||
			videoPrompt.trim() ||
			"";

    const fd = new FormData();
		fd.set("promotion_mode", promotionMode);
		fd.set(
			"theme",
			storyboardPlan?.theme?.trim() || headline.trim() || product.trim(),
		);
		fd.set("total_duration_sec", storyboardTrimDuration);
		fd.set("aspect_ratio", imageAspectRatio || "9:16");
		if (motionPlan) fd.set("motion_prompt", motionPlan);
		fd.set(
			"scenes_meta",
			JSON.stringify(
				scenes.map((s, i) => {
					const planScene =
						storyboardPlan?.scenes?.find(
							(p) => p.imageIndex === s.imageIndex,
						) ?? storyboardPlan?.scenes?.[i];
					const bible = storyboardPlan?.lookBible;
					const lookBibleGrade = bible
						? [
								bible.palette,
								bible.lighting,
								bible.materials,
								bible.negatives,
							]
								.filter(Boolean)
								.join("; ")
								.slice(0, 180)
						: storyboardPlan?.visualDirection?.slice(0, 120);
					return {
						startSec: s.startSec,
						endSec: s.endSec,
						sceneDescriptionZh: s.sceneDescriptionZh,
						imagePrompt: s.imagePrompt ?? planScene?.imagePrompt,
						role: s.role,
						cameraMotionEn: planScene?.cameraMotionEn,
						lightingEn: planScene?.lightingEn,
						lookBibleGrade: lookBibleGrade || undefined,
						endWithBrandLogo: logoOn,
						useBrandLogo: logoOn,
					};
				}),
			),
		);
		const refCount = await appendStoryboardImageRefs(fd, scenes);
		if (refCount < 1) throw new Error(m.errors.needKeyframe);
		if (refCount !== scenes.length) {
			throw new Error(
				(
					m.errors.storyboardSceneImagesMissing ??
					"Could not load all storyboard scene images ({got}/{expected}). Re-generate the missing still, then try video again."
				)
					.replace("{got}", String(refCount))
					.replace("{expected}", String(scenes.length)),
			);
		}
		fd.set("expected_scene_count", String(scenes.length));
		fd.set("storyboard_grid_approved", storyboardGridApproved ? "1" : "0");
		fd.set("image_text_mode", imageTextMode);
		fd.set("resolution", capVideoRes(videoSettings.resolution));
		if (storyboardPreferEngineRef.current) {
			fd.set("prefer_engine", storyboardPreferEngineRef.current);
		}
		fd.set(
			"face_heavy",
			isFaceHeavyVideoJob({
				visualStyleId,
				videoCreativeMode,
				subjectFraming,
			})
				? "1"
				: "0",
		);

		// @Video1 spine — fail loud if a reference MP4 was attached but fal prepare dies.
		if (referenceVideoFalUrl?.startsWith("http")) {
			fd.set("reference_video_url", referenceVideoFalUrl);
		} else if (referenceAd && referenceIsVideo) {
			try {
				const prepared = await ensureReferenceVideoFalUrl(referenceAd);
				if (!prepared.startsWith("http")) {
					throw new Error(m.errors.referenceVideoPrepareFailed);
				}
				fd.set("reference_video_url", prepared);
			} catch (err) {
				throw err instanceof Error
					? err
					: new Error(m.errors.referenceVideoPrepareFailed);
			}
		}

		const res = await fetch("/api/generate-storyboard-video", {
			method: "POST",
			body: fd,
		});
		const data = await readGenerateJson(res);
		if (!res.ok) {
			const code = typeof data.code === "string" ? data.code : "";
			if (code === STORYBOARD_ENGINE_CHOICE_CODE) {
				throw new StoryboardEngineChoiceError({
					balance: Number(data.balance) || 0,
					h3Cost: Number(data.h3Cost) || 0,
					klingCost: Number(data.klingCost) || 0,
				});
			}
			if (code === "KLING_DURATION_UNREACHABLE") {
				throw new Error(m.errors.klingDurationUnreachable);
			}
			if (code === "REFERENCE_VIDEO_REQUIRED") {
				throw new Error(m.errors.referenceVideoPrepareFailed);
			}
			if (
				code === "INSUFFICIENT_TOKENS" &&
				data.hint === "tvc_needs_paid_plan"
			) {
				throw new Error(m.errors.tvcNeedsPaidPlan);
			}
			throw new Error(
				(typeof data.error === "string" ? data.error : null) ??
					m.errors.klingStoryboardFailed,
			);
		}
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const usedSeedance = String(data.generationMode ?? "").includes(
			"seedance",
		);
		const usedH3 = String(data.generationMode ?? "").startsWith(
			"minimax-h3",
		);
		const clipDurations = Array.isArray(data.clipDurations)
			? (data.clipDurations as number[])
			: undefined;
		const probedSec = Number(data.outputDurationSec);
		const videoDurationSec =
			Number.isFinite(probedSec) && probedSec > 0
				? probedSec
				: clipDurations?.length
					? clipDurations.reduce((a, b) => a + Number(b), 0)
					: Number(storyboardTrimDuration) || undefined;
		if (videoDurationSec && videoDurationSec > 0) {
			lastStoryboardVideoDurationSecRef.current = videoDurationSec;
		}
		const timingManifest = videoDurationSec
			? buildSingleClipManifest(videoDurationSec, {
					source: usedSeedance || usedH3 ? "seedance" : "kling",
					engine: usedSeedance
						? "seedance"
						: usedH3
							? "unknown"
							: "kling",
					timingSource:
						Number(data.outputDurationSec) > 0
							? "probed"
							: "reported",
				})
			: null;
		if (timingManifest) {
			lastVideoTimingManifestRef.current = timingManifest;
			setVideoTimingManifest(timingManifest);
		}
		const storyboardCaps = captionLinesFromStoryboardScenes(scenes, {
			videoDurationSec,
			clipBoundaries: timingManifest?.clipBoundaries,
		});
		if (storyboardCaps.length) {
			setCaptionLines(storyboardCaps);
			// Edit + burn in /captions — keep master clean for flexible post.
			setCaptionBurnEnabled(false);
		}
		const totalLabel = timingManifest
			? `${Math.round(timingManifest.outputDurationSec)}s`
			: `${storyboardTrimDuration}s`;
		setVideoNote(
			[
				usedSeedance
					? m.wizard.storyboardSeedanceR2vNote
					: usedH3
						? m.wizard.storyboardMinimaxH3Note
						: m.wizard.klingStoryboardFallbackNote,
				`${m.wizard.storyboardTrimDurationLabel}: ${totalLabel}`,
				wizardVideoReadyExtraNote(data),
				!usedH3 && !usedSeedance && typeof data.clipCount === "number"
					? m.wizard.klingStoryboardClipCount.replace(
							"{n}",
							String(data.clipCount),
						)
					: "",
				storyboardCaps.length
					? m.wizard.storyboardCaptionsReadyNote
					: "",
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

		const selectedPreview = voicePreviewTracks.find(
			(t: VoicePreviewTrack) => t.id === selectedVoicePreviewId,
		);
		const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const fd = new FormData();
		if (presenterSourceMode === "custom-keyframe" && imageUrl) {
			fd.set("image_url", imageUrl);
		}
		fd.set("product_name", product.trim());
		if (selectedPreview?.audioUrl) {
			fd.set("speech_url", selectedPreview.audioUrl);
			if (selectedPreview.presetId)
				fd.set("voice_preset", selectedPreview.presetId);
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

		const res = await fetch("/api/generate-digital-presenter", {
			method: "POST",
			body: fd,
		});
    const data = await res.json();
		if (!res.ok) throw new Error(data.error ?? m.errors.ugcPresenterFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
    setVideoNote(
      [
				m.wizard.ugcPresenter.videoPreflight,
        data.note as string | undefined,
				wizardVideoReadyExtraNote(data),
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
			videoSettings.creativity === "subtle" &&
			isConceptCinematicStyle(visualStyleId)
				? CINEMATIC_REEL_VIDEO_CREATIVITY
				: videoSettings.creativity;
		const motionStyle = useBeatRotation
			? cinematicMotionStyleForScene(sceneIndex, totalScenes)
			: videoSettings.motionStyle === "static-glow" &&
				  isConceptCinematicStyle(visualStyleId)
				? "gentle-orbit"
				: videoSettings.motionStyle;
		const camera = cameraForMotion(motionStyle);
		const vOpts = resolveVideoGenerationOpts(templateId, {
			...videoSettings,
			creativity,
			motionStyle,
		});
		const motionStrength = cinematicMotionStrength(motionStyle, creativity);
		const fullPrompt = [
			buildCinematicClipMotionPrompt({
				sceneMotionPrompt: motionPrompt,
				creativity,
				camera: vOpts.camera,
				motionStyle,
				sceneIndex,
				totalScenes,
				referenceMotionNote: extractReferenceMotionNote(
					effectivePromptExtra(),
				),
			}),
			brandKitWantsLogo(brandKit)
				? "Preserve any brand logo already in the input still — exact geometry, no redraw, no new text."
				: "",
		]
			.filter(Boolean)
			.join(" ");
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
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
    fd.set("fast", vOpts.fast ? "true" : "false");
    fd.set("image_start_url", imageUrl);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
    return data.videoUrl as string;
  }

	async function stampBrandLogoOnCinematicScenes(
		scenes: CinematicSceneResult[],
	): Promise<CinematicSceneResult[]> {
		// Mode B already baked the logo into stills via Nano Banana — skip sharp corner stamp.
		if (cinematicLogoIntegratedRef.current) return scenes;
		const freshKit = loadBrandKitFromStorage();
		const kit = preferNewerBrandKit(brandKit, freshKit);
		if (!brandKitWantsLogo(kit) || scenes.length === 0) return scenes;
		if (kit !== brandKit) setBrandKit(kit);
		const placement =
			quickFixLogoPlacement === "bottom-right" ||
			quickFixLogoPlacement === "bottom-left"
				? "top-right"
				: quickFixLogoPlacement;
		const res = await fetch("/api/stamp-brand-logo", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				image_urls: scenes.map((s) => s.imageUrl),
				brand_kit: kit,
				placement,
			}),
		});
		const data = await res.json();
		if (!res.ok)
			throw new Error((data.error as string) ?? "Logo stamp failed.");
		if (
			!data.logoStamped ||
			!Array.isArray(data.urls) ||
			data.urls.length !== scenes.length
		) {
			return scenes;
		}
		const next = scenes.map((scene, i) => ({
			...scene,
			imageUrl: (data.urls as string[])[i] ?? scene.imageUrl,
		}));
		setCinematicScenes(next);
		setImageUrl(next[0]?.imageUrl ?? null);
		setImageVariantUrls(next.map((s) => s.imageUrl));
		return next;
  }

  async function makeCinematicStitchVideo(): Promise<string> {
		if (cinematicScenes.length < cinematicSceneCount) {
      throw new Error(m.errors.storyboardVideoPromptRequired);
    }
		// Sharp stamp only if Mode B did not already integrate the logo.
		const scenesForVideo =
			await stampBrandLogoOnCinematicScenes(cinematicScenes);
    const clipUrls: string[] = [];
		for (const scene of scenesForVideo) {
      clipUrls.push(
				await makeCinematicClipFromImage(
					scene.imageUrl,
					scene.videoMotionPrompt,
					scene.sceneIndex,
					scenesForVideo.length,
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
		const stitchClipDurations = Array.isArray(data.clipDurations)
			? (data.clipDurations as number[]).filter(
					(n) => typeof n === "number" && n > 0,
				)
			: [];
		if (stitchClipDurations.length >= 2) {
			const stitchManifest = buildManifestFromClipDurations(
				stitchClipDurations,
				{
					source: "stitch",
					engine: "mixed",
					timingSource: "probed",
				},
			);
			lastVideoTimingManifestRef.current = stitchManifest;
			setVideoTimingManifest(stitchManifest);
		}
    setVideoNote(
      [
				formatCinematicCopy(m.wizard.cinematicStitchVideoPreflight),
        `${m.wizard.cinematicStitchClipCount}: ${clipUrls.length}`,
				brandKitWantsLogo(brandKit)
					? cinematicLogoIntegratedRef.current
						? m.wizard.cinematicLogoModeBNote
						: m.wizard.cinematicLogoStampNote
					: null,
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
		const prompt = stripReferenceVideoTags(
      productVideoPlan?.seedancePrompt?.trim() ||
      videoPrompt.trim() ||
				"",
		);
    if (!prompt) throw new Error(m.errors.needProductVideoPlan);

    const fd = new FormData();
    fd.set("mode", "reference");
		fd.set("prompt", seedancePromptForGenerate(prompt));
    fd.set("resolution", vOpts.resolution);
    fd.set("duration", vOpts.duration);
    fd.set("aspect_ratio", vOpts.aspectRatio);
		fd.set("generate_audio", "false");
    fd.set("negative_prompt", negativePrompt);
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
		// Leftover research MP4 is not this job — same as poster. Photos only → H3.
		const assistantPlan = resolveVideoEnginePlan({
			hasReel: false,
			faceHeavy: isFaceHeavyVideoJob({
				visualStyleId,
				videoCreativeMode,
				subjectFraming,
			}),
		});
		fd.set("fast", assistantPlan.seedanceFast ? "true" : "false");

		if (productPhoto) {
			fd.append("images", productPhoto);
			fd.append("reference_images", productPhoto);
		}
		if (packagingPhoto) {
			fd.append("images", packagingPhoto);
			fd.append("reference_images", packagingPhoto);
		}
		for (const f of extraKitPhotos.slice(0, 2)) {
			fd.append("images", f);
			fd.append("reference_images", f);
		}

		// Shot-list for Seedance→Kling fallback (roles only — motion stays textless).
		const kitMeta =
			productVideoPlan?.imageRoles?.map((r) => ({
				role: r.role || r.slot,
				imagePrompt: r.visualDescription?.slice(0, 120),
			})) ?? [];
		if (kitMeta.length) {
			fd.set("scenes_meta", JSON.stringify(kitMeta));
		}

		const useH3 = assistantPlan.firstEngine === "minimax-h3";
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{
				method: "POST",
				body: fd,
			},
		);
    const data = await readGenerateJson(res);
    if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
    setVideoNote(
      [
				String(data.generationMode ?? "").startsWith(
					"minimax-h3-fallback",
				) ||
				(data.seedanceBlockedCode &&
					String(data.generationMode ?? "").startsWith("minimax-h3"))
					? m.wizard.seedanceToMinimaxH3FallbackNote
					: data.generationMode === "kling-storyboard-fallback" ||
						  data.seedanceBlockedCode
						? m.wizard.seedanceToKlingFallbackNote
						: useH3
							? m.wizard.videoEngineMinimaxH3
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

	async function generateBlockbusterSceneFrame(): Promise<string | null> {
		if (sceneFrameBusy) return null;
		setSceneFrameBusy(true);
		setError(null);
		setVideoNote(m.wizard.blockbusterGenerateSceneBusy);
		try {
			const hasPackagingArt = Boolean(
				packagingPhoto ||
					(blockbusterEndLogo && brandKit.logoUrl?.trim()),
			);
			const fd = new FormData();
			fd.set(
				"prompt",
				buildBlockbusterSceneStillPrompt({
					conceptMode: promotionMode === "concept",
					product:
						product.trim() ||
						headline.trim() ||
						conceptIdea.trim(),
					camera: parseBlockbusterCamera(blockbusterCamera),
					hasPackaging: hasPackagingArt,
				}),
			);
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", "9:16");
			fd.set("num_images", "1");
			fd.set("promotion_mode", promotionMode);
			fd.set("workflow_mode", "video-only");
			// Do NOT send product name / hero photo — that paints fake SKU art onto boxes.
			fd.set("endpoint", TEXT_ENDPOINT);
			// Only lock box print when packaging (or opt-in brand logo) is available.
			if (packagingPhoto) {
				fd.append("product_angle_images", packagingPhoto);
			} else if (blockbusterEndLogo && brandKit.logoUrl?.trim()) {
				const logoFile = await fileFromImageUrl(
					brandKit.logoUrl.trim(),
				);
				if (logoFile) fd.append("product_angle_images", logoFile);
			}
			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok) {
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			}
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const url = String(
				(data.imageUrl as string | undefined) ??
					(data.imageUrls as string[] | undefined)?.[0] ??
					"",
			).trim();
			if (!url) throw new Error(m.errors.imageGenNoUrl);
			setSceneFrameUrl(url);
			const file = await fileFromImageUrl(url);
			if (file) setSceneFramePhoto(file);
			return url;
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.polishFailed));
			return null;
		} finally {
			setSceneFrameBusy(false);
		}
	}

	async function makeBlockbusterVideo(): Promise<string> {
		let heroFile = productPhoto;
		if (!heroFile && promotionMode === "concept" && brandKit.logoUrl?.trim()) {
			heroFile = await fileFromImageUrl(brandKit.logoUrl.trim());
		}
		if (!heroFile) {
			throw new Error(
				promotionMode === "concept"
					? m.wizard.blockbusterNeedConceptHero
					: m.wizard.blockbusterNeedHero,
			);
		}
		let packFile = packagingPhoto;
		if (
			!packFile &&
			blockbusterEndLogo &&
			brandKit.logoUrl?.trim()
		) {
			// Opt-in: Brand kit logo as flying-box print when Packaging is empty.
			packFile = await fileFromImageUrl(brandKit.logoUrl.trim());
		}
		let sceneFile = sceneFramePhoto;
		if (!sceneFile && extraKitPhotos[0]) {
			sceneFile = extraKitPhotos[0];
		}
		if (!sceneFile && sceneFrameUrl?.trim()) {
			sceneFile = await fileFromImageUrl(sceneFrameUrl.trim());
		}
		const camera = parseBlockbusterCamera(blockbusterCamera);
		// Elevated bridge POVs: wrong plate locks reverse motion + fake box art.
		if (isBlockbusterElevatedBridgeCamera(camera)) {
			sceneFile = null;
		}
		const prompt = buildBlockbusterVideoPrompt({
			conceptMode: promotionMode === "concept",
			product: product.trim() || conceptIdea.trim(),
			headline: headline.trim(),
			conceptIdea: conceptIdea.trim(),
			hasPackaging: Boolean(packFile),
			hasSceneFrame: Boolean(sceneFile),
			timing: parseBlockbusterTiming(blockbusterTiming),
			camera,
		});
		setVideoPrompt(prompt);
		setVideoNote(m.wizard.blockbusterAnimating);

		const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const fd = new FormData();
		fd.set("mode", "reference");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", prompt);
		fd.set("resolution", vOpts.resolution);
		fd.set("duration", String(BLOCKBUSTER_DURATION_SEC));
		fd.set("aspect_ratio", "9:16");
		fd.set("generate_audio", "false");
		fd.set("negative_prompt", BLOCKBUSTER_NEGATIVE);
		fd.set("avoid_on_screen_text", "true");
		fd.set("fast", "false");
		for (const ref of orderedBlockbusterRefFiles({
			hero: heroFile,
			packaging: packFile,
			scene: sceneFile,
		})) {
			fd.append("reference_images", ref);
		}

		const enginePlan = resolveVideoEnginePlan({
			blockbuster: true,
			hasReel: false,
		});
		const useH3 = enginePlan.firstEngine === "minimax-h3";
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{ method: "POST", body: fd },
		);
		const data = await readGenerateJson(res);
		if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		let videoUrl = data.videoUrl as string;

		const wantFinish =
			(blockbusterBurnCaptions && blockbusterCaptionText.trim()) ||
			blockbusterHeroHold;
		if (wantFinish && videoUrl) {
			setVideoNote(m.wizard.blockbusterFinishing);
			const finishFd = new FormData();
			finishFd.set("video_url", videoUrl);
			finishFd.set(
				"burn_captions",
				blockbusterBurnCaptions && blockbusterCaptionText.trim()
					? "1"
					: "0",
			);
			finishFd.set("caption_text", blockbusterCaptionText.trim());
			finishFd.set("end_logo", "0");
			finishFd.set("hero_hold", blockbusterHeroHold ? "1" : "0");
			const finishRes = await fetch("/api/finish-blockbuster", {
				method: "POST",
				body: finishFd,
			});
			const finishData = await finishRes.json();
			if (!finishRes.ok) {
				throw new Error(
					(finishData.error as string) ||
						m.wizard.blockbusterFinishFailed,
				);
			}
			if (finishData.videoUrl) {
				videoUrl = finishData.videoUrl as string;
				notifyCreditBalance(readCreditBalanceFromResponse(finishData));
			}
		}

		const pathNote = wizardVideoReadyExtraNote(data);
		setVideoNote(
			[
				m.wizard.blockbusterHint,
				useH3 ? m.wizard.videoEngineMinimaxH3 : undefined,
				pathNote,
				data.note as string | undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return videoUrl;
	}

	async function generateH3ShotRecipeStill(
		mode: H3ShotRecipeMode,
	): Promise<File | null> {
		if (sceneFrameBusy) return null;
		setSceneFrameBusy(true);
		setError(null);
		setVideoNote(m.wizard.h3ShotGenerateStillBusy[mode]);
		try {
			const showreelScheme =
				mode === "h3-showreel"
					? resolveH3ShowreelScheme({
							pick: parseH3ShowreelSchemePick(h3ShowreelSchemePick),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const sphereMgScheme =
				mode === "h3-sphere-mg"
					? resolveH3SphereMgScheme({
							pick: parseH3SphereMgSchemePick(h3SphereMgSchemePick),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const logoMgScheme =
				mode === "h3-logo-mg"
					? resolveH3LogoMgScheme({
							pick: parseH3LogoMgSchemePick(h3LogoMgSchemePick),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const triangleLightMgScheme =
				mode === "h3-triangle-light-mg"
					? resolveH3TriangleLightMgScheme({
							pick: parseH3TriangleLightMgSchemePick(
								h3TriangleLightMgSchemePick,
							),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const glassTypeMgScheme =
				mode === "h3-glass-type-mg"
					? resolveH3GlassTypeMgScheme({
							pick: parseH3GlassTypeMgSchemePick(
								h3GlassTypeMgSchemePick,
							),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const designStudioMgScheme =
				mode === "h3-design-studio-mg"
					? resolveH3DesignStudioMgScheme({
							pick: parseH3DesignStudioMgSchemePick(
								h3DesignStudioMgSchemePick,
							),
							product: product.trim() || conceptIdea.trim(),
							headline: headline.trim(),
							conceptIdea: conceptIdea.trim(),
							conceptMode: promotionMode === "concept",
						})
					: undefined;
			const fd = new FormData();
			fd.set(
				"prompt",
				buildH3ShotRecipeStillPrompt({
					mode,
					conceptMode: promotionMode === "concept",
					product: product.trim() || conceptIdea.trim(),
					headline: headline.trim(),
					conceptIdea: conceptIdea.trim(),
					foodBulletArc:
						mode === "food-bullet-time" ? foodBulletArc : undefined,
					showreelAspect:
						mode === "h3-showreel" ? h3ShowreelAspect : undefined,
					showreelScheme,
					sphereMgScheme,
					logoMgScheme,
					triangleLightMgScheme,
					glassTypeMgScheme,
					designStudioMgScheme,
				}),
			);
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			fd.set("image_text_mode", "textless");
			fd.set("h3_shot_still", "true");
			fd.set(
				"aspect_ratio",
				resolveH3ShotStillAspectRatio(
					mode,
					mode === "h3-showreel" ? h3ShowreelAspect : undefined,
				),
			);
			fd.set("num_images", "1");
			fd.set("promotion_mode", promotionMode);
			fd.set("workflow_mode", "video-only");
			fd.set("product_name", product.trim() || conceptIdea.trim());
			fd.set("headline", headline.trim());
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set("endpoint", productPhoto ? EDIT_ENDPOINT : TEXT_ENDPOINT);
			if (productPhoto) fd.set("reference_image", productPhoto);
			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok) {
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			}
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const url = String(
				(data.imageUrl as string | undefined) ??
					(data.imageUrls as string[] | undefined)?.[0] ??
					"",
			).trim();
			if (!url) throw new Error(m.errors.imageGenNoUrl);
			const file = await fileFromImageUrl(url);
			if (!file) throw new Error(m.errors.imageGenNoUrl);
			setProductPhoto(file);
			setUseOriginalImage(true);
			setImageUrl(url);
			return file;
		} catch (e: unknown) {
			setError(friendlyError(e, m.errors.polishFailed));
			return null;
		} finally {
			setSceneFrameBusy(false);
		}
	}

	async function makeH3ShotRecipeVideo(mode: H3ShotRecipeMode): Promise<string> {
		let heroFile = productPhoto;
		// Logo / mascot from Brand kit can lock neon (or concept) identity when no upload.
		if (!heroFile && brandKit.logoUrl?.trim()) {
			heroFile = await fileFromImageUrl(brandKit.logoUrl.trim());
		}
		// Physical product paths require an uploaded photo — except neon-on-real (MP4 is the hero).
		if (!heroFile && promotionMode === "concept" && mode !== "neon-on-real") {
			heroFile = await generateH3ShotRecipeStill(mode);
		}
		const needsReel = h3ShotRecipeNeedsReel(mode);
		if (needsReel && !(referenceAd && referenceIsVideo)) {
			throw new Error(m.wizard.h3ShotNeedReferenceVideo);
		}
		// neon-on-real: real MP4 alone is enough; still/logo/mascot is optional neon identity.
		if (!heroFile && mode !== "neon-on-real") {
			throw new Error(
				promotionMode === "concept"
					? m.wizard.h3ShotNeedConceptHero
					: m.errors.needPhoto,
			);
		}
		const showreelAspect =
			mode === "h3-showreel"
				? parseH3ShowreelAspect(h3ShowreelAspect)
				: mode === "h3-logo-mg" ||
					  mode === "h3-triangle-light-mg" ||
					  mode === "h3-glass-type-mg" ||
					  mode === "h3-design-studio-mg"
					? "16:9"
					: "9:16";
		const showreelScheme =
			mode === "h3-showreel"
				? resolveH3ShowreelScheme({
						pick: parseH3ShowreelSchemePick(h3ShowreelSchemePick),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const sphereMgScheme =
			mode === "h3-sphere-mg"
				? resolveH3SphereMgScheme({
						pick: parseH3SphereMgSchemePick(h3SphereMgSchemePick),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const logoMgScheme =
			mode === "h3-logo-mg"
				? resolveH3LogoMgScheme({
						pick: parseH3LogoMgSchemePick(h3LogoMgSchemePick),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const triangleLightMgScheme =
			mode === "h3-triangle-light-mg"
				? resolveH3TriangleLightMgScheme({
						pick: parseH3TriangleLightMgSchemePick(
							h3TriangleLightMgSchemePick,
						),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const glassTypeMgScheme =
			mode === "h3-glass-type-mg"
				? resolveH3GlassTypeMgScheme({
						pick: parseH3GlassTypeMgSchemePick(
							h3GlassTypeMgSchemePick,
						),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const designStudioMgScheme =
			mode === "h3-design-studio-mg"
				? resolveH3DesignStudioMgScheme({
						pick: parseH3DesignStudioMgSchemePick(
							h3DesignStudioMgSchemePick,
						),
						product: product.trim() || conceptIdea.trim(),
						headline: headline.trim(),
						conceptIdea: conceptIdea.trim(),
						conceptMode: promotionMode === "concept",
					})
				: undefined;
		const durationSec =
			mode === "food-bullet-time"
				? foodBulletDurationSec(foodBulletArc)
				: mode === "h3-triangle-light-mg"
					? clampTriangleLightMgDurationSec(videoSettings.duration)
					: mode === "h3-glass-type-mg"
						? clampGlassTypeMgDurationSec(videoSettings.duration)
						: mode === "h3-design-studio-mg"
							? clampDesignStudioMgDurationSec(videoSettings.duration)
							: H3_SHOT_RECIPE_DURATION_SEC[mode];
		const prompt = buildH3ShotRecipePrompt({
			mode,
			conceptMode: promotionMode === "concept",
			product: product.trim() || conceptIdea.trim(),
			headline: headline.trim(),
			conceptIdea: conceptIdea.trim(),
			hasReferenceVideo: Boolean(referenceAd && referenceIsVideo),
			macroSnapIntensity:
				mode === "macro-snap" ? macroSnapIntensity : undefined,
			foodBulletArc:
				mode === "food-bullet-time" ? foodBulletArc : undefined,
			showreelAspect: mode === "h3-showreel" ? showreelAspect : undefined,
			showreelScheme,
			sphereMgScheme,
			logoMgScheme,
			triangleLightMgScheme,
			glassTypeMgScheme,
			designStudioMgScheme,
			durationSec,
		});
		setVideoPrompt(prompt);
		setVideoNote(m.wizard.h3ShotAnimating[mode]);

		const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const fd = new FormData();
		fd.set("mode", "reference");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", prompt);
		fd.set("resolution", vOpts.resolution);
		fd.set("duration", String(durationSec));
		fd.set("aspect_ratio", showreelAspect);
		fd.set("generate_audio", "false");
		fd.set(
			"negative_prompt",
			mode === "h3-showreel"
				? H3_SHOWREEL_NEGATIVE
				: mode === "h3-movie-title"
					? H3_MOVIE_TITLE_NEGATIVE
					: mode === "h3-logo-mg"
						? H3_LOGO_MG_NEGATIVE
						: mode === "h3-triangle-light-mg"
							? H3_TRIANGLE_LIGHT_MG_NEGATIVE
							: mode === "h3-glass-type-mg"
								? H3_GLASS_TYPE_MG_NEGATIVE
								: mode === "h3-design-studio-mg"
									? H3_DESIGN_STUDIO_MG_NEGATIVE
									: H3_SHOT_RECIPE_NEGATIVE,
		);
		fd.set(
			"avoid_on_screen_text",
			h3ShotRecipeAllowsKineticType(mode) ? "false" : "true",
		);
		fd.set("fast", "false");
		if (heroFile) {
			fd.append("reference_images", heroFile);
		}

		if (needsReel && referenceAd) {
			const refFalUrl = await ensureReferenceVideoFalUrl(referenceAd);
			fd.set("reference_video_url", refFalUrl);
			const refSec = refVideoDurationSec;
			if (refSec && Number.isFinite(refSec)) {
				fd.set("ref_duration_sec", String(refSec));
			}
		}

		const enginePlan = resolveVideoEnginePlan({
			h3ShotRecipe: true,
			hasReel: Boolean(needsReel && referenceAd),
		});
		const useH3 = enginePlan.firstEngine === "minimax-h3";
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{ method: "POST", body: fd },
		);
		const data = await readGenerateJson(res);
		if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
		setVideoNote(
			[
				m.wizard.h3ShotHint[mode],
				useH3 ? m.wizard.videoEngineMinimaxH3 : undefined,
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
		const hasRefVideo = Boolean(referenceAd && referenceIsVideo);
		const multiAnglePrompt =
			videoPrompt.trim() ||
			buildMultiAngleVideoPrompt(pv, videoPromptOpts(), templateId);
		const promptWithSpine = hasRefVideo
			? [
					"@Video1 = SPINE for pacing/camera/locations when attached.",
					"@Image1+ = OBJECT angles of the same product — keep visual identity.",
					multiAnglePrompt,
				].join(" ")
			: multiAnglePrompt;
    const fd = new FormData();
    fd.set("mode", "reference");
    fd.set(
      "prompt",
			seedancePromptForGenerate(promptWithSpine, {
				hasReferenceVideo: hasRefVideo,
			}),
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
		// Reference MP4 owns camera — do not send template Slow Push In.
		if (!hasRefVideo) fd.set("camera", vOpts.camera);
    fd.set("negative_prompt", negativePrompt);
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
		const multiPlan = resolveVideoEnginePlan({
			hasReel: hasRefVideo,
			faceHeavy: isFaceHeavyVideoJob({
				visualStyleId,
				videoCreativeMode,
				subjectFraming,
			}),
		});
		fd.set("fast", multiPlan.seedanceFast ? "true" : "false");

		const angleMeta = [
			productPhoto ? { role: "product hero" } : null,
			...extraAnglePhotos.map((_, i) => ({
				role:
					i === extraAnglePhotos.length - 1
						? "product detail"
						: "product demo",
			})),
		].filter(Boolean);
		if (angleMeta.length) {
			fd.set("scenes_meta", JSON.stringify(angleMeta));
		}

		const useH3 = multiPlan.firstEngine === "minimax-h3";
		if (useH3 && hasRefVideo && referenceAd) {
			const refFalUrl = await ensureReferenceVideoFalUrl(referenceAd);
			fd.set("reference_video_url", refFalUrl);
			if (imageUrl && !productPhoto) fd.set("image_start_url", imageUrl);
		}
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{
				method: "POST",
				body: fd,
			},
		);
    const data = await readGenerateJson(res);
    if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
    setVideoNote(
			[
				String(data.generationMode ?? "").startsWith(
					"minimax-h3-fallback",
				) ||
				(data.seedanceBlockedCode &&
					String(data.generationMode ?? "").startsWith("minimax-h3"))
					? m.wizard.seedanceToMinimaxH3FallbackNote
					: data.generationMode === "kling-storyboard-fallback" ||
						  data.seedanceBlockedCode
						? m.wizard.seedanceToKlingFallbackNote
						: useH3 && hasRefVideo
							? m.wizard.videoEngineMinimaxH3
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
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
		fd.set("fast", "false");

		const res = await fetch("/api/generate-minimax-h3", {
			method: "POST",
			body: fd,
		});
    const data = await readGenerateJson(res);
    if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
    if (pathNote) setVideoNote(pathNote);
    return data.videoUrl as string;
  }

	async function generateMotionPosterKeyframe(
		dialect: MotionPosterDialectId,
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.motionPosterBuildingEnd
				: m.wizard.motionPosterBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set(
				"image_text_mode",
				frame === "end" ? "integrated" : "textless",
			);
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set(
				"endpoint",
				frame === "end" && startPlateUrl
					? EDIT_ENDPOINT
					: productPhoto
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
			);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("motion_poster", "1");
			fd.set("motion_poster_frame", frame);
			fd.set("motion_poster_dialect", dialect);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			attachReferenceToForm(fd);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeMotionPosterVideo(
		imageStartUrlOverride?: string,
	): Promise<string> {
		// Video-only: never H3 the raw catalog photo or a leftover packshot still.
		// Combined: honor the designed still from generateImage (motion_poster=1).
		const dialectId = resolveMotionPosterDialect({
			pick: motionPosterDialectPick,
			product,
			headline,
			subline,
			extra: promptExtra,
			conceptIdea,
			conceptMode: promotionMode === "concept",
			excludeId:
				motionPosterDialectPick === "auto"
					? lastMotionPosterDialectRef.current
					: null,
		}).id;
		lastMotionPosterDialectRef.current = dialectId;
		const dialectDef = MOTION_POSTER_DIALECTS[dialectId];
		const override = imageStartUrlOverride?.trim() || "";
		const marked = motionPosterStillUrlRef.current?.trim() || "";
		let startUrl = "";
		if (override && marked && override === marked) {
			startUrl = override;
		} else if (
			imageUrl &&
			!useOriginalImage &&
			marked &&
			imageUrl === marked
		) {
			startUrl = imageUrl;
		}
		if (!startUrl) {
			if (!productPhoto && promotionMode !== "concept") {
				throw new Error(m.wizard.motionPosterNeedKeyframe);
			}
			startUrl = await generateMotionPosterKeyframe(dialectId, "start");
		}
		motionPosterStillUrlRef.current = startUrl;
		let endUrl = "";
		if (endFramePhoto) {
			/* file attached on H3 form */
		} else if (endFrameUrl?.trim()) {
			endUrl = endFrameUrl.trim();
		} else if (motionPosterEndUrlRef.current?.trim()) {
			endUrl = motionPosterEndUrlRef.current.trim();
		} else {
			endUrl = await generateMotionPosterKeyframe(
				dialectId,
				"end",
				startUrl,
			);
		}
		if (endUrl) motionPosterEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		const dialectLabel = m.wizard.motionPosterDialects[dialectId].title;
		setVideoNote(`${m.wizard.motionPosterAnimatingCard} · ${dialectLabel}`);
		const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const durationSec = resolvePlannerDurationSec(
			String(vOpts.duration),
			6,
		);
		const mode = "start-end" as const;
		const identity = resolveMotionPosterPromptIdentity({
			product,
			headline,
			conceptIdea,
			conceptMode: promotionMode === "concept",
		});
		const posterPrompt = buildMotionPosterPrompt({
			...identity,
			durationSec,
			mode,
			dialect: dialectId,
		});
		// Recipe owns the poster contract — Advanced leftover prompts must not overwrite it.
		const rawPrompt = posterPrompt;
		if (videoPrompt.trim() !== posterPrompt) setVideoPrompt(posterPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(rawPrompt));
		fd.set("resolution", vOpts.resolution);
		fd.set("duration", String(Math.min(8, Math.max(4, durationSec))));
		fd.set("aspect_ratio", effectiveImageAspectRatio);
		fd.set("generate_audio", "false");
		fd.set("motion_strength", String(dialectDef.motionStrength));
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("fast", "false");
		fd.set("motion_poster", "1");
		fd.set("motion_poster_dialect", dialectId);
		fd.set(
			"headline",
			headline.trim() ||
				product.trim() ||
				conceptIdea.trim() ||
				business.trim(),
		);
		fd.set("subline", subline.trim());
		fd.set("offer", offer.trim());
		fd.set(
			"product_name",
			promotionMode === "concept"
				? effectivePromoteName ||
						product.trim() ||
						conceptIdea.trim() ||
						business.trim()
				: product.trim() || business.trim(),
		);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		if (endFramePhoto) fd.set("image_end", endFramePhoto);
		else if (endUrl) fd.set("image_end_url", endUrl);

		// Motion poster is MiniMax H3 only — never attach leftover research MP4.
		const res = await fetch("/api/generate-minimax-h3", {
			method: "POST",
			body: fd,
		});
		const data = await readGenerateJson(res);
		if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
		setVideoNote(
			[
				m.wizard.motionPosterHint,
				pathNote,
				data.note as string | undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return data.videoUrl as string;
	}

	async function resolveSocialDripPlan(): Promise<SocialDripPlan> {
		const pick = parseSocialDripMetaphorPick(socialDripMetaphorPick);
		const controls = {
			igHandle: socialDripIgHandle,
			igCaption: socialDripIgCaption,
			pourOrigin: socialDripPourOrigin,
			pourAmount: socialDripPourAmount,
		};
		if (pick !== "auto") {
			const plan = applySocialDripUserControls(
				normalizeSocialDripPlan(
					heuristicSocialDripPlan({
						product,
						conceptIdea,
						headline,
						business,
						brandName: brandProfile?.businessName,
						conceptMode: promotionMode === "concept",
						pick,
						...controls,
					}),
				),
				controls,
			);
			socialDripPlanRef.current = plan;
			setSocialDripPlanNote(
				`${plan.metaphorLabel} · ${plan.reason}`,
			);
			return plan;
		}
		setVideoNote(m.wizard.socialDripPlanningMetaphor);
		try {
			const res = await fetch("/api/plan-social-drip", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					product: product.trim(),
					conceptIdea: conceptIdea.trim(),
					headline: headline.trim(),
					subline: subline.trim(),
					business: business.trim(),
					brandName: brandProfile?.businessName?.trim() || business.trim(),
					promotionMode,
					pick: "auto",
					locale: promptMarket,
					igHandle: socialDripIgHandle,
					igCaption: socialDripIgCaption,
					pourOrigin: socialDripPourOrigin,
					pourAmount: socialDripPourAmount,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(
					(data.error as string) || "Social drip plan failed",
				);
			}
			const plan = applySocialDripUserControls(
				normalizeSocialDripPlan(data.plan as SocialDripPlan),
				controls,
			);
			socialDripPlanRef.current = plan;
			setSocialDripPlanNote(
				`${plan.metaphorLabel} · ${plan.reason}`,
			);
			return plan;
		} catch {
			const plan = applySocialDripUserControls(
				normalizeSocialDripPlan(
					heuristicSocialDripPlan({
						product,
						conceptIdea,
						headline,
						business,
						brandName: brandProfile?.businessName,
						conceptMode: promotionMode === "concept",
						pick: "auto",
						...controls,
					}),
				),
				controls,
			);
			socialDripPlanRef.current = plan;
			setSocialDripPlanNote(
				`${plan.metaphorLabel} · ${plan.reason}`,
			);
			return plan;
		}
	}

	async function generateSocialDripKeyframe(
		plan: SocialDripPlan,
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.socialDripBuildingEnd
				: m.wizard.socialDripBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "integrated");
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set(
				"endpoint",
				frame === "end" && startPlateUrl
					? EDIT_ENDPOINT
					: productPhoto
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
			);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("social_drip", "1");
			fd.set("social_drip_frame", frame);
			fd.set("social_drip_metaphor", plan.metaphorId);
			fd.set("social_drip_plan", JSON.stringify(plan));
			fd.set("social_drip_ig_handle", plan.igHandle);
			fd.set("social_drip_ig_caption", plan.igCaption);
			if (plan.pourOrigin) fd.set("social_drip_pour_origin", plan.pourOrigin);
			if (plan.pourAmount) fd.set("social_drip_pour_amount", plan.pourAmount);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			attachReferenceToForm(fd);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) ?? m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeSocialDripVideo(
		imageStartUrlOverride?: string,
	): Promise<string> {
		const plan = await resolveSocialDripPlan();
		const vOptsEarly = resolveVideoGenerationOpts(templateId, videoSettings);
		const durationSecEarly = resolvePlannerDurationSec(
			String(vOptsEarly.duration),
			6,
		);
		const socialDripCost = estimateSocialDripTokens({
			resolution: vOptsEarly.resolution,
			duration: Math.min(8, Math.max(5, durationSecEarly)),
		});
		if (blockIfCannotAfford(socialDripCost)) {
			throw new Error(
				insufficientTokensMessage(
					socialDripCost,
					creditBalance as number,
				),
			);
		}
		// Always rebuild start/end stills for the latest pour contract — never reuse
		// a previous decorative-glow plate that blocks the drip gag.
		socialDripStillUrlRef.current = null;
		socialDripEndUrlRef.current = null;
		void imageStartUrlOverride;
		if (!productPhoto && promotionMode !== "concept") {
			throw new Error(m.wizard.socialDripNeedKeyframe);
		}
		const startUrl = await generateSocialDripKeyframe(plan, "start");
		socialDripStillUrlRef.current = startUrl;
		const endUrl = await generateSocialDripKeyframe(plan, "end", startUrl);
		socialDripEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		setVideoNote(
			`${m.wizard.socialDripAnimatingCard} · ${plan.metaphorLabel}`,
		);
		const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
		const durationSec = resolvePlannerDurationSec(
			String(vOpts.duration),
			6,
		);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const dripPrompt = buildSocialDripVideoPrompt({
			plan,
			product: subject || "the hero",
			durationSec,
			conceptMode: promotionMode === "concept",
		});
		if (videoPrompt.trim() !== dripPrompt) setVideoPrompt(dripPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(dripPrompt));
		fd.set("resolution", vOpts.resolution);
		fd.set("duration", String(Math.min(8, Math.max(5, durationSec))));
		fd.set("aspect_ratio", effectiveImageAspectRatio);
		fd.set("generate_audio", "false");
		fd.set("motion_strength", "72");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "false");
		fd.set("fast", "false");
		fd.set("social_drip", "1");
		fd.set("social_drip_metaphor", plan.metaphorId);
		fd.set(
			"headline",
			headline.trim() ||
				product.trim() ||
				conceptIdea.trim() ||
				business.trim(),
		);
		fd.set("subline", subline.trim());
		fd.set("offer", offer.trim());
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const res = await fetch("/api/generate-minimax-h3", {
			method: "POST",
			body: fd,
		});
		const data = await readGenerateJson(res);
		if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const pathNote = wizardVideoReadyExtraNote(data);
		setVideoNote(
			[
				m.wizard.socialDripHint,
				`${plan.metaphorLabel}`,
				pathNote,
				data.note as string | undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return data.videoUrl as string;
	}

	async function generateVacuumInflateKeyframe(
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.vacuumInflateBuildingEnd
				: m.wizard.vacuumInflateBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("vacuum_inflate", "1");
			fd.set("vacuum_inflate_frame", frame);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.vacuumInflateNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	function cloneWizardFormData(src: FormData): FormData {
		const out = new FormData();
		src.forEach((value, key) => {
			out.append(key, value);
		});
		return out;
	}

	/** H3 start→end first; mix library BGM after (H3 often ships near-silent audio). Seedance fallback does the same. */
	async function generateStartEndFxVideo(input: {
		fd: FormData;
		recipeDurationSec: number;
	}): Promise<{
		videoUrl: string;
		usedSeedanceFallback: boolean;
		data: Record<string, unknown>;
	}> {
		const h3Fd = cloneWizardFormData(input.fd);
		h3Fd.delete("generate_audio");
		h3Fd.delete("fast");
		h3Fd.set(
			"duration",
			String(Math.max(5, input.recipeDurationSec)),
		);
		const h3Res = await fetch("/api/generate-minimax-h3", {
			method: "POST",
			body: h3Fd,
		});
		const h3Data = await readGenerateJson(h3Res);
		const h3Url =
			typeof h3Data.videoUrl === "string" ? h3Data.videoUrl.trim() : "";
		if (h3Res.ok && h3Url) {
			notifyCreditBalance(readCreditBalanceFromResponse(h3Data));
			let url = h3Url;
			try {
				url = await addBgm(url);
			} catch {
				setBgmNote(m.wizard.bgmFallbackNote);
			}
			return {
				videoUrl: url,
				usedSeedanceFallback: false,
				data: h3Data,
			};
		}
		const h3Error =
			typeof h3Data.error === "string" ? h3Data.error.trim() : "";
		if (
			h3Res.status === 401 ||
			h3Res.status === 402 ||
			h3Res.status === 403
		) {
			throw new Error(
				(typeof h3Data.error === "string" && h3Data.error) ||
					m.errors.videoFailed,
			);
		}

		const seedFd = cloneWizardFormData(input.fd);
		seedFd.set("duration", String(input.recipeDurationSec));
		seedFd.set("generate_audio", "false");
		seedFd.set("fast", "true");
		const seedRes = await fetch("/api/generate", {
			method: "POST",
			body: seedFd,
		});
		const seedData = await readGenerateJson(seedRes);
		const seedUrl =
			typeof seedData.videoUrl === "string"
				? seedData.videoUrl.trim()
				: "";
		if (!seedRes.ok || !seedUrl) {
			throw new Error(
				(typeof seedData.error === "string" && seedData.error) ||
					(typeof h3Data.error === "string" && h3Data.error) ||
					m.errors.videoFailed,
			);
		}
		notifyCreditBalance(readCreditBalanceFromResponse(seedData));
		let url = seedUrl;
		try {
			url = await addBgm(url);
		} catch {
			setBgmNote(m.wizard.bgmFallbackNote);
		}
		return {
			videoUrl: url,
			usedSeedanceFallback: true,
			data: {
				...seedData,
				h3FallbackReason: h3Error || `HTTP ${h3Res.status}`,
			},
		};
	}

	async function makeVacuumInflateVideo(): Promise<string> {
		vacuumInflateStillUrlRef.current = null;
		vacuumInflateEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.vacuumInflateNeedKeyframe);
		}
		const startUrl = await generateVacuumInflateKeyframe("start");
		vacuumInflateStillUrlRef.current = startUrl;
		const endUrl = await generateVacuumInflateKeyframe("end", startUrl);
		vacuumInflateEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		setVideoNote(m.wizard.vacuumInflateAnimatingCard);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const fxPrompt = buildVacuumInflateVideoPrompt({
			product: subject || "the uploaded product",
			conceptMode: promotionMode === "concept",
			durationSec: VACUUM_INFLATE_DURATION_SEC,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(VACUUM_INFLATE_DURATION_SEC));
		fd.set("aspect_ratio", effectiveImageAspectRatio);
		fd.set("motion_strength", "70");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("vacuum_inflate", "1");
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: VACUUM_INFLATE_DURATION_SEC,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		setVideoNote(
			[
				m.wizard.vacuumInflateHint,
				fx.usedSeedanceFallback
					? m.wizard.h3ToSeedanceFallbackNote
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function generateImpactPosterKeyframe(
		tone: ImpactPosterToneId,
		effect: ImpactPosterEffectId,
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.impactPosterBuildingEnd
				: m.wizard.impactPosterBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set(
				"image_text_mode",
				frame === "end" ? "integrated" : "textless",
			);
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set(
				"endpoint",
				frame === "end" && startPlateUrl
					? EDIT_ENDPOINT
					: productPhoto
						? EDIT_ENDPOINT
						: TEXT_ENDPOINT,
			);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("impact_poster", "1");
			fd.set("impact_poster_frame", frame);
			fd.set("impact_poster_tone", tone);
			fd.set("impact_poster_effect", effect);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			attachReferenceToForm(fd);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeImpactPosterVideo(
		imageStartUrlOverride?: string,
	): Promise<string> {
		const tone = resolveImpactPosterTone({
			pick: parseImpactPosterTonePick(impactPosterTonePick),
			product,
			headline,
			subline,
			extra: promptExtra,
			conceptIdea,
		});
		const effect = resolveImpactPosterEffect({
			pick: parseImpactPosterEffectPick(impactPosterEffectPick),
			tone,
			excludeId:
				impactPosterEffectPick === "auto"
					? lastImpactPosterEffectRef.current
					: null,
		});
		lastImpactPosterEffectRef.current = effect;

		let startUrl =
			imageStartUrlOverride?.trim() ||
			impactPosterStillUrlRef.current ||
			"";
		if (!startUrl) {
			startUrl = await generateImpactPosterKeyframe(tone, effect, "start");
		}
		impactPosterStillUrlRef.current = startUrl;

		let endUrl = impactPosterEndUrlRef.current || "";
		if (!endUrl) {
			endUrl = await generateImpactPosterKeyframe(
				tone,
				effect,
				"end",
				startUrl,
			);
		}
		impactPosterEndUrlRef.current = endUrl;

		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}

		const toneLabel = m.wizard.impactPosterTones[tone]?.title ?? tone;
		const effectLabel =
			m.wizard.impactPosterEffects[effect]?.title ?? effect;
		setVideoNote(
			`${m.wizard.impactPosterAnimating} · ${toneLabel} · ${effectLabel}`,
		);

		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const fxPrompt = buildImpactPosterVideoPrompt({
			tone,
			effect,
			product: subject || "the product",
			conceptMode: promotionMode === "concept",
			durationSec: IMPACT_POSTER_DURATION_SEC,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(IMPACT_POSTER_DURATION_SEC));
		fd.set("aspect_ratio", effectiveImageAspectRatio);
		fd.set("motion_strength", String(impactPosterMotionStrength(effect)));
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("impact_poster", "1");
		fd.set("impact_poster_tone", tone);
		fd.set("impact_poster_effect", effect);
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: IMPACT_POSTER_DURATION_SEC,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		setVideoNote(
			[
				m.wizard.impactPosterHint,
				toneLabel,
				effectLabel,
				fx.usedSeedanceFallback
					? m.wizard.h3ToSeedanceFallbackNote
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function generateCreativeMotionKeyframe(
		scheme: CreativeMotionSchemeId,
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.creativeMotionBuildingEnd
				: m.wizard.creativeMotionBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", effectiveImageAspectRatio);
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("creative_motion", "1");
			fd.set("creative_motion_frame", frame);
			fd.set("creative_motion_scheme", scheme);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.creativeMotionNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeCreativeMotionVideo(): Promise<string> {
		const scheme = resolveCreativeMotionScheme({
			pick: parseCreativeMotionSchemePick(creativeMotionSchemePick),
			product,
			headline,
			excludeId:
				creativeMotionSchemePick === "auto"
					? lastCreativeMotionSchemeRef.current
					: null,
		});
		lastCreativeMotionSchemeRef.current = scheme;
		creativeMotionStillUrlRef.current = null;
		creativeMotionEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.creativeMotionNeedKeyframe);
		}
		const startUrl = await generateCreativeMotionKeyframe(scheme, "start");
		creativeMotionStillUrlRef.current = startUrl;
		const endUrl = await generateCreativeMotionKeyframe(
			scheme,
			"end",
			startUrl,
		);
		creativeMotionEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		const schemeLabel =
			m.wizard.creativeMotionSchemes[scheme]?.title ?? scheme;
		setVideoNote(
			`${m.wizard.creativeMotionAnimatingCard} · ${schemeLabel}`,
		);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const fxPrompt = buildCreativeMotionVideoPrompt({
			scheme,
			product: subject || "the product",
			conceptMode: promotionMode === "concept",
			durationSec: CREATIVE_MOTION_DURATION_SEC,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(CREATIVE_MOTION_DURATION_SEC));
		fd.set("aspect_ratio", effectiveImageAspectRatio);
		fd.set("motion_strength", "72");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("creative_motion", "1");
		fd.set("creative_motion_scheme", scheme);
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: CREATIVE_MOTION_DURATION_SEC,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		setVideoNote(
			[
				m.wizard.creativeMotionHint,
				schemeLabel,
				fx.usedSeedanceFallback
					? m.wizard.h3ToSeedanceFallbackNote
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function generateHandThrowSceneKeyframe(
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.handThrowBuildingEnd
				: m.wizard.handThrowBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", "16:9");
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("hand_throw_scene", "1");
			fd.set("hand_throw_scene_frame", frame);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.handThrowNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeHandThrowSceneVideo(): Promise<string> {
		handThrowStillUrlRef.current = null;
		handThrowEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.handThrowNeedKeyframe);
		}
		const startUrl = await generateHandThrowSceneKeyframe("start");
		handThrowStillUrlRef.current = startUrl;
		const endUrl = await generateHandThrowSceneKeyframe("end", startUrl);
		handThrowEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		setVideoNote(m.wizard.handThrowAnimatingCard);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const fxPrompt = buildHandThrowSceneVideoPrompt({
			product: subject || "the landmark",
			conceptMode: promotionMode === "concept",
			durationSec: HAND_THROW_SCENE_DURATION_SEC,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(HAND_THROW_SCENE_DURATION_SEC));
		fd.set("aspect_ratio", "16:9");
		fd.set("motion_strength", "72");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("hand_throw_scene", "1");
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: HAND_THROW_SCENE_DURATION_SEC,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		const h3Reason =
			typeof fx.data.h3FallbackReason === "string"
				? fx.data.h3FallbackReason
				: "";
		setVideoNote(
			[
				m.wizard.handThrowHint,
				fx.usedSeedanceFallback
					? [m.wizard.h3ToSeedanceFallbackNote, h3Reason]
							.filter(Boolean)
							.join(" — ")
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function generateWebBoundaryBreakKeyframe(
		scheme: WebBoundaryBreakSchemeId,
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.webBoundaryBuildingEnd
				: m.wizard.webBoundaryBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", "3:4");
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("web_boundary_break", "1");
			fd.set("web_boundary_break_frame", frame);
			fd.set("web_boundary_break_scheme", scheme);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.webBoundaryNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeWebBoundaryBreakVideo(): Promise<string> {
		const scheme = resolveWebBoundaryBreakScheme({
			pick: parseWebBoundaryBreakSchemePick(webBoundarySchemePick),
			product,
			headline,
			conceptIdea,
		});
		lastWebBoundarySchemeRef.current = scheme;
		webBoundaryStillUrlRef.current = null;
		webBoundaryEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.webBoundaryNeedKeyframe);
		}
		const startUrl = await generateWebBoundaryBreakKeyframe(scheme, "start");
		webBoundaryStillUrlRef.current = startUrl;
		const singlePlate = webBoundaryBreakUsesSinglePlate(scheme);
		const endUrl = singlePlate
			? startUrl
			: await generateWebBoundaryBreakKeyframe(scheme, "end", startUrl);
		webBoundaryEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		const schemeLabel =
			m.wizard.webBoundarySchemes[scheme]?.title ?? scheme;
		setVideoNote(
			`${m.wizard.webBoundaryAnimatingCard} · ${schemeLabel}`,
		);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const durationSec = clampWebBoundaryBreakDurationSec(
			videoSettings.duration,
		);
		const fxPrompt = buildWebBoundaryBreakVideoPrompt({
			scheme,
			product: subject || "the product",
			business: business.trim(),
			headline: headline.trim() || product.trim() || conceptIdea.trim(),
			promptExtra: effectivePromptExtra(),
			conceptMode: promotionMode === "concept",
			durationSec,
			singlePlate,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(durationSec));
		fd.set("aspect_ratio", "9:16");
		fd.set("motion_strength", String(WEB_BOUNDARY_BREAK_MOTION_STRENGTH));
		fd.set(
			"negative_prompt",
			`${negativePrompt}, ${WEB_BOUNDARY_BREAK_NEGATIVE}`,
		);
		fd.set("avoid_on_screen_text", "true");
		fd.set("web_boundary_break", "1");
		fd.set("web_boundary_break_scheme", scheme);
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: durationSec,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		const h3Reason =
			typeof fx.data.h3FallbackReason === "string"
				? fx.data.h3FallbackReason
				: "";
		setVideoNote(
			[
				m.wizard.webBoundaryHint,
				schemeLabel,
				fx.usedSeedanceFallback
					? [m.wizard.h3ToSeedanceFallbackNote, h3Reason]
							.filter(Boolean)
							.join(" — ")
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}


	async function generateProductExplodeKeyframe(
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.productExplodeBuildingEnd
				: m.wizard.productExplodeBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", "16:9");
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("product_explode", "1");
			fd.set("product_explode_frame", frame);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.productExplodeNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeProductExplodeVideo(): Promise<string> {
		productExplodeStillUrlRef.current = null;
		productExplodeEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.productExplodeNeedKeyframe);
		}
		const startUrl = await generateProductExplodeKeyframe("start");
		productExplodeStillUrlRef.current = startUrl;
		const endUrl = await generateProductExplodeKeyframe("end", startUrl);
		productExplodeEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		setVideoNote(m.wizard.productExplodeAnimatingCard);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const fxPrompt = buildProductExplodeVideoPrompt({
			product: subject || "the product",
			conceptMode: promotionMode === "concept",
			durationSec: PRODUCT_EXPLODE_DURATION_SEC,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		// H3 floor is 5s — keep the ~4s teardown, then hold the exploded hero.
		fd.set("duration", String(Math.max(5, PRODUCT_EXPLODE_DURATION_SEC)));
		fd.set("aspect_ratio", "16:9");
		fd.set("motion_strength", "70");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("product_explode", "1");
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: PRODUCT_EXPLODE_DURATION_SEC,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		const h3Reason =
			typeof fx.data.h3FallbackReason === "string"
				? fx.data.h3FallbackReason
				: "";
		setVideoNote(
			[
				m.wizard.productExplodeHint,
				fx.usedSeedanceFallback
					? [m.wizard.h3ToSeedanceFallbackNote, h3Reason]
							.filter(Boolean)
							.join(" — ")
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function generateBulletProductElevateKeyframe(
		frame: "start" | "end",
		startPlateUrl?: string,
	): Promise<string> {
		setVideoNote(
			frame === "end"
				? m.wizard.bulletProductElevateBuildingEnd
				: m.wizard.bulletProductElevateBuildingStill,
		);
		setImageJobMeta({
			kind: "image",
			startedAt: Date.now(),
			sceneCount: 1,
		});
		try {
			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(brandKit));
			fd.set(
				"product_name",
				promotionMode === "concept"
					? effectivePromoteName ||
							product.trim() ||
							conceptIdea.trim()
					: product.trim(),
			);
			fd.set("business", business.trim());
			fd.set(
				"headline",
				headline.trim() || product.trim() || conceptIdea.trim(),
			);
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("workflow_mode", workflowMode);
			fd.set("promotion_mode", promotionMode);
			fd.set("image_text_mode", "textless");
			fd.set("aspect_ratio", "9:16");
			fd.set("num_images", "1");
			fd.set("image_output_mode", "single");
			fd.set("bullet_product_elevate", "1");
			fd.set("bullet_product_elevate_frame", frame);
			if (frame === "end" && startPlateUrl)
				fd.set("start_plate_url", startPlateUrl);
			await bindIdentityHeroToKeyframeForm(
				fd,
				m.wizard.bulletProductElevateNeedKeyframe,
			);

			const res = await fetch("/api/generate-image", {
				method: "POST",
				body: fd,
			});
			const data = await readGenerateJson(res);
			if (!res.ok)
				throw new Error(
					(data.error as string) || m.errors.polishFailed,
				);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
			const urls = (data.imageUrls as string[] | undefined) ?? [
				data.imageUrl as string,
			];
			const applied = applyGeneratedImages(
				urls,
				data.endpoint as string | undefined,
			);
			if (!applied) throw new Error(m.errors.imageGenNoUrl);
			return applied;
		} finally {
			setImageJobMeta(null);
		}
	}

	async function makeBulletProductElevateVideo(): Promise<string> {
		bulletElevateStillUrlRef.current = null;
		bulletElevateEndUrlRef.current = null;
		if (
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			throw new Error(m.wizard.bulletProductElevateNeedKeyframe);
		}
		const startUrl = await generateBulletProductElevateKeyframe("start");
		bulletElevateStillUrlRef.current = startUrl;
		const endUrl = await generateBulletProductElevateKeyframe(
			"end",
			startUrl,
		);
		bulletElevateEndUrlRef.current = endUrl;
		const pair = [startUrl, endUrl].filter(Boolean);
		if (pair.length) {
			setImageVariantUrls(pair);
			setSelectedVariantIndex(0);
			setImageUrl(startUrl);
			imageUrlRef.current = startUrl;
		}
		setVideoNote(m.wizard.bulletProductElevateAnimatingCard);
		const subject =
			promotionMode === "concept"
				? effectivePromoteName ||
					product.trim() ||
					conceptIdea.trim() ||
					business.trim()
				: product.trim() || business.trim();
		const durationSec = clampBulletProductElevateDurationSec(
			videoSettings.duration,
		);
		const fxPrompt = buildBulletProductElevateVideoPrompt({
			product: subject || "the product",
			conceptMode: promotionMode === "concept",
			durationSec,
		});
		if (videoPrompt.trim() !== fxPrompt) setVideoPrompt(fxPrompt);

		const fd = new FormData();
		fd.set("mode", "image");
		fd.set("promotion_mode", promotionMode);
		fd.set("prompt", seedancePromptForGenerate(fxPrompt));
		fd.set("resolution", "480p");
		fd.set("duration", String(durationSec));
		fd.set("aspect_ratio", "9:16");
		fd.set("motion_strength", "74");
		fd.set("negative_prompt", negativePrompt);
		fd.set("avoid_on_screen_text", "true");
		fd.set("bullet_product_elevate", "1");
		fd.set("product_name", subject);
		fd.set("business", business.trim());
		fd.set("image_start_url", startUrl);
		fd.set("image_end_url", endUrl);

		const fx = await generateStartEndFxVideo({
			fd,
			recipeDurationSec: durationSec,
		});
		const pathNote = wizardVideoReadyExtraNote(fx.data);
		const h3Reason =
			typeof fx.data.h3FallbackReason === "string"
				? fx.data.h3FallbackReason
				: "";
		setVideoNote(
			[
				m.wizard.bulletProductElevateHint,
				fx.usedSeedanceFallback
					? [m.wizard.h3ToSeedanceFallbackNote, h3Reason]
							.filter(Boolean)
							.join(" — ")
					: m.wizard.videoEngineMinimaxH3,
				pathNote,
				typeof fx.data.note === "string" ? fx.data.note : undefined,
			]
				.filter(Boolean)
				.join(" · "),
		);
		return fx.videoUrl;
	}

	async function makeImageToVideo(
		imageStartUrlOverride?: string,
	): Promise<string> {
    const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
    const pv = getPromptVars();
    const promptOpts = videoPromptOpts();
    let endUrl: string | null = endFrameUrl;
    const skipAutoEndFrame =
      promotionMode === "concept" && isAiPlannedVideoStyle(visualStyleId);
		if (
			!endUrl &&
			!endFramePhoto &&
			videoSettings.autoSecondFrame &&
			!skipAutoEndFrame
		) {
      endUrl = await ensureEndFrameUrl();
    }
    const dualFrame = Boolean(endUrl || endFramePhoto);
    if (dualFrame) promptOpts.dualFrame = true;

    const plannedOnly =
      promotionMode === "concept" && isAiPlannedVideoStyle(visualStyleId);
    if (plannedOnly && !videoPrompt.trim()) {
      throw new Error(m.errors.creativeVideoPromptRequired);
    }
		const defaultPrompt = buildWizardVideoPrompt(
			templateId,
			pv,
			promptOpts,
		);
		const rawPrompt =
			videoPrompt.trim() || (plannedOnly ? "" : defaultPrompt);
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
		fd.set(
			"avoid_on_screen_text",
			vOpts.avoidOnScreenText ? "true" : "false",
		);
		fd.set("fast", "false");

		const startUrl = imageStartUrlOverride ?? imageUrl;
		if (startUrl) fd.set("image_start_url", startUrl);
    else if (productPhoto) fd.set("image_start", productPhoto);

    if (endFramePhoto) fd.set("image_end", endFramePhoto);
    else if (endUrl) fd.set("image_end_url", endUrl);

		const stillsPlan = resolveVideoEnginePlan({
			hasReel: false,
			faceHeavy: isFaceHeavyVideoJob({
				visualStyleId,
				videoCreativeMode,
				subjectFraming,
			}),
		});
		const useH3 = stillsPlan.firstEngine === "minimax-h3";
		const res = await fetch(
			useH3 ? "/api/generate-minimax-h3" : "/api/generate",
			{
				method: "POST",
				body: fd,
			},
		);
    const data = await readGenerateJson(res);
    if (!res.ok) throw new Error((data.error as string) ?? m.errors.videoFailed);
		notifyCreditBalance(readCreditBalanceFromResponse(data));
		const usedH3Fallback = String(data.generationMode ?? "").startsWith(
			"minimax-h3-fallback",
		);
		const usedKling =
			data.generationMode === "kling-storyboard-fallback" ||
			(Boolean(data.seedanceBlockedCode) && !usedH3Fallback);
		const pathNote = wizardVideoReadyExtraNote(data);
    const notes = [
			usedH3Fallback
				? m.wizard.seedanceToMinimaxH3FallbackNote
				: usedKling
					? m.wizard.seedanceToKlingFallbackNote
					: null,
      pathNote,
      dualFrame ? m.wizard.videoRichMotionNote : undefined,
      data.note as string | undefined,
			referenceAd && referenceIsVideo
				? m.wizard.videoRefIgnoredOnImageMode
				: "",
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

		const scenesForPlan =
			stitchReady || singleCinematicReady
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
			return {
				plan: adPackPlan,
				captions: captionLines,
				aiMusicUrl: null,
			};
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
			const existing = aiMusicTracks.find(
				(t: AiMusicTrack) => t.id === selectedAiMusicId,
			);
      if (existing?.audioUrl) {
        aiMusicUrl = existing.audioUrl;
      } else if (plan.music.promptEn?.trim()) {
				trackGenerateStarted("music", { source: "wizard_pack" });
        const res = await fetch("/api/generate-music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptEn: plan.music.promptEn,
            durationSec: plan.music.durationSec,
          }),
        });
        const data = await res.json();
				if (!res.ok) {
					trackGenerateFailed("music", { source: "wizard_pack" });
					throw new Error(data.error ?? m.errors.musicGenerateFailed);
				}
				notifyCreditBalance(readCreditBalanceFromResponse(data));
        const tracks = data.tracks ?? [];
        setAiMusicTracks(tracks);
        const firstId = tracks[0]?.id ?? null;
        setSelectedAiMusicId(firstId);
        aiMusicUrl = tracks[0]?.audioUrl ?? null;
				trackGenerateSuccess("music", {
					source: "wizard_pack",
					track_count: tracks.length,
				});
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
			if (!res.ok)
				throw new Error(data.error ?? m.errors.voiceoverFailed);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
      const tracks = (data.tracks ?? []) as VoicePreviewTrack[];
      setVoicePreviewTracks(tracks);
      setSelectedVoicePreviewId(tracks[0]?.id ?? null);
			const previewErrors = (data.errors ?? []) as Array<{
				presetId: string;
				message: string;
			}>;
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
		trackGenerateStarted("music", { source: "wizard" });
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
			if (!res.ok)
				throw new Error(data.error ?? m.errors.musicGenerateFailed);
			notifyCreditBalance(readCreditBalanceFromResponse(data));
      setAiMusicTracks(data.tracks ?? []);
      setSelectedAiMusicId(data.tracks?.[0]?.id ?? null);
      setMusicSource("ai");
			trackGenerateSuccess("music", {
				source: "wizard",
				track_count: (data.tracks ?? []).length,
			});
    } catch (e: unknown) {
			trackGenerateFailed("music", { source: "wizard" });
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
		setCaptionLines((prev: CaptionLine[]) =>
			prev.filter((_, i) => i !== index),
		);
	}

	function updateStoryboardSceneTiming(
		index: number,
		startSec: number,
		endSec: number,
	) {
    const safeStart = Math.max(0, startSec);
    const safeEnd = Math.max(safeStart + 0.5, endSec);
		setStoryboardScenes((prev: StoryboardSceneResult[]) =>
      prev.map((scene, i) =>
				i === index
					? { ...scene, startSec: safeStart, endSec: safeEnd }
					: scene,
      ),
    );
    if (storyboardPlan) {
			setStoryboardPlan({
				...storyboardPlan,
				scenes: storyboardPlan.scenes.map(
					(scene: StoryboardScenePlan, i: number) =>
						i === index
							? { ...scene, startSec: safeStart, endSec: safeEnd }
							: scene,
				),
			});
		}
	}

	function updateStoryboardPlanScene(
		index: number,
		patch: Partial<
			Pick<
				StoryboardScenePlan,
				| "sceneDescriptionZh"
				| "onImageCopyZh"
				| "imagePrompt"
				| "role"
				| "cameraMotionEn"
				| "lightingEn"
				| "productPlacementZh"
				| "punchLineZh"
			>
		>,
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
			const freshKit = loadBrandKitFromStorage();
			const liveKit = preferNewerBrandKit(brandKit, freshKit);
			const kitForPlan = brandKitForGeneration(liveKit) ?? liveKit;
			if (liveKit !== brandKit) setBrandKit(liveKit);

			const fd = new FormData();
			fd.set("visual_style", visualStyleId);
			fd.set("art_style", artStyleId);
			fd.set("promotion_mode", promotionMode);
			if (brandProfile)
				fd.set("brand_profile", JSON.stringify(brandProfile));
			fd.set("brand_kit", JSON.stringify(kitForPlan));
			fd.set(
				"product_name",
				isConceptStoryboardOutput
					? effectivePromoteName
					: product.trim(),
			);
			if (conceptIdea.trim()) fd.set("concept_idea", conceptIdea.trim());
			fd.set("business", business.trim());
			fd.set("headline", headline.trim());
			fd.set("subline", subline.trim());
			fd.set("offer", offer.trim());
			fd.set("storyboard_brief", storyboardBrief.trim());
			fd.set("duration", storyboardTrimDuration);
			fd.set(
				"scene_count",
				effectiveStoryboardSceneCount(storyboardRecipeId, storyboardSceneCount),
			);
			if (contentResearchApplyRef) {
				fd.set("research_adapted", "1");
			} else {
				if (contentResearchApplyRef) {
				fd.set("research_adapted", "1");
			} else {
				fd.set("storyboard_recipe", storyboardRecipeId);
			}
			}
			fd.set("prompt_market", promptMarket);
			fd.set("subject_framing", subjectFraming);
			fd.set("prompt_extra", effectivePromptExtra());
			fd.set("image_text_mode", imageTextMode);
			if (!storyboardRecipeForbidsReference(storyboardRecipeId)) {
				appendReferenceFormFields(fd);
			}
			const res = await fetch("/api/plan-storyboard", {
				method: "POST",
				body: fd,
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.error ?? m.errors.storyboardFailed);
			setStoryboardPlan(data.plan);
			if (
				typeof data.seedancePrompt === "string" &&
				data.seedancePrompt.trim()
			) {
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
						? lastStoryboardVideoDurationSecRef.current ||
							Number(storyboardTrimDuration) ||
							8
            : videoSettings.duration === "auto"
              ? 10
              : Number(videoSettings.duration) || 10;
		const selectedPreview = voicePreviewTracks.find(
			(t: VoicePreviewTrack) => t.id === selectedVoicePreviewId,
		);
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
			[prev, m.wizard.adPack.voiceoverAppliedNote]
				.filter(Boolean)
				.join(" · "),
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
			caps = layoutHookSplitCaptions(
				hook,
				body,
				resolveWizardVideoDurationSec(),
			);
		}
		if ((!captionBurnEnabled && !opts?.force) || caps.length === 0)
			return videoUrlIn;
    const res = await fetch("/api/burn-script-captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				video_url: videoUrlIn,
				caption_lines: caps,
			}),
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

	async function addBgm(
		videoUrlIn: string,
		aiMusicUrlOverride?: string | null,
	): Promise<string> {
		const selectedAi = aiMusicTracks.find(
			(t: AiMusicTrack) => t.id === selectedAiMusicId,
		);
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
				musicSource === "ai" && selectedAiMusicId
					? m.wizard.adPack.aiBgmNote
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
		if (
			promotionMode === "concept" &&
			videoCreativeMode === "product-assistant"
		) {
      setVideoCreativeMode("product-promo");
      setError(m.errors.conceptVideoAssistantBlocked);
      return;
    }

		const hasExistingVideoOutput = Boolean(videoUrl);

		// Identity lock — physical needs product photo; concept needs idea/headline/still.
		const conceptIdentityOk =
			Boolean(conceptIdea.trim()) ||
			Boolean(headline.trim()) ||
			Boolean(product.trim()) ||
			Boolean(productPhoto) ||
			Boolean(imageUrl) ||
			Boolean(opts?.imageUrlOverride);
		if (
			promotionMode === "concept" &&
			!conceptIdentityOk &&
			!directReferenceR2vReady
		) {
			setError(m.errors.conceptIdentityRequired);
			return;
		}
		if (
			isIdentityVideoRecipeMode(videoCreativeMode) &&
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			setError(identityNeedKeyframeError());
			return;
		}
		if (
			promotionMode === "physical" &&
			workflowMode === "video-only" &&
			!usesCompositor &&
			physicalVideoOnlyNeedsUploadedPhoto({
				hasProductPhoto: hasProductPhotoLock,
				hasDirectReferenceR2v: directReferenceR2vReady,
				hasStoryboardScenes:
					isStoryboardOutput && storyboardScenes.length > 0,
				hasImageOverride: Boolean(opts?.imageUrlOverride),
				// Most physical H3 modes need an upload. neon-on-real is ready when
				// h3ShotRecipeCanGenerate (MP4 present; still/logo/mascot optional).
				canAutoStill:
					motionPosterCanAutoStill ||
					socialDripCanAutoStill ||
					identityRecipeCanAutoStill ||
					blockbusterCanGenerate ||
					h3ShotRecipeCanGenerate,
			})
		) {
			setError(m.errors.needPhoto);
			return;
		}
		if (
			promotionMode === "physical" &&
			videoCreativeMode === "reference-concept" &&
			!hasProductPhotoLock &&
			!opts?.imageUrlOverride
		) {
			setError(m.errors.needPhoto);
			return;
		}

		// Ensure DeepSeek motion/script exists when empty — keep result editable in videoPrompt.
		// Motion poster owns its recipe prompt — never let planAiVideoPrompt overwrite it.
		if (
			!isRecipeOwnedVideoMode(videoCreativeMode) &&
			!isStoryboardOutput &&
			!usesCompositor &&
			!usesProductAssistant &&
			!isUgcPresenterOutput &&
			!videoPrompt.trim() &&
			!researchReelAnalysis?.seedancePrompt?.trim()
		) {
			const planned = await planAiVideoPrompt();
			if (!planned && isAiPlannedVideoStyle(visualStyleId)) {
				setError(m.errors.conceptVideoPlanRequired);
				return;
			}
		}
		if (usesProductAssistant && !productVideoPlan?.seedancePrompt) {
			const planned = await planProductVideo();
			if (!planned) return;
    }

    const conceptTextVideoReady =
      conceptTextVideoEligible && Boolean(videoPrompt.trim());
    // Safety net: if cinematic scenes are ready, force stitch path even if UI toggle drifted.
    const shouldCinematicStitch =
      isCinematicStitchOutput ||
			(isConceptCinematicStyle(visualStyleId) &&
				cinematicSceneCount > 1 &&
				cinematicScenes.length >= cinematicSceneCount);

		if (
			storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			storyboardScenes.length === 0
		) {
      setError(m.errors.storyboardVideoPromptRequired);
      return;
    }
		if (
			storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			!storyboardGridApproved
		) {
			setError(m.wizard.storyboardApproveRequiredHint);
			return;
		}
		if (storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode)) {
			const sceneCount = Math.max(1, storyboardScenes.length);
			const totalSec = Number(storyboardTrimDuration) || 12;
			const clipDur = klingClipDurationForStoryboard(
				sceneCount,
				totalSec,
			);
			const hasReel = Boolean(
				(referenceAd && referenceIsVideo) ||
				referenceVideoFalUrl?.startsWith("http"),
			);
			const enginePlan = resolveVideoEnginePlan({
				hasReel,
				faceHeavy: isFaceHeavyVideoJob({
					visualStyleId,
					videoCreativeMode,
					subjectFraming,
				}),
				storyboard: true,
			});
			const afford = evaluateStoryboardVideoAffordability({
				balance: creditBalance,
				hasReel,
				allowKling: enginePlan.allowKling,
				klingCanHitDuration: klingStitchCanHitDuration(
					clipDur * sceneCount,
					totalSec,
					{
						clipCount: sceneCount,
					},
				),
				h3Cost: estimateH3Tokens({
					duration: Math.min(15, Math.max(5, totalSec)),
					resolution: h3BillingResolutionForPlan(plan),
					referenceVideoSec: hasReel
						? Math.min(15, Math.max(5, totalSec))
						: 0,
				}),
				klingCost: estimateKlingStoryboardTokens(sceneCount, clipDur),
				seedanceCost: videoTokenCost(
					"1080p",
					Math.min(15, Math.max(4, totalSec)),
				),
				preferEngine: storyboardPreferEngineRef.current,
				firstEngine: enginePlan.firstEngine,
			});
			if (afford.action === "offer-kling") {
				setStoryboardEngineChoice({
					balance: afford.balance,
					h3Cost: afford.h3Cost,
					klingCost: afford.klingCost,
				});
				return;
			}
			if (afford.action === "upgrade") {
				setError(m.errors.tvcNeedsPaidPlan);
				return;
			}
			if (afford.action === "run-kling") {
				storyboardPreferEngineRef.current = "kling";
			}
		}
		if (
			isUgcPresenterOutput &&
			presenterSourceMode === "custom-keyframe" &&
			!imageUrl
		) {
			setError(m.errors.needGeneratedImage);
			return;
		}
		if (
			shouldCinematicStitch &&
			cinematicScenes.length < cinematicSceneCount
		) {
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
		if (
			!isStoryboardOutput &&
			videoCreativeMode === "reference-concept" &&
			!useReferenceVideo
		) {
      setError(m.errors.needReferenceVideo);
      return;
    }
    if (
      workflowMode === "video-only" &&
      !usesCompositor &&
			!hasProductPhotoLock &&
			!conceptTextVideoReady &&
			!motionPosterCanAutoStill &&
			!socialDripCanAutoStill &&
			!identityRecipeCanAutoStill &&
			!blockbusterCanGenerate &&
			!h3ShotRecipeCanGenerate &&
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
		if (
			!isRecipeOwnedVideoMode(videoCreativeMode) &&
			isCreativeVideoStyle(visualStyleId) &&
			!shouldCinematicStitch &&
			!videoPrompt.trim()
		) {
      setError(m.errors.creativeVideoPromptRequired);
      return;
    }
    if (
			!isRecipeOwnedVideoMode(videoCreativeMode) &&
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
		if (
			!hasFinalImage &&
			!opts?.imageUrlOverride &&
			!conceptTextVideoReady &&
			!directReferenceR2vReady &&
			!motionPosterCanAutoStill &&
			!socialDripCanAutoStill &&
			!identityRecipeCanAutoStill &&
			!blockbusterCanGenerate &&
			!h3ShotRecipeCanGenerate
		) {
			setError(
				usesCompositor ? m.errors.needHeadline : m.errors.needKeyframe,
			);
      return;
    }

    setError(null);
    setBgmNote(undefined);
    setVideoNote(undefined);
		if (!(await forkBeforePaidRegenerate(hasExistingVideoOutput))) {
			return;
		}
    setVideoBusy(true);
    setVideoJobStartedAt(Date.now());
    setVideoPhase("video");
		trackGenerateStarted("video", {
			style: visualStyleId,
			creative_mode: videoCreativeMode,
			workflow: workflowMode,
		});

    try {
      let url: string;
			let socialPack: Awaited<
				ReturnType<typeof ensureSocialPackReady>
			> | null = null;
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

			// Preflight total job cost (stills inside the job + video) before any fal call.
			{
				const vOpts = resolveVideoGenerationOpts(templateId, videoSettings);
				const durationSec = resolvePlannerDurationSec(
					String(vOpts.duration),
					generationKind === "storyboard" ? 12 : 6,
				);
				const dualFrameRecipe =
					generationKind === "social-drip" ||
					generationKind === "motion-poster" ||
					generationKind === "impact-poster" ||
					generationKind === "vacuum-inflate" ||
					generationKind === "creative-motion" ||
					generationKind === "hand-throw-scene" ||
					generationKind === "web-boundary-break" ||
					generationKind === "product-explode" ||
					generationKind === "bullet-product-elevate";
				const willGenerateStills = dualFrameRecipe
					? true
					: isH3ShotRecipeMode(generationKind)
						? !productPhoto && promotionMode === "concept"
						: false;
				const pipelineCost = estimateVideoPipelineTokens({
					kind: generationKind,
					resolution: vOpts.resolution,
					durationSec:
						generationKind === "storyboard"
							? Number(storyboardTrimDuration) || 12
							: durationSec,
					willGenerateStills,
					sceneCount:
						generationKind === "storyboard"
							? storyboardScenes.length || 4
							: generationKind === "cinematic-stitch"
								? cinematicSceneCount
								: undefined,
				});
				if (blockIfCannotAfford(pipelineCost)) {
					return;
				}
			}

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
				case "concept-cinematic-single": {
					const stamped =
						await stampBrandLogoOnCinematicScenes(cinematicScenes);
        url = await makeCinematicClipFromImage(
						stamped[0].imageUrl,
						stamped[0].videoMotionPrompt,
						stamped[0].sceneIndex,
						stamped.length,
					);
					break;
				}
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
				case "motion-poster":
					// Keep MiniMax H3 native audio — do not replace with library BGM.
					url = await makeMotionPosterVideo(opts?.imageUrlOverride);
					break;
				case "impact-poster":
					url = await makeImpactPosterVideo(opts?.imageUrlOverride);
					break;
				case "blockbuster":
					url = await makeBlockbusterVideo();
					break;
				case "ecom-orbit":
				case "object-lock":
				case "macro-snap":
				case "luxury-tabletop":
				case "beauty-mv":
				case "imitate-ad":
				case "neon-on-real":
				case "food-bullet-time":
				case "c4d-motion":
				case "h3-showreel":
				case "h3-sphere-mg":
				case "h3-logo-mg":
				case "h3-triangle-light-mg":
				case "h3-glass-type-mg":
				case "h3-design-studio-mg":
				case "h3-movie-title":
				case "h3-lifestyle":
					url = await makeH3ShotRecipeVideo(
						generationKind as H3ShotRecipeMode,
					);
					break;
				case "social-drip":
					url = await makeSocialDripVideo(opts?.imageUrlOverride);
					break;
				case "vacuum-inflate":
					url = await makeVacuumInflateVideo();
					break;
				case "creative-motion":
					url = await makeCreativeMotionVideo();
					break;
				case "hand-throw-scene":
					url = await makeHandThrowSceneVideo();
					break;
				case "web-boundary-break":
					url = await makeWebBoundaryBreakVideo();
					break;
				case "product-explode":
					url = await makeProductExplodeVideo();
					break;
				case "bullet-product-elevate":
					url = await makeBulletProductElevateVideo();
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
			// H3-first FX keep MiniMax native stereo. Seedance fallback mixes
			// library BGM inside generateStartEndFxVideo.
			if (
				!usesCompositor &&
				recipeUsesSilentSeedance(generationKind)
			) {
				try {
					url = await addBgm(url);
				} catch {
					setBgmNote(m.wizard.bgmFallbackNote);
				}
			}
			if (!usesCompositor) {
				if (isUgcPresenterOutput) {
					setVideoNote((prev: string | undefined) =>
						[prev, m.wizard.ugcPresenter.voiceBakedInNote]
							.filter(Boolean)
							.join(" · "),
					);
				}
				// Storyboard: seed lines from scene copy + clip boundaries; burn in /captions (not here).
				// Silent Seedance FX already mixed BGM above; other paths add audio in /captions.
				if (isStoryboardOutput) {
					const videoDurationSec =
						lastStoryboardVideoDurationSecRef.current ??
						(Number(storyboardTrimDuration) || undefined);
					const timing =
						lastVideoTimingManifestRef.current ??
						videoTimingManifest;
					const caps = captionLinesFromStoryboardScenes(
						storyboardScenes,
						{
							videoDurationSec: videoDurationSec || undefined,
							clipBoundaries: timing?.clipBoundaries,
						},
					);
					if (caps.length > 0) {
						setCaptionLines(caps);
						setCaptionBurnEnabled(false);
					}
					setCaptionHandoffVideoUrl(url);
					if (timing) {
						setVideoTimingManifest(timing);
					} else if (videoDurationSec && videoDurationSec > 0) {
						const fallback = buildSingleClipManifest(
							videoDurationSec,
							{
								source: "kling",
								engine: "kling",
								timingSource: "estimated",
							},
						);
						lastVideoTimingManifestRef.current = fallback;
						setVideoTimingManifest(fallback);
					}
				} else if (
					captionBurnEnabled &&
					(socialPack?.captions.length ?? captionLines.length) > 0
				) {
          setVideoPhase("captions");
					const urlBeforeCaptionBurn = url;
          try {
						url = await burnScriptCaptionsIfEnabled(
							url,
							socialPack?.captions,
						);
          } catch {
						setVideoNote((prev: string | undefined) =>
							[prev, m.wizard.adPack.captionBurnSkippedNote]
								.filter(Boolean)
								.join(" · "),
						);
					}
					setCaptionHandoffVideoUrl(urlBeforeCaptionBurn);
				} else {
					setCaptionHandoffVideoUrl(url);
				}
			} else {
				setCaptionHandoffVideoUrl(url);
			}
			// Caption burn used to rewrite to /api/pipeline-files/…; durable outputs
			// are now /api/library/download/…. Only a leftover fal CDN URL means burn never stuck.
      const wantsProcessed =
				!isUgcPresenterOutput &&
				captionBurnEnabled &&
				!isStoryboardOutput;
			if (
				wantsProcessed &&
				isFalCdnUrl(url) &&
				!isLibraryAssetUrl(url) &&
				!isPipelineFileUrl(url)
			) {
        throw new Error(m.errors.postProcessIncomplete);
      }
			if (!isStoryboardOutput) {
				const dur = resolveWizardVideoDurationSec();
				if (dur > 0) {
					const seedanceManifest = buildSingleClipManifest(dur, {
						source: "seedance",
						engine: "seedance",
						timingSource: "estimated",
					});
					lastVideoTimingManifestRef.current = seedanceManifest;
					setVideoTimingManifest(seedanceManifest);
				}
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
			// Micro-wizard keeps stepKey "setup" and advances to done.export → VideoResultPanel.
			// Classic VideoStep still needs the legacy DoneStep host.
			if (stepKey !== "setup") {
      setStepKey("done");
			}
			trackGenerateSuccess("video", {
				style: visualStyleId,
				creative_mode: videoCreativeMode,
			});
    } catch (e: unknown) {
			if (e instanceof StoryboardEngineChoiceError) {
				setStoryboardEngineChoice({
					balance: e.balance,
					h3Cost: e.h3Cost,
					klingCost: e.klingCost,
				});
				return;
			}
			trackGenerateFailed("video", {
				style: visualStyleId,
				creative_mode: videoCreativeMode,
			});
      setError(friendlyError(e, m.errors.videoFailed));
    } finally {
      setVideoBusy(false);
      setVideoJobStartedAt(null);
    }
  }

	function confirmStoryboardKlingChoice() {
		storyboardPreferEngineRef.current = "kling";
		setStoryboardEngineChoice(null);
		void generateVideo();
	}

	function dismissStoryboardEngineChoice() {
		storyboardPreferEngineRef.current = null;
		setStoryboardEngineChoice(null);
	}

	async function applyProjectSnapshot(snapshot: ProjectSnapshot) {
		const { inputs, settings, prompts, plans, media, outputs } = snapshot;

		setProduct(inputs.product);
		setHeadline(inputs.headline);
		setSubline(inputs.subline);
		setBusiness(inputs.business);
		setOffer(inputs.offer);
		setConceptIdea(inputs.conceptIdea);
		setPromptExtra(inputs.promptExtra);
		setPromptMarket(inputs.promptMarket);
		setSubjectFraming(inputs.subjectFraming);
		setCampaignTheme(inputs.campaignTheme);
		setBrandWebsiteUrl(inputs.brandWebsiteUrl);
		setBrandSocialHint(inputs.brandSocialHint);
		setCreativeVideoBrief(inputs.creativeVideoBrief);
		setStoryboardBrief(inputs.storyboardBrief);

		setWorkflowMode(settings.workflowMode);
		setVisualStyleId(settings.visualStyleId);
		setArtStyleId(settings.artStyleId);
		setTemplateId(settings.templateId);
		setImageCreativeMode(settings.imageCreativeMode);
		setVideoCreativeMode(settings.videoCreativeMode);
		const legacyCarousel = legacyImageOutputModeToCarousel(settings.imageOutputMode);
		if (legacyCarousel) {
			setImageOutputMode(legacyCarousel.mode);
			setCarouselIntent(legacyCarousel.intent);
			setReferenceCarouselSlideCount(legacyCarousel.slideCount);
		} else {
			setImageOutputMode(settings.imageOutputMode);
			if (settings.carouselIntent) {
				setCarouselIntent(settings.carouselIntent);
			}
		}
		setImageAspectRatio(settings.imageAspectRatio);
		setImageInputMode(settings.imageInputMode);
		// Micro wizard is the resume shell — avoid flashing classic Image/Video steps
		// from older snapshots that stored stepKey mid-flow.
		setStepKey("setup");

		setImagePrompt(prompts.imagePrompt);
		setVideoPrompt(prompts.videoPrompt);
		setNegativePrompt(prompts.negativePrompt);

		setBrandProfile(plans.brandProfile);
		setUserReferenceBrief(plans.userReferenceBrief);
		setCampaignPlan(plans.campaignPlan);
		setStoryboardPlan(plans.storyboardPlan);
		setAdPackPlan(plans.adPackPlan);
		setContentResearchApplyRef(plans.contentResearchApplyRef ?? null);

		const scenes = storyboardScenesFromSnapshot(snapshot);
		const slides = campaignSlidesFromSnapshot(snapshot);
		setStoryboardScenes(scenes);
		setCampaignSlides(slides);
		setStoryboardGridApproved(scenes.length > 0);
		setStoryboardCellsViewed(scenes.map((_, i) => i));

		setImageUrl(media.imageUrl);
		setImageVariantUrls(media.imageVariantUrls);
    setSelectedVariantIndex(0);
		setVideoUrl(media.videoUrl);
		setUploadPreviewUrl(media.uploadPreviewUrl);
		setImageRefPreviewUrl(media.imageRefPreviewUrl);
		setCaptionLines(outputs.captionLines);

		if (plans.storyboardPlan?.seedancePrompt && !prompts.videoPrompt.trim()) {
			setVideoPrompt(plans.storyboardPlan.seedancePrompt);
		}
		if (plans.storyboardPlan?.productionNotes) {
			setVideoPromptPlanNote(plans.storyboardPlan.productionNotes);
		}
		if (scenes.length > 0 || slides.length > 0) {
			setShipItMode(false);
		}

		const [photoFile, refFile] = await Promise.all([
			fileFromPersistableUrl(media.uploadPreviewUrl, "product-photo"),
			fileFromPersistableUrl(media.imageRefPreviewUrl, "style-reference"),
		]);
		if (photoFile) setProductPhoto(photoFile);
		if (refFile) setImageRefPhoto(refFile);
	}

	function resetProject() {
		// Full reload with fresh=1 so autosave mints a new project id.
		// In-place state reset kept the previous library card and overwrote it.
		if (typeof window !== "undefined") {
			window.location.assign(studioHref(promotionMode));
		}
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
					hasProductPhoto: hasProductPhotoLock,
					isStoryboardOutput,
					preferCompositionRemap,
				})
			: null;
	const setupReferenceDurationGateReason =
		stepKey === "setup" && referenceReelNeedsExplicitDuration
			? ("need_output_duration" as const)
			: null;
	const setupNextDisabled = Boolean(
		setupImageGateReason || setupReferenceDurationGateReason,
	);
	const setupNextDisabledReason = setupReferenceDurationGateReason
		? m.wizard.researchReelPickDurationFirst
		: setupImageGateReason
			? resolveSetupImageGateMessage(setupImageGateReason)
			: null;
	const imageGenerateDisabledReason = imageGenerateBlockReason();

  const imageFinishLabel =
		workflowMode === "image-only" &&
		!isStoryboardOutput &&
		!isCinematicStitchOutput &&
		!isConceptCinematicSingleOutput
			? m.wizard.finishImage
			: m.wizard.continueToVideo;
	const imageNextDisabled =
		!hasFinalImage || (isStoryboardOutput && !storyboardGridApproved);
	const imageNextDisabledReason = (() => {
		if (!hasFinalImage) return m.errors.needAiImage;
		if (isStoryboardOutput && !storyboardGridApproved) {
			return m.wizard.storyboardApproveRequiredHint;
		}
		if (visionReviewNeedsAttention(imageVisionReview)) {
			return m.wizard.imageVisionContinueWarn;
		}
		return null;
	})();
	const shipItVisionBlocked = visionGateBlocksShipIt(imageVisionReview);
  const videoGenerateDisabled =
		(promotionMode === "physical" &&
			videoCreativeMode === "reference-concept" &&
			!hasProductPhotoLock) ||
		(isH3ShotRecipeMode(videoCreativeMode) &&
			promotionMode === "physical" &&
			videoCreativeMode !== "neon-on-real" &&
			!hasProductPhotoLock) ||
		(isH3ShotRecipeMode(videoCreativeMode) &&
			h3ShotRecipeNeedsReel(videoCreativeMode) &&
			!(referenceAd && referenceIsVideo)) ||
		(isIdentityVideoRecipeMode(videoCreativeMode) &&
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})) ||
		(!hasFinalImage &&
			!conceptTextVideoReady &&
			!directReferenceR2vReady &&
			!motionPosterCanAutoStill &&
			!impactPosterCanAutoStill &&
			!socialDripCanAutoStill &&
			!vacuumInflateCanAutoStill &&
			!creativeMotionCanAutoStill &&
			!handThrowCanAutoStill &&
			!webBoundaryCanAutoStill &&
			!productExplodeCanAutoStill &&
			!blockbusterCanGenerate &&
			!h3ShotRecipeCanGenerate) ||
		(isCinematicStitchOutput &&
			cinematicScenes.length < cinematicSceneCount) ||
    videoBusy ||
		sceneFrameBusy ||
		researchReelAnalyzeBusy ||
    (promotionMode === "concept" &&
			useReferenceVideo &&
			Boolean(referenceAd) &&
			!referenceR2vReady &&
			!isStoryboardOutput) ||
		(!isRecipeOwnedVideoMode(videoCreativeMode) && planVideoPromptBusy) ||
		(!isRecipeOwnedVideoMode(videoCreativeMode) && adPackPlanBusy) ||
		musicGenerateBusy ||
		(isContentResearchReelVideo &&
			!researchReelAnalysis &&
			!videoPrompt.trim()) ||
		(isContentResearchPhysicalR2v && !referenceR2vReady) ||
		(!isRecipeOwnedVideoMode(videoCreativeMode) &&
			promotionMode === "concept" &&
      isAiPlannedVideoStyle(visualStyleId) &&
      !isCinematicStitchOutput &&
      !isConceptCinematicSingleOutput &&
			!directReferenceR2vReady &&
      !videoPrompt.trim()) ||
		(usesProductAssistant &&
			(!productPhoto || !productVideoPlan?.seedancePrompt)) ||
		(storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			storyboardScenes.length === 0) ||
		(storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			!storyboardGridApproved) ||
		(!isRecipeOwnedVideoMode(videoCreativeMode) &&
			isUgcPresenterOutput &&
			!imageUrl) ||
		(!isRecipeOwnedVideoMode(videoCreativeMode) &&
			isUgcPresenterOutput &&
			!adPackPlan?.voiceoverScript?.trim() &&
			captionLines.every((l: CaptionLine) => !l.text.trim()));
	const videoGenerateDisabledReason = (() => {
		if (!videoGenerateDisabled) return null;
		if (
			videoBusy ||
			planVideoPromptBusy ||
			adPackPlanBusy ||
			musicGenerateBusy
		) {
			return m.wizard.mobileVideoBusy;
		}
		if (researchReelAnalyzeBusy) {
			return m.wizard.researchReelAnalyzing;
		}
		if (isH3ShotRecipeMode(videoCreativeMode)) {
			const lifestyle =
				h3ShotRecipeNeedsLifestyleStill(videoCreativeMode);
			const hasLifestyleLock = Boolean(hasProductPhotoLock || imageUrl);
			const hasConceptLock = hasConceptHeroLock;
			if (
				videoCreativeMode !== "neon-on-real" &&
				((lifestyle && !hasLifestyleLock) ||
					(!lifestyle &&
						promotionMode === "physical" &&
						!hasProductPhotoLock) ||
					(!lifestyle &&
						promotionMode === "concept" &&
						!hasConceptLock))
			) {
				if (lifestyle) {
					return m.wizard.h3ShotHeroHint[videoCreativeMode];
				}
				if (promotionMode === "concept") {
					return m.wizard.h3ShotNeedConceptHero;
				}
				return m.errors.needPhoto;
			}
			if (
				h3ShotRecipeNeedsReel(videoCreativeMode) &&
				!(referenceAd && referenceIsVideo)
			) {
				return m.wizard.h3ShotNeedReferenceVideo;
			}
		}
		if (
			isIdentityVideoRecipeMode(videoCreativeMode) &&
			!identityRecipeHeroReady({
				promotionMode,
				hasProductPhoto: hasProductPhotoLock,
				hasConceptHero: hasConceptHeroLock,
			})
		) {
			if (promotionMode === "concept") {
				return m.wizard.h3ShotNeedConceptHero;
			}
			return videoCreativeMode === "vacuum-inflate"
				? m.wizard.vacuumInflateNeedKeyframe
				: videoCreativeMode === "hand-throw-scene"
					? m.wizard.handThrowNeedKeyframe
					: videoCreativeMode === "web-boundary-break"
						? m.wizard.webBoundaryNeedKeyframe
					: videoCreativeMode === "product-explode"
						? m.wizard.productExplodeNeedKeyframe
						: videoCreativeMode === "bullet-product-elevate"
							? m.wizard.bulletProductElevateNeedKeyframe
						: m.wizard.creativeMotionNeedKeyframe;
		}
		if (
			promotionMode === "physical" &&
			videoCreativeMode === "reference-concept" &&
			!hasProductPhotoLock
		) {
			return m.errors.needPhoto;
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
		if (
			isContentResearchReelVideo &&
			!researchReelAnalysis &&
			!videoPrompt.trim()
		) {
			return m.wizard.researchReelAnalyzeFirstHint;
		}
		if (isContentResearchPhysicalR2v && !referenceR2vReady) {
			return m.wizard.researchReelAnalyzeFirstHint;
		}
		if (
			isCinematicStitchOutput &&
			cinematicScenes.length < cinematicSceneCount
		) {
			return m.errors.cinematicStitchNeedScenes.replace(
				"{count}",
				String(cinematicSceneCount),
			);
		}
		if (
			usesProductAssistant &&
			!isH3ShotRecipeMode(videoCreativeMode) &&
			!productPhoto
		) {
			return m.wizard.productVideoUploadFirstHint;
		}
		if (
			usesProductAssistant &&
			!isH3ShotRecipeMode(videoCreativeMode) &&
			!productVideoPlan?.seedancePrompt
		) {
			return m.wizard.productVideoAnalyzeFirstHint;
		}
		if (
			storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			storyboardScenes.length === 0
		) {
			return m.wizard.storyboardVideoNeedScenesHint;
		}
		if (
			storyboardBlocksRecipeVideo(isStoryboardOutput, videoCreativeMode) &&
			!storyboardGridApproved
		) {
			return m.wizard.storyboardApproveRequiredHint;
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
		if (
			!hasFinalImage &&
			!conceptTextVideoReady &&
			!directReferenceR2vReady &&
			!motionPosterCanAutoStill &&
			!socialDripCanAutoStill &&
			!identityRecipeCanAutoStill &&
			!blockbusterCanGenerate &&
			!h3ShotRecipeCanGenerate
		) {
			return m.errors.needAiImage;
		}
		if (
			!isRecipeOwnedVideoMode(videoCreativeMode) &&
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

	const finalImageSrc =
		imageUrl ?? (useOriginalImage ? uploadPreviewUrl : null);

  const { imageProgressInfo, videoProgressInfo } = useWizardProgress({
    imageBusy,
    videoBusy,
    imageJobMeta,
    videoJobStartedAt,
    progressNow,
    videoPhase,
    usesCompositor,
		referenceR2v: useReferenceVideo,
    labels: {
      storyboardProgressPlanning: m.wizard.storyboardProgressPlanning,
      storyboardProgressRendering: m.wizard.storyboardProgressRendering,
      campaignGenerating: m.wizard.campaignGenerating,
			campaignProgressPlanning: m.wizard.campaignProgressPlanning,
			campaignProgressRendering: m.wizard.campaignProgressRendering,
			teachingCarouselProgressPlanning:
				m.wizard.teachingCarouselProgressPlanning,
			teachingCarouselProgressRendering:
				m.wizard.teachingCarouselProgressRendering,
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
					videoSettings.duration === "auto"
						? "auto"
						: `${videoSettings.duration}s`
        }`,
      );
		} else if (isUgcPresenterOutput) {
			lines.push(m.wizard.ugcPresenter.imagePreflight);
    } else if (isCinematicStitchOutput) {
			lines.push(
				formatCinematicCopy(m.wizard.imagePreflightCinematicStitch),
			);
    } else if (isConceptCinematicSingleOutput) {
      lines.push(m.wizard.imagePreflightConceptCinematicSingle);
		} else if (
			promotionMode === "concept" &&
			workflowMode === "image-only"
		) {
      lines.push(m.wizard.imagePreflightConceptSocial);
    } else if (isCampaignOutput) {
      lines.push(m.wizard.imagePreflightCampaign);
			if (usesReferenceConceptForImage && imageRefPhoto && productPhoto) {
				lines.push(m.wizard.imagePreflightCampaignReference);
			}
    } else if (isTeachingCarouselOutput) {
			lines.push(
				m.wizard.imagePreflightTeachingCarousel.replace(
					"{count}",
					String(referenceCarouselSlideCount),
				),
			);
    } else if (effectiveImageOutputMode === "ab") {
      lines.push(m.wizard.imagePreflightAB);
    } else {
      lines.push(m.wizard.imagePreflightSingle);
    }
    if (!isStoryboardOutput) {
      lines.push(
				m.wizard.imagePreflightAspect.replace(
					"{ratio}",
					effectiveImageAspectRatio,
				),
      );
    }
    lines.push(
			m.wizard.quickFixCreditReady.replace(
				"{tokens}",
				String(TOKEN_COST.image),
			),
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
		const styleName =
			m.wizard.visualStyles[
				visualStyleId as keyof typeof m.wizard.visualStyles
			].title;
		const tier = vOpts.fast
			? m.wizard.videoPreflightTierFast
			: m.wizard.videoPreflightTierQuality;
		const durationLabel =
			vOpts.duration === "auto" ? "auto" : `${vOpts.duration}s`;
    return {
      refMode,
      autoSecondFrame,
      lines: [
        isStoryboardOutput
          ? m.wizard.storyboardVideoPreflight
					: isUgcPresenterOutput
						? m.wizard.ugcPresenter.videoPreflight
          : isCinematicStitchOutput
							? formatCinematicCopy(
									m.wizard.cinematicStitchVideoPreflight,
								)
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
					? m.wizard.videoPreflightAI
          : "",
      ].filter(Boolean),
      costLine: autoSecondFrame
        ? m.wizard.videoPreflightDoubleCall
        : isStoryboardOutput
					? `${m.wizard.klingStoryboardFallbackNote} · ${storyboardScenes.length} scene images`
          : isCinematicStitchOutput
						? formatCinematicCopy(m.wizard.cinematicStitchVideoCost)
            : isAiPlannedVideoStyle(visualStyleId)
							? `${m.wizard.videoPreflightSingleCall} ${m.wizard.videoPreflightAI}`
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
				setImageResolution,
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
		const landingRecipe = consumeLandingRecipe();
		if (landingRecipe) {
			applyLandingRecipe(landingRecipe);
			return;
		}

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

		// Return from /edit-image: restore Done slides if ?resumeDone=1
		try {
			const wantResume =
				new URLSearchParams(window.location.search).get(
					"resumeDone",
				) === "1";
			if (wantResume) {
				const pack = readStudioDoneResume();
				if (pack?.slides?.length) {
					const urls = pack.slides.map((s) => s.url).filter(Boolean);
					setWorkflowMode(
						pack.workflowMode === "image-only"
							? "image-only"
							: pack.workflowMode,
					);
					setHeadline(pack.headline || "");
					setProduct(pack.product || "");
					setImageVariantUrls(urls);
					setImageUrl(pack.finalImageSrc || urls[0] || null);
					setSelectedVariantIndex(0);
					setImageGenKey(pack.imageGenKey || Date.now());
					setCampaignSlides([]);
					setStepKey("done");
					// Drop query param so refresh doesn't re-apply oddly; keep pack for more edits.
					const url = new URL(window.location.href);
					url.searchParams.delete("resumeDone");
					window.history.replaceState(
						{},
						"",
						url.pathname + url.search,
					);
				}
			}
		} catch {
			/* ignore */
		}
	}, []);

	function restoreDoneFromResume(): boolean {
		const pack = readStudioDoneResume();
		if (!pack?.slides?.length) return false;
		const urls = pack.slides.map((s) => s.url).filter(Boolean);
		setWorkflowMode(
			pack.workflowMode === "image-only"
				? "image-only"
				: pack.workflowMode,
		);
		setHeadline(pack.headline || "");
		setProduct(pack.product || "");
		setImageVariantUrls(urls);
		setImageUrl(pack.finalImageSrc || urls[0] || null);
		setSelectedVariantIndex(0);
		setImageGenKey(pack.imageGenKey || Date.now());
		setCampaignSlides([]);
		setStepKey("done");
		return true;
	}

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
		videoBgmEnabled,
    brandAnalyzeBusy,
		conceptPlanBusy,
		setConceptPlanBusy,
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
		setReferenceAnalyzeNote,
		setReferenceAnalyzeBusy,
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
		generateBlockbusterSceneFrame,
		generateH3ShotRecipeStill,
    getPromptVars,
    goBackFromImage,
    goBackFromVideo,
    goNextFromSetup,
    hasFinalImage,
		hasProductPhotoLock,
		hasConceptHeroLock,
    headline,
    imageBusy,
    imageCreativeMode,
    preferCompositionRemap,
    setPreferCompositionRemap,
    compositionRemapKeepHero,
    setCompositionRemapKeepHero,
    imageFinishLabel,
    imageGenKey,
    imageInputMode,
    imageJobMeta,
    imageNextDisabled,
		imageNextDisabledReason,
    imageOutputMode,
    carouselIntent,
    setCarouselIntent,
    imageResolution,
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
		setCinematicStitchReel,
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
		lockedSingleImageMode,
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
    setReferenceResearchCdn,
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
		pendingContentResearchPick,
		setPendingContentResearchPick,
		researchRemapBusy,
		setResearchRemapBusy,
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
		sceneFramePhoto,
		setSceneFramePhoto,
		sceneFramePreviewUrl,
		sceneFrameUrl,
		setSceneFrameUrl,
		sceneFrameBusy,
    regenerateStoryboardSceneWithAi,
		regenerateCarouselSlide,
		regenerateAbVariant,
		stampStoryboardSceneLogo,
    reorderStoryboardScene,
    replaceStoryboardSceneImage,
		applyProjectSnapshot,
    resetProject,
		restoreDoneFromResume,
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
		videoTimingManifest,
    captionLines,
    setAdPackPlan,
    setAdPackPlanBusy,
    setAdPackReviewOpen,
    setBgmNote,
    setBgmTrack,
		setVideoBgmEnabled,
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
    setImageResolution,
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
		carouselSlideRegenerateBusy,
    storyboardSceneReplaceBusy,
    storyboardScenes,
		storyboardGridApproved,
		setStoryboardGridApproved,
		storyboardCellsViewed,
		storyboardAllCellsViewed,
		markStoryboardCellViewed,
    storyboardTrimDuration,
    storyboardSceneCount,
    musicMood,
    voiceoverEnabled,
    voiceoverLocale,
		setStoryboardSceneCount: setLuxuryAwareSceneCount,
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
		applyKlingStoryboardClipDuration,
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
		motionPosterDialectPick,
		setMotionPosterDialectPick,
		macroSnapIntensity,
		setMacroSnapIntensity,
		foodBulletArc,
		setFoodBulletArc,
		h3ShowreelAspect,
		setH3ShowreelAspect,
		h3ShowreelSchemePick,
		setH3ShowreelSchemePick,
		h3SphereMgSchemePick,
		setH3SphereMgSchemePick,
		h3LogoMgSchemePick,
		setH3LogoMgSchemePick,
		h3TriangleLightMgSchemePick,
		setH3TriangleLightMgSchemePick,
		h3GlassTypeMgSchemePick,
		setH3GlassTypeMgSchemePick,
		h3DesignStudioMgSchemePick,
		setH3DesignStudioMgSchemePick,
		socialDripMetaphorPick,
		setSocialDripMetaphorPick,
		socialDripPlanNote,
		socialDripIgHandle,
		setSocialDripIgHandle,
		socialDripIgCaption,
		setSocialDripIgCaption,
		socialDripPourOrigin,
		setSocialDripPourOrigin,
		socialDripPourAmount,
		setSocialDripPourAmount,
		blockbusterTiming,
		setBlockbusterTiming,
		blockbusterCamera,
		setBlockbusterCamera,
		blockbusterCaptionLang,
		setBlockbusterCaptionLangAndPreset,
		blockbusterCaptionText,
		setBlockbusterCaptionText,
		blockbusterBurnCaptions,
		setBlockbusterBurnCaptions,
		blockbusterEndLogo,
		setBlockbusterEndLogo,
		blockbusterHeroHold,
		setBlockbusterHeroHold,
		webBoundarySchemePick,
		setWebBoundarySchemePick,
		creativeMotionSchemePick,
		setCreativeMotionSchemePick,
		impactPosterTonePick,
		setImpactPosterTonePick,
		impactPosterEffectPick,
		setImpactPosterEffectPick,
		impactPosterCanAutoStill,
		storyboardRecipeId,
		setStoryboardRecipeId,
		compositionPresetId,
		setCompositionPresetId,
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
		storyboardEngineChoice,
		confirmStoryboardKlingChoice,
		dismissStoryboardEngineChoice,
  };
}

export type StudioWizardValue = ReturnType<typeof useStudioWizard>;
