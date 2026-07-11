"use client";

import { useWizard } from "@/components/studio/WizardContext";
import type { StoryboardDurationPreset } from "@/hooks/useWizardState";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import { STORYBOARD_SCENE_COUNTS } from "@/lib/ad-pack-preferences";
import { TemplateSlotChecklist } from "@/components/TemplateSlotChecklist";
import { ImageCreativeModePicker } from "@/components/ImageCreativeModePicker";
import { ReferenceBriefPanel } from "@/components/ReferenceBriefPanel";
import { ImageInputModePicker } from "@/components/ImageInputModePicker";
import { UploadZone } from "@/components/UploadZone";
import { AdvancedPromptPanel } from "@/components/AdvancedPromptPanel";
import { ImageOutputModePicker } from "@/components/ImageOutputModePicker";
import { ImageAspectRatioPicker } from "@/components/ImageAspectRatioPicker";
import { SubjectFramingPicker } from "@/components/SubjectFramingPicker";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import { JobProgressBar } from "@/components/studio/JobProgressBar";
import { ImageTextModePicker } from "@/components/studio/ImageTextModePicker";
import { QuickFixImagePanel } from "@/components/studio/QuickFixImagePanel";
import { ImagePostflightPanel } from "@/components/studio/ImagePostflightPanel";
import { ImagePostGenChecklist } from "@/components/studio/ImagePostGenChecklist";
import { ShipItPanel } from "@/components/studio/ShipItPanel";
import { isBrandVideoStyle, isCreativeVideoStyle, isBrandVisualStyle, isStoryboardVideoStyle, isAiPlannedVideoStyle } from "@/lib/visual-styles";
import { CINEMATIC_SCENE_COUNTS, type CinematicSceneCount } from "@/lib/cinematic-scene-config";
import type { CampaignSlide } from "@/hooks/useWizardState";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";

export function ImageStep() {
  const { applyPromptRebuild, campaignPlan, campaignSlideLabel, campaignSlides, campaignTheme, canGenerateImage, cinematicReelPlan, cinematicSceneCount, cinematicScenes, effectiveImageMode, effectiveImageOutputMode, error, finishImageStep, formatCinematicCopy, generateImage, goBackFromImage, headline, imageAspectRatio, imageBusy, imageCreativeMode, imageFinishLabel, imageGenKey, imageGenerateDisabledReason, imageInputMode, imageNextDisabled, imagePostflight, imagePostflightBusy, imagePreflight, imageProgressInfo, imagePrompt, imageQualityChecklist, imageRefPhoto, imageRefPreviewUrl, imageStepHint, imageTextMode, imageUrl, imageVariantUrls, imageVisionReview, imageVisionReviewBusy, isCampaignOutput, isCinematicStitchOutput, isConceptCinematicSingleOutput, isConceptStoryboardOutput, isStoryboardOutput, lastImageEndpoint, lockedCampaignMode, m, needsProductUpload, onCinematicSceneCountChange, onImageCreativeModeChange, onImageInputModeChange, onProductPhotoSelected, product, productPhoto, promotionMode, promptExtra, promptMarket, referenceAd, referenceAnalyzeBusy, referenceAnalyzeNote, referenceIsVideo, referenceStrategy, regenerateStoryboardSceneWithAi, reorderStoryboardScene, replaceStoryboardSceneImage, researchReelAnalysis, researchReelAnalyzeBusy, researchReelAnalyzeNote, runShipItPipeline, selectVisualStyle, selectedVariantIndex, setCampaignPlan, setCampaignSlides, setCampaignTheme, setImageAspectRatio, setImageGenKey, setImageOutputMode, setImagePrompt, setImageRefPhoto, setImageQualityChecklist, setImageTextMode, setImageUrl, setImageVariantUrls, setPromptExtra, setPromptMarket, setSelectedVariantIndex, setShipItMode, setShowAdvancedImage, setStoryboardSceneCount, setSubjectFraming, setVideoPrompt, shipItEligible, shipItMode, shipItPipelineBusy, shipItVisionBlocked, showAdvancedImage, storyboardPlan, storyboardSceneCount, storyboardSceneRegenerateBusy, storyboardSceneReplaceBusy, storyboardScenes, storyboardTrimDuration, subjectFraming, templateId, templateSlotStatus, trimStoryboardDurations, uploadPreviewUrl, uploadQualityMessage, uploadQualityWarning, useOriginalAsKeyframe, useOriginalImage, userReferenceBrief, useReferenceVideo, usesCompositor, videoPrompt, visualStyle, visualStyleId, workflowMode } = useWizard();
  const isConcept = promotionMode === "concept";
  const isConceptSocialImage =
    isConcept &&
    workflowMode === "image-only" &&
    !isConceptCinematicSingleOutput &&
    !isCinematicStitchOutput;
  const showFramingPicker = isConcept && workflowMode === "image-only";
  const showProductUpload = usesCompositor || needsProductUpload;
  return (
<section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
  <div className="h-1 w-full animate-pulse rounded-full bg-linear-to-r from-fuchsia-500 via-cyan-400 to-emerald-400" />
  <div>
    <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      {m.wizard.step2Title}
    </h2>
    <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
      {usesCompositor ? m.wizard.compositorImageHint : imageStepHint}
    </p>
  </div>

  {workflowMode !== "image-only" && <VideoOutputSourceCard variant="image" />}

  <TemplateSlotChecklist
    templateId={templateId}
    filled={templateSlotStatus()}
    optionalSlotIds={
      isCinematicStitchOutput || isConceptCinematicSingleOutput
        ? ["productPhoto", "product", "business", "referenceVideo", "headline", "subline", "offer"]
        : isConceptStoryboardOutput
          ? ["productPhoto"]
          : undefined
    }
  />

  <ShipItPanel
    shipItMode={shipItMode}
    onShipItModeChange={setShipItMode}
    eligible={shipItEligible && !shipItVisionBlocked && !imageVisionReviewBusy}
    busy={shipItPipelineBusy || imageBusy}
    onRun={() => void runShipItPipeline()}
    showRunButton={workflowMode === "combined"}
    labels={{
      modeOn: m.wizard.shipItModeOn,
      modeOff: m.wizard.shipItModeOff,
      modeHint: m.wizard.shipItModeHint,
      showExpert: m.wizard.shipItShowExpert,
      runBtn: m.wizard.shipItRunBtn,
      running: m.wizard.shipItRunning,
      unsupported: m.wizard.shipItUnsupported,
      runHint: m.wizard.shipItRunHint,
    }}
  />

  {!usesCompositor && !isStoryboardOutput && !isCinematicStitchOutput && !isConceptCinematicSingleOutput && !shipItMode ? (
    <ImageCreativeModePicker
      value={imageCreativeMode}
      onChange={onImageCreativeModeChange}
    />
  ) : null}

  {!usesCompositor && !isStoryboardOutput && !visualStyle.usesCompositor && (
    <div className="rounded-xl border border-amber-900/45 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
      <p>{m.wizard.exactTextHint}</p>
      <button
        type="button"
        onClick={() => selectVisualStyle("paper-layout")}
        className="mt-2 text-xs font-semibold text-amber-300 underline hover:text-amber-200"
      >
        {m.wizard.exactTextCta}
      </button>
    </div>
  )}

  {!usesCompositor && templateId === "custom" && !shipItMode ? (
    <ImageInputModePicker value={imageInputMode} onChange={onImageInputModeChange} />
  ) : null}

  {!usesCompositor && imageCreativeMode === "reference-concept" && (
    <>
      <div data-coach-id="coach-style-reference">
      <UploadZone
        label={m.wizard.imageRefConceptLabel}
        hint={m.wizard.imageRefConceptHint}
        cta={m.wizard.imageRefCta}
        changeLabel={m.wizard.imageRefChange}
        previewUrl={imageRefPreviewUrl}
        fileName={imageRefPhoto?.name ?? null}
        onFile={setImageRefPhoto}
      />
      </div>
      {isConcept && imageRefPhoto && !productPhoto && (
        <p className="rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100/90">
          {m.wizard.referenceConceptStyleOnlyHint}
        </p>
      )}
    </>
  )}

  {(imageRefPhoto ||
    referenceAnalyzeBusy ||
    userReferenceBrief ||
    (useReferenceVideo && referenceAd)) && (
    <ReferenceBriefPanel
      m={m}
      brief={userReferenceBrief}
      strategy={referenceStrategy}
      busy={referenceAnalyzeBusy || researchReelAnalyzeBusy}
      note={
        researchReelAnalyzeNote ||
        referenceAnalyzeNote ||
        (useReferenceVideo && referenceAd && !researchReelAnalysis && !researchReelAnalyzeBusy
          ? m.wizard.setupReferenceVideoAnalyzeRequired
          : null)
      }
    />
  )}

  {useReferenceVideo && referenceAd && referenceIsVideo && !isStoryboardOutput && workflowMode === "combined" && (
    <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100">
      <p className="font-semibold text-amber-50">{m.wizard.imageStepReferenceReelNeedStoryboardTitle}</p>
      <p className="mt-2 text-amber-100/90">{m.wizard.imageStepReferenceReelNeedStoryboardHint}</p>
      <button
        type="button"
        onClick={() => selectVisualStyle("storyboard-video")}
        className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"
      >
        {m.wizard.imageStepReferenceReelSwitchStoryboardBtn}
      </button>
    </div>
  )}

  {useReferenceVideo && referenceAd && referenceIsVideo && (
    <div className="rounded-xl border border-violet-500/40 bg-violet-950/25 px-4 py-3 text-xs text-violet-100">
      <p className="font-semibold text-violet-50">{m.wizard.imageStepReferenceReelTitle}</p>
      {researchReelAnalysis?.visualDirection ? (
        <p className="mt-2 text-violet-200/90">
          <span className="font-medium text-violet-100">{m.wizard.imageStepReferenceReelStyle}:</span>{" "}
          {researchReelAnalysis.visualDirection}
        </p>
      ) : researchReelAnalyzeBusy ? (
        <p className="mt-2 text-violet-200/90">{m.wizard.researchReelAnalyzing}</p>
      ) : (
        <p className="mt-2 text-violet-200/90">{m.wizard.setupReferenceVideoAnalyzeRequired}</p>
      )}
      {isStoryboardOutput ? (
        <p className="mt-2 text-violet-200/70">{m.wizard.imageStepReferenceReelStoryboardHint}</p>
      ) : (
        <p className="mt-2 text-violet-200/70">{m.wizard.setupReferenceVideoNonStoryboardHint}</p>
      )}
    </div>
  )}

  {!usesCompositor && effectiveImageMode === "describe" && (
    <details className="rounded-xl border border-slate-800 bg-slate-950/40 p-3" open>
      <summary className="cursor-pointer text-sm font-medium text-slate-300">
        {m.wizard.imagePromptLabel}
      </summary>
      <AdvancedPromptPanel
        section="image"
        market={promptMarket}
        framing={subjectFraming}
        extra={promptExtra}
        imagePrompt={imagePrompt}
        videoPrompt={videoPrompt}
        onMarketChange={setPromptMarket}
        onFramingChange={setSubjectFraming}
        onExtraChange={setPromptExtra}
        onImagePromptChange={setImagePrompt}
        onVideoPromptChange={setVideoPrompt}
        onResetFromOptions={() => applyPromptRebuild()}
      />
    </details>
  )}

  {!usesCompositor && effectiveImageMode === "reference" && (
    <UploadZone
      label={m.wizard.imageRefLabel}
      hint={m.wizard.imageInputModes.reference.description}
      cta={m.wizard.imageRefCta}
      changeLabel={m.wizard.imageRefChange}
      previewUrl={imageRefPreviewUrl}
      fileName={imageRefPhoto?.name ?? null}
      onFile={setImageRefPhoto}
    />
  )}

  {showProductUpload && (
    <div data-coach-id="coach-product-photo">
      <UploadZone
        label={isConcept ? m.wizard.uploadLabelConcept : m.wizard.uploadLabel}
        hint={isConcept ? m.wizard.uploadHintConcept : m.wizard.uploadHint}
        cta={m.wizard.uploadCta}
        changeLabel={m.wizard.uploadChange}
        previewUrl={uploadPreviewUrl}
        fileName={productPhoto?.name ?? null}
        onFile={onProductPhotoSelected}
      />
      {!usesCompositor && imageCreativeMode === "reference-concept" && imageRefPhoto && (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
          {isCampaignOutput ? m.wizard.imagePreflightCampaignReference : m.wizard.imageRefConceptActiveHint}
        </p>
      )}
      {!usesCompositor &&
        effectiveImageMode === "product-ad" &&
        imageCreativeMode !== "reference-concept" && (
          <p className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
            {m.wizard.productAdHint}
          </p>
        )}
      {uploadQualityWarning && (
        <p className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          {uploadQualityMessage(uploadQualityWarning)}
        </p>
      )}
    </div>
  )}


  {!usesCompositor && effectiveImageMode !== "describe" && !shipItMode && (
    <details
      className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
      open={showAdvancedImage}
      onToggle={(e) => setShowAdvancedImage((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm text-slate-400">
        {isConcept ? m.wizard.imageAdvancedLabel : m.wizard.imagePromptLabel}
      </summary>
      <AdvancedPromptPanel
        section="image"
        market={promptMarket}
        framing={subjectFraming}
        extra={promptExtra}
        imagePrompt={imagePrompt}
        videoPrompt={videoPrompt}
        onMarketChange={setPromptMarket}
        onFramingChange={setSubjectFraming}
        onExtraChange={setPromptExtra}
        onImagePromptChange={setImagePrompt}
        onVideoPromptChange={setVideoPrompt}
        onResetFromOptions={() => applyPromptRebuild()}
      />
    </details>
  )}

  {showFramingPicker && !shipItMode && (
    <SubjectFramingPicker
      value={subjectFraming}
      onChange={setSubjectFraming}
      variant="dark"
    />
  )}

  {!usesCompositor && !isStoryboardOutput && !shipItMode && (
    <ImageAspectRatioPicker
      value={imageAspectRatio}
      onChange={(ratio) => {
        setImageAspectRatio(ratio);
        setImageUrl(null);
        setImageVariantUrls([]);
        setCampaignPlan(null);
        setCampaignSlides([]);
      }}
    />
  )}

  {isConceptCinematicSingleOutput && (
    <div className="rounded-2xl border border-fuchsia-800/50 bg-fuchsia-950/25 p-4">
      <p className="text-sm font-semibold text-fuchsia-100">{m.wizard.conceptCinematicSingleOutputTitle}</p>
      <p className="mt-1 text-xs text-fuchsia-200/90">{m.wizard.conceptCinematicSingleOutputDesc}</p>
      <p className="mt-2 text-xs text-amber-200/90">{m.wizard.conceptCinematicSingleNoPosterHint}</p>
    </div>
  )}

  {isConceptSocialImage && (
    <div className="rounded-2xl border border-cyan-800/50 bg-cyan-950/25 p-4 space-y-2">
      <p className="text-xs text-cyan-200/90">{m.wizard.conceptSocialImageHint}</p>
      {(effectiveImageOutputMode === "teaching-carousel" || effectiveImageOutputMode === "campaign") && (
        <p className="text-xs text-cyan-200/80">{m.wizard.conceptCarouselModeHint}</p>
      )}
      <p className="text-xs text-slate-400">{m.wizard.conceptNoStyleMemoryHint}</p>
    </div>
  )}

  {isCinematicStitchOutput && (
    <div className="rounded-2xl border border-fuchsia-800/50 bg-fuchsia-950/25 p-4">
      <p className="text-sm font-semibold text-fuchsia-100">
        {formatCinematicCopy(m.wizard.cinematicStitchOutputTitle)}
      </p>
      <p className="mt-1 text-xs text-fuchsia-200/90">{m.wizard.cinematicStitchOutputDesc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-fuchsia-200">
          {m.wizard.cinematicSceneCountLabel}
          <select
            value={cinematicSceneCount}
            onChange={(e) =>
              onCinematicSceneCountChange(Number(e.target.value) as CinematicSceneCount)
            }
            className="rounded-lg border border-fuchsia-700 bg-slate-900 px-2 py-1 text-xs text-fuchsia-100"
          >
            {CINEMATIC_SCENE_COUNTS.filter((n) => n > 1).map((n) => (
              <option key={n} value={n}>
                {formatCinematicCopy(m.wizard.cinematicSceneCountOption, n)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[10px] text-fuchsia-200/80">{m.wizard.cinematicSceneCountHint}</p>
    </div>
  )}

  {!usesCompositor && !isStoryboardOutput && !isCinematicStitchOutput && !isConceptCinematicSingleOutput && effectiveImageMode !== "describe" && !shipItMode && (
    <div data-coach-id="coach-image-output-mode">
    <ImageOutputModePicker
      value={effectiveImageOutputMode}
      includeTeachingCarousel={isConcept}
      onChange={(mode) => {
        setImageOutputMode(mode);
        setCampaignPlan(null);
        setCampaignSlides([]);
        setImageUrl(null);
        setImageVariantUrls([]);
      }}
      lockedCampaign={lockedCampaignMode}
    />
    </div>
  )}

  {!usesCompositor && isCampaignOutput && (
    <>
      <label className="block text-sm font-medium text-slate-300">
        {m.wizard.campaignThemeLabel}
      </label>
      <input
        value={campaignTheme}
        onChange={(e) => setCampaignTheme(e.target.value)}
        placeholder={m.wizard.campaignThemePlaceholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
      />
    </>
  )}

  {isStoryboardOutput && (
    <div className="rounded-2xl border border-teal-800/50 bg-teal-950/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-teal-200">
          {m.wizard.storyboardTrimDurationLabel}
          <select
            value={storyboardTrimDuration}
            onChange={(e) =>
              trimStoryboardDurations(e.target.value as StoryboardDurationPreset)
            }
            className="rounded-lg border border-teal-700 bg-slate-900 px-2 py-1 text-xs text-teal-100"
          >
            <option value="4">4s</option>
            <option value="6">6s</option>
            <option value="8">8s</option>
            <option value="10">10s</option>
            <option value="12">12s</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-teal-200">
          {m.wizard.storyboardSceneCountLabel}
          <select
            value={storyboardSceneCount}
            onChange={(e) =>
              setStoryboardSceneCount(e.target.value as StoryboardSceneCount)
            }
            className="rounded-lg border border-teal-700 bg-slate-900 px-2 py-1 text-xs text-teal-100"
          >
            {STORYBOARD_SCENE_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n === "auto" ? m.wizard.storyboardSceneCountAuto : n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[10px] text-teal-200/80">{m.wizard.storyboardSceneCountHint}</p>
    </div>
  )}

  {error && <WizardErrorBanner message={error} variant="dark" />}

  {!usesCompositor && !isStoryboardOutput && !shipItMode && (
    <ImageTextModePicker
      value={imageTextMode}
      disabled={imageBusy}
      onChange={setImageTextMode}
    />
  )}

  <div className="flex flex-wrap gap-2">
    {imageGenerateDisabledReason && !imageBusy && !canGenerateImage() && (
      <p className="w-full text-xs text-amber-200/90">{imageGenerateDisabledReason}</p>
    )}
    <button
      type="button"
      data-coach-id="coach-generate-image"
      disabled={imageBusy || !canGenerateImage()}
      title={imageGenerateDisabledReason ?? undefined}
      onClick={generateImage}
      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {imageBusy
        ? isStoryboardOutput
          ? m.wizard.storyboardGenerating
          : isCinematicStitchOutput
            ? m.wizard.cinematicStitchGenerating
          : isConceptCinematicSingleOutput
            ? m.wizard.conceptCinematicSingleGenerating
          : isCampaignOutput
          ? m.wizard.campaignGenerating
          : m.wizard.imageGenerating
        : imageUrl
          ? usesCompositor
            ? m.wizard.compositorRegenerateImageBtn
            : m.wizard.regenerateImageBtn
          : usesCompositor
            ? m.wizard.compositorImageBtn
            : isCinematicStitchOutput
              ? formatCinematicCopy(m.wizard.cinematicStitchGenerateBtn)
              : isConceptCinematicSingleOutput
                ? m.wizard.conceptCinematicSingleGenerateBtn
              : m.wizard.generateImageBtn}
    </button>
    {needsProductUpload &&
      productPhoto &&
      !usesCompositor &&
      workflowMode !== "combined" && (
      <button
        type="button"
        onClick={useOriginalAsKeyframe}
        className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-200"
      >
        {workflowMode === "image-only"
          ? m.wizard.useOriginalImageOnlyBtn
          : m.wizard.useOriginalBtn}
      </button>
    )}
  </div>

  {imagePreflight && !imageBusy && (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 px-4 py-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">{m.wizard.imagePreflightTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {imagePreflight.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )}

  {imageBusy && imageProgressInfo && (
    <JobProgressBar
      info={imageProgressInfo}
      busyLabel={m.wizard.imageGenerating}
    />
  )}

  {uploadPreviewUrl && !imageUrl && !useOriginalImage && (
    <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4">
      <p className="mb-2 text-xs font-medium text-amber-200">{m.wizard.uploadPreviewLabel}</p>
      <img
        src={uploadPreviewUrl}
        alt=""
        className="mx-auto max-h-48 rounded-lg object-contain opacity-90"
      />
    </div>
  )}

  {storyboardScenes.length > 0 && (
    <div className="rounded-2xl border border-teal-700/50 bg-teal-950/25 p-4">
      <p className="mb-2 text-[10px] text-teal-200/80">{m.wizard.storyboardEditorHint}</p>
      {storyboardPlan?.theme && (
        <p className="mb-2 text-xs text-teal-100/80">
          <span className="font-medium text-teal-200">{m.wizard.storyboardPlanLabel}:</span>{" "}
          {storyboardPlan.theme}
        </p>
      )}
      {storyboardPlan?.productionNotes && (
        <p className="mb-3 text-xs text-teal-200/80">{storyboardPlan.productionNotes}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {storyboardScenes.map((scene: StoryboardSceneResult, i: number) => (
          <div
            key={`${scene.imageUrl}-${i}`}
            className="rounded-xl border border-slate-700 bg-slate-900/40 p-2"
          >
            <img
              src={`${scene.imageUrl}${scene.imageUrl.includes("?") ? "&" : "?"}v=${imageGenKey}-${i}`}
              alt=""
              className="mx-auto max-h-48 w-full rounded-lg object-contain"
            />
            <span className="mt-2 block text-center text-xs font-medium text-slate-200">
              {m.wizard.storyboardSceneLabel} {scene.imageIndex}
              {scene.startSec !== scene.endSec
                ? ` · ${scene.startSec}–${scene.endSec}s`
                : ""}
            </span>
            <span className="mt-1 block text-center text-[10px] text-slate-400 line-clamp-2">
              {scene.sceneDescriptionZh || scene.role}
            </span>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => reorderStoryboardScene(i, i - 1)}
                className="min-h-10 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
              >
                {m.wizard.storyboardMoveUpBtn}
              </button>
              <button
                type="button"
                disabled={i === storyboardScenes.length - 1}
                onClick={() => reorderStoryboardScene(i, i + 1)}
                className="min-h-10 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
              >
                {m.wizard.storyboardMoveDownBtn}
              </button>
              <label className="flex min-h-10 cursor-pointer items-center rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200">
                {storyboardSceneReplaceBusy === i
                  ? m.wizard.storyboardReplacingImage
                  : m.wizard.storyboardReplaceImageBtn}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    replaceStoryboardSceneImage(i, e.target.files?.[0] ?? null)
                  }
                />
              </label>
              <button
                type="button"
                disabled={storyboardSceneRegenerateBusy !== null}
                onClick={() => regenerateStoryboardSceneWithAi(i)}
                className="min-h-10 rounded-md border border-amber-500/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 disabled:opacity-40"
              >
                {storyboardSceneRegenerateBusy === i
                  ? m.wizard.storyboardRegeneratingImage
                  : m.wizard.storyboardRegenerateAiBtn}
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-amber-300/90">
              {m.wizard.storyboardRegenerateAiCostHint}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-teal-200/80">{m.wizard.storyboardAllScenesImageHint}</p>
      {lastImageEndpoint && (
        <p className="mt-2 text-[10px] text-slate-500">{lastImageEndpoint}</p>
      )}
    </div>
  )}

  {cinematicScenes.length > 0 && (
    <div className="rounded-2xl border border-fuchsia-700/50 bg-fuchsia-950/25 p-4">
      {cinematicReelPlan?.theme && (
        <p className="mb-2 text-xs text-fuchsia-100/80">
          <span className="font-medium text-fuchsia-200">{m.wizard.cinematicReelPlanLabel}:</span>{" "}
          {cinematicReelPlan.theme}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {cinematicScenes.map((scene: CinematicSceneResult) => (
          <div
            key={`${scene.imageUrl}-${scene.sceneIndex}`}
            className="rounded-xl border border-slate-700 bg-slate-900/40 p-2"
          >
            <img
              src={scene.imageUrl}
              alt=""
              className="mx-auto max-h-48 w-full rounded-lg object-contain"
            />
            <span className="mt-2 block text-center text-xs font-medium text-slate-200">
              {m.wizard.storyboardSceneLabel} {scene.sceneIndex}
              {` · ${scene.startSec}–${scene.endSec}s`}
            </span>
            <span className="mt-1 block text-center text-[10px] text-slate-400 line-clamp-2">
              {scene.sceneDescriptionZh || scene.role}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-fuchsia-200/80">{formatCinematicCopy(m.wizard.cinematicStitchImageHint)}</p>
    </div>
  )}

  {imageUrl && !useOriginalImage && campaignSlides.length > 1 && (
    <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4">
      {campaignPlan?.theme && (
        <p className="mb-2 text-xs text-emerald-100/80">
          <span className="font-medium text-emerald-200">{m.wizard.campaignPlanLabel}:</span>{" "}
          {campaignPlan.theme}
        </p>
      )}
      <p className="mb-3 text-xs font-medium text-emerald-200">
        {m.wizard.pickCampaignSlideLabel}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {campaignSlides.map((slide: CampaignSlide, i: number) => (
          <button
            key={`${slide.imageUrl}-${i}`}
            type="button"
            onClick={() => {
              setSelectedVariantIndex(i);
              setImageUrl(slide.imageUrl);
              setImageGenKey((k: number) => k + 1);
            }}
            className={`rounded-xl border p-2 text-left transition ${
              selectedVariantIndex === i
                ? "border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/60"
                : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
            }`}
          >
            <img
              src={`${slide.imageUrl}${slide.imageUrl.includes("?") ? "&" : "?"}v=${imageGenKey}-${i}`}
              alt=""
              className="mx-auto max-h-52 w-full rounded-lg object-contain"
            />
            <span className="mt-2 block text-center text-xs font-medium text-slate-200">
              {campaignSlideLabel(slide.role, slide.title)}
            </span>
            {slide.headline && (
              <span className="mt-1 block text-center text-[10px] text-slate-400 line-clamp-2">
                {slide.headline}
              </span>
            )}
          </button>
        ))}
      </div>
      {lastImageEndpoint && (
        <p className="mt-2 text-[10px] text-slate-500">{lastImageEndpoint}</p>
      )}
    </div>
  )}

  {imageUrl &&
    !useOriginalImage &&
    !isStoryboardOutput &&
    !isCinematicStitchOutput &&
    campaignSlides.length <= 1 &&
    imageVariantUrls.length > 1 && (
    <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4">
      <p className="mb-3 text-xs font-medium text-emerald-200">{m.wizard.pickVariantLabel}</p>
      <div className="grid grid-cols-2 gap-3">
        {imageVariantUrls.map((url: string, i: number) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => {
              setSelectedVariantIndex(i);
              setImageUrl(url);
              setImageGenKey((k: number) => k + 1);
            }}
            className={`rounded-xl border p-2 text-left transition ${
              selectedVariantIndex === i
                ? "border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/60"
                : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
            }`}
          >
            <img
              src={`${url}${url.includes("?") ? "&" : "?"}v=${imageGenKey}-${i}`}
              alt=""
              className="mx-auto max-h-52 w-full rounded-lg object-contain"
            />
            <span className="mt-2 block text-center text-xs text-slate-300">
              {i === 0 ? m.wizard.variantA : m.wizard.variantB}
            </span>
          </button>
        ))}
      </div>
      {lastImageEndpoint && (
        <p className="mt-2 text-[10px] text-slate-500">{lastImageEndpoint}</p>
      )}
    </div>
  )}

  {imageUrl &&
    !useOriginalImage &&
    !isStoryboardOutput &&
    imageVariantUrls.length <= 1 && (
    <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4">
      <p className="mb-2 text-xs font-medium text-emerald-200">{m.wizard.aiImageResultLabel}</p>
      {lastImageEndpoint && (
        <p className="mb-2 text-[10px] text-slate-500">{lastImageEndpoint}</p>
      )}
      <img
        src={`${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${imageGenKey}`}
        alt=""
        className="mx-auto max-h-72 rounded-lg object-contain"
      />
    </div>
  )}

  {imagePostflight && imageUrl && !useOriginalImage && !isStoryboardOutput && (
    <ImagePostflightPanel
      postflight={imagePostflight}
      visionReview={imageVisionReview}
      busy={imagePostflightBusy}
      visionBusy={imageVisionReviewBusy}
      labels={{
        title: m.wizard.imagePostflightTitle,
        resolution: m.wizard.imagePostflightResolution,
        aspect: m.wizard.imagePostflightAspect,
        safeForVideo: m.wizard.imagePostflightSafeForVideo,
        notSafeForVideo: m.wizard.imagePostflightNotSafeForVideo,
        lowResolution: m.wizard.imagePostflightLowRes,
        verySmall: m.wizard.imagePostflightVerySmall,
        analyzing: m.wizard.imagePostflightAnalyzing,
        visionTitle: m.wizard.imageVisionReviewTitle,
        visionAnalyzing: m.wizard.imageVisionReviewAnalyzing,
        visionScore: m.wizard.imageVisionReviewScore,
        visionSummary: m.wizard.imageVisionReviewSummary,
        visionIssues: m.wizard.imageVisionReviewIssues,
        visionPass: m.wizard.imageVisionReviewPass,
      }}
    />
  )}

  {imageUrl && !useOriginalImage && !isStoryboardOutput && !usesCompositor && (
    <ImagePostGenChecklist
      value={imageQualityChecklist}
      onChange={setImageQualityChecklist}
      onRegenerate={() => void generateImage()}
      regenerateBusy={imageBusy}
      labels={{
        title: m.wizard.imagePostGenChecklistTitle,
        hint: m.wizard.imagePostGenChecklistHint,
        productReadable: m.wizard.imagePostGenProductReadable,
        textLegible: m.wizard.imagePostGenTextLegible,
        regenerateBtn: m.wizard.imagePostGenRegenerateBtn,
        regenerating: m.wizard.imagePostGenRegenerating,
        allChecked: m.wizard.imagePostGenAllChecked,
      }}
    />
  )}

  {imageUrl && !useOriginalImage && !isStoryboardOutput && !usesCompositor && imageTextMode === "textless" && (
    <p className="rounded-xl border border-cyan-900/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100">
      {m.wizard.imageTextlessPostHint}
    </p>
  )}

  {imageUrl && !useOriginalImage && !isStoryboardOutput && (
    <QuickFixImagePanel variant="dark" />
  )}

  {workflowMode === "combined" && isCreativeVideoStyle(visualStyleId) && (
    <p className="rounded-xl border border-violet-900/50 bg-violet-950/25 px-4 py-3 text-xs text-violet-100">
      {m.wizard.combinedCreativeImageHint}
    </p>
  )}

  {useOriginalImage && uploadPreviewUrl && (
    <div className="rounded-2xl border border-slate-700 p-4">
      <p className="mb-2 text-xs text-slate-400">{m.wizard.originalImageLabel}</p>
      <img
        src={uploadPreviewUrl}
        alt=""
        className="mx-auto max-h-72 rounded-lg object-contain"
      />
    </div>
  )}

  <div className="hidden gap-3 md:flex">
    <button
      type="button"
      onClick={goBackFromImage}
      className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
    >
      {m.wizard.back}
    </button>
    <button
      type="button"
      data-coach-id="coach-continue-image"
      disabled={imageNextDisabled}
      onClick={finishImageStep}
      className="flex-1 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] disabled:opacity-40"
    >
      {imageFinishLabel}
    </button>
  </div>
</section>
  );
}
