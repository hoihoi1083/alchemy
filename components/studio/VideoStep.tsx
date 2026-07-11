"use client";

import { useWizard } from "@/components/studio/WizardContext";
import { VideoCreativeModePicker } from "@/components/VideoCreativeModePicker";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { UploadZone } from "@/components/UploadZone";
import { ReferenceClipPicker } from "@/components/ReferenceClipPicker";
import { ReferenceUploadZone } from "@/components/ReferenceUploadZone";
import { TemplateSlotChecklist } from "@/components/TemplateSlotChecklist";
import { AdvancedPromptPanel } from "@/components/AdvancedPromptPanel";
import { AdPackReviewPanel } from "@/components/studio/AdPackReviewPanel";
import { ConceptPreGeneratePanel } from "@/components/studio/ConceptPreGeneratePanel";
import { PresenterAvatarPicker } from "@/components/studio/PresenterAvatarPicker";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import { isBrandVideoStyle, isCreativeVideoStyle, isStoryboardVideoStyle } from "@/lib/visual-styles";
import { isVideoOutputPathLocked, resolveVideoOutputPresentation } from "@/lib/video-output-presentation";
import { analyzeProductImageFile } from "@/lib/image-upload-quality";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";

export function VideoStep() {
  const { applyPromptRebuild, bgmOptions, bgmTrack, brandProfile, cinematicScenes, cinematicSceneCount, cinematicStitchReady, conceptReferenceR2vReady, directReferenceR2vReady, creativeVideoBrief, endFramePhoto, endFramePreviewUrl, endFrameUrl, error, extraAnglePhotos, extraKitPhotos, extraKitPreviewUrls, formatCinematicCopy, generateVideo, goBackFromVideo, hasFinalImage, headline, imagePrompt, imageUrl, isCinematicStitchOutput, isConceptCinematicSingleOutput, isStoryboardOutput, isUgcPresenterOutput, keyframePreview, loadReferenceClip, m, onReferenceAdFile, onVideoCreativeModeChange, packagingPhoto, packagingPreviewUrl, planAiVideoPrompt, planProductVideo, planProductVideoBusy, planVideoPromptBusy, presenterAvatarId, presenterSourceMode, productPhoto, productVideoPlan, promotionMode, promptExtra, promptMarket, referenceAd, referenceClipLoading, referenceIsVideo, referencePreviewUrl, researchReelAnalysis, researchReelAnalyzeBusy, researchReelAnalyzeNote, selectedReferenceClipId, setBgmTrack, setConceptImageVisionNote, setEndFramePhoto, setEndFrameUrl, setError, setExtraAnglePhotos, setExtraKitPhotos, setPackagingPhoto, setImagePrompt, setImageUrl, setPresenterAvatarId, setPresenterSourceMode, setProductPhoto, setPromptExtra, setPromptMarket, setShowAdvancedVideo, setSubjectFraming, setUploadQualityWarning, setUseOriginalImage, setVideoPrompt, setVideoSettings, shipItMode, showAdvancedVideo, showVideoReferenceSection, storyboardScenes, subjectFraming, templateId, templateSlotStatus, uploadPreviewUrl, useReferenceVideo, usesCompositor, usesConceptTextVideo, usesProductAssistant, videoBusy, videoCreativeMode, videoGenerateDisabled, videoGenerateDisabledReason, videoPhase, videoPreflight, videoProgressInfo, videoPrompt, videoPromptPlanNote, videoSettings, videoStepHint, visualStyleId, workflowMode } = useWizard();
  const isConcept = promotionMode === "concept";
  const showCinematicStitch = isCinematicStitchOutput || cinematicStitchReady;
  const showConceptCinematicSingle =
    isConceptCinematicSingleOutput && cinematicScenes.length > 0;
  const videoOutputId = resolveVideoOutputPresentation({
    workflowMode,
    usesCompositor,
    isStoryboardOutput,
    isUgcPresenterOutput,
    shouldCinematicStitch: showCinematicStitch,
    isConceptCinematicSingleOutput,
    usesProductAssistant,
    conceptTextVideoReady: usesConceptTextVideo && Boolean(videoPrompt.trim()),
    videoCreativeMode,
    useReferenceVideo,
    hasReferenceAd: Boolean(referenceAd),
  });
  const hideVideoModePicker =
    Boolean(videoOutputId && isVideoOutputPathLocked(videoOutputId)) ||
    showCinematicStitch ||
    isConceptCinematicSingleOutput;
  const showReferenceR2vOutputSettings =
    !usesCompositor && useReferenceVideo && !isStoryboardOutput;
  return (
<section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-slate-900/40 backdrop-blur">
  <div className="h-1 w-full animate-pulse rounded-full bg-linear-to-r from-violet-500 via-cyan-400 to-teal-400" />
  <div>
    <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      {m.wizard.step3Title}
    </h2>
    <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
      {usesCompositor ? m.wizard.compositorVideoHint : videoStepHint}
    </p>
  </div>

  <VideoOutputSourceCard variant="video" />

  {isUgcPresenterOutput && (
    <PresenterAvatarPicker
      mode={presenterSourceMode}
      avatarId={presenterAvatarId}
      disabled={videoBusy}
      onModeChange={setPresenterSourceMode}
      onAvatarChange={setPresenterAvatarId}
    />
  )}

  {isConcept && workflowMode === "video-only" && (
    <p className="rounded-xl border border-cyan-900/50 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-100">
      {m.wizard.conceptVideoStepIntro}
    </p>
  )}

  {showCinematicStitch && (
    <p className="rounded-xl border border-fuchsia-800/50 bg-fuchsia-950/30 px-4 py-3 text-xs text-fuchsia-100">
      {formatCinematicCopy(m.wizard.cinematicStitchWorkflowOrder)}
    </p>
  )}

  {isConcept && visualStyleId === "concept-cinematic" && (
    <div className="rounded-xl border border-fuchsia-900/50 bg-fuchsia-950/25 px-4 py-3 text-xs text-fuchsia-100">
      <p className="font-semibold text-fuchsia-50">{m.wizard.cinematicRecipeTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {(showCinematicStitch
          ? m.wizard.cinematicStitchRecipeSteps
          : isConceptCinematicSingleOutput
            ? m.wizard.conceptCinematicSingleRecipeSteps
            : m.wizard.cinematicRecipeSteps
        ).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  )}

  {showConceptCinematicSingle && (
    <div className="rounded-xl border border-fuchsia-800/50 bg-fuchsia-950/30 p-4">
      <p className="text-sm font-semibold text-fuchsia-100">{m.wizard.conceptCinematicSingleSceneReady}</p>
      <div className="mt-3 max-w-xs">
        <img
          src={cinematicScenes[0].imageUrl}
          alt=""
          className="aspect-[9/16] w-full rounded-lg border border-slate-700 object-cover"
        />
        <p className="mt-1 text-center text-[10px] text-slate-300">0–8s</p>
      </div>
    </div>
  )}

  {showCinematicStitch && cinematicScenes.length > 0 && (
    <div className="rounded-xl border border-fuchsia-800/50 bg-fuchsia-950/30 p-4">
      <p className="text-sm font-semibold text-fuchsia-100">
        {formatCinematicCopy(m.wizard.cinematicStitchScenesReady).replace(
          "{ready}",
          String(cinematicScenes.length),
        )}
      </p>
      <div
        className={`mt-3 grid gap-2 ${
          cinematicScenes.length <= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
        }`}
      >
        {cinematicScenes.map((scene: CinematicSceneResult) => (
          <div key={scene.sceneIndex} className="rounded-lg border border-slate-700 bg-slate-900/50 p-1">
            <img src={scene.imageUrl} alt="" className="aspect-[9/16] w-full rounded object-cover" />
            <p className="mt-1 text-center text-[10px] text-slate-300">
              {scene.startSec}–{scene.endSec}s
            </p>
          </div>
        ))}
      </div>
    </div>
  )}

  {isConcept && workflowMode === "video-only" && productPhoto && (
    <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-100">
      {m.wizard.conceptVideoKeyframeFromSetup}
    </p>
  )}

  {workflowMode === "combined" &&
    imageUrl &&
    videoCreativeMode === "image-to-video" &&
    !showCinematicStitch &&
    !isConceptCinematicSingleOutput && (
      <p className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-100">
        {m.wizard.combinedVideoKeyframeCallout}
      </p>
    )}

  {workflowMode === "combined" &&
    referenceAd &&
    referenceIsVideo &&
    videoCreativeMode === "image-to-video" && (
      <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100">
        {m.wizard.videoRefIgnoredOnImageMode}
      </p>
    )}

  {isStoryboardOutput && (
    <p className="rounded-xl border border-teal-900/50 bg-teal-950/30 px-4 py-3 text-xs text-teal-100">
      {m.wizard.storyboardVideoIntro}
    </p>
  )}

  {/* Reference ad MP4 — only when template includes this slot */}
  {!usesCompositor && !hideVideoModePicker && !(isConcept && workflowMode === "video-only") && !shipItMode && (
    <VideoCreativeModePicker
      goal={workflowMode}
      promotionMode={promotionMode}
      value={videoCreativeMode}
      onChange={onVideoCreativeModeChange}
      variant="dark"
    />
  )}

  {isConcept && workflowMode === "video-only" && (
    <div className="space-y-2 rounded-xl border border-violet-500/40 bg-violet-950/30 px-4 py-3">
      <p className="text-sm font-semibold text-violet-50">
        {videoCreativeMode === "reference-concept"
          ? m.wizard.conceptVideoReferenceModeTitle
          : m.wizard.conceptVideoCreativeMode.title}
      </p>
      <p className="text-xs text-violet-200/90">
        {videoCreativeMode === "reference-concept"
          ? m.wizard.conceptVideoReferenceModeHint
          : m.wizard.conceptVideoCreativeMode.description}
      </p>
      <button
        type="button"
        onClick={() =>
          onVideoCreativeModeChange(
            videoCreativeMode === "reference-concept" ? "product-promo" : "reference-concept",
          )
        }
        className="text-xs font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
      >
        {videoCreativeMode === "reference-concept"
          ? m.wizard.conceptVideoBackToBrief
          : m.wizard.conceptVideoUseReferenceInstead}
      </button>
    </div>
  )}

  {!usesCompositor && usesProductAssistant && (
    <div className="space-y-4 rounded-xl border-2 border-cyan-500/40 bg-cyan-950/30 px-4 py-4 shadow-lg shadow-cyan-950/30">
      <div>
        <p className="text-base font-semibold text-cyan-50">{m.wizard.productVideoKitTitle}</p>
        <p className="mt-1 text-xs text-cyan-200/85">{m.wizard.productVideoKitHint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadZone
          label={m.wizard.productVideoHeroLabel}
          hint={m.wizard.productVideoHeroHint}
          cta={m.wizard.uploadCta}
          changeLabel={m.wizard.uploadChange}
          previewUrl={uploadPreviewUrl}
          fileName={productPhoto?.name ?? null}
          onFile={async (f) => {
            setProductPhoto(f);
            setUseOriginalImage(true);
            setError(null);
            setUploadQualityWarning(null);
            if (!f) return;
            try {
              const quality = await analyzeProductImageFile(f);
              setUploadQualityWarning(quality.warnings[0] ?? null);
            } catch {
              setUploadQualityWarning(null);
            }
          }}
        />
        <UploadZone
          label={m.wizard.productVideoPackagingLabel}
          hint={m.wizard.productVideoPackagingHint}
          cta={m.wizard.uploadCta}
          changeLabel={m.wizard.uploadChange}
          previewUrl={packagingPreviewUrl}
          fileName={packagingPhoto?.name ?? null}
          onFile={(f) => {
            setPackagingPhoto(f);
            setError(null);
          }}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-cyan-100">{m.wizard.productVideoExtraLabel}</p>
        <p className="text-[11px] text-cyan-200/70">{m.wizard.productVideoExtraHint}</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-800 file:px-3 file:py-2 file:text-sm file:text-white"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 2);
            setExtraKitPhotos(files);
            setError(null);
          }}
        />
        {extraKitPhotos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {extraKitPreviewUrls.map((url: string) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-16 w-16 rounded-lg border border-cyan-800 object-cover"
              />
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={planProductVideo}
        disabled={planProductVideoBusy || !productPhoto}
        className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 sm:w-auto"
      >
        {planProductVideoBusy ? m.wizard.planProductVideoBusy : m.wizard.planProductVideoBtn}
      </button>
      {productVideoPlan && (
        <div className="rounded-lg border border-cyan-800/50 bg-slate-950/40 px-3 py-3 text-xs text-cyan-100/90">
          <p className="font-semibold text-cyan-50">{productVideoPlan.productSummary}</p>
          {productVideoPlan.imageRoles.map((role: { imageIndex: number; role: string }) => (
            <p key={role.imageIndex} className="mt-1">
              <span className="font-medium text-cyan-200">@Image{role.imageIndex}</span>{" "}
              {role.role}
            </p>
          ))}
        </div>
      )}
      {videoPromptPlanNote && (
        <p className="text-xs text-cyan-100/90">{videoPromptPlanNote}</p>
      )}
    </div>
  )}

  {!usesCompositor && !shipItMode && !showReferenceR2vOutputSettings && (
    <VideoSettingsPanel value={videoSettings} onChange={setVideoSettings} />
  )}

  {!usesCompositor && !isStoryboardOutput && !showCinematicStitch && !isConceptCinematicSingleOutput && !usesProductAssistant && !usesConceptTextVideo && (
    <div className="rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
      <p className="font-semibold text-sky-50">{m.wizard.videoWearVarietyTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-sky-100/90">
        {m.wizard.videoWearVarietyTips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )}

  {!usesCompositor && !isStoryboardOutput && !showCinematicStitch && !isConceptCinematicSingleOutput && !usesProductAssistant && (
    <div className="space-y-3 rounded-xl border border-violet-900/50 bg-violet-950/25 px-4 py-3">
      <p className="text-sm font-semibold text-violet-50">{m.wizard.planVideoPromptBtn}</p>
      <p className="text-xs text-violet-200/90">
        {isCreativeVideoStyle(visualStyleId)
          ? m.wizard.creativeVideoIntro
          : isBrandVideoStyle(visualStyleId)
            ? m.wizard.brandVideoIntro
            : m.wizard.videoPreflightModeProduct}
      </p>
      <button
        type="button"
        onClick={planAiVideoPrompt}
        disabled={
          planVideoPromptBusy ||
          (isBrandVideoStyle(visualStyleId) &&
            promotionMode !== "concept" &&
            !brandProfile?.businessName) ||
          (isCreativeVideoStyle(visualStyleId) &&
            !creativeVideoBrief.trim() &&
            !headline.trim())
        }
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {planVideoPromptBusy ? m.wizard.planVideoPromptBusy : m.wizard.planVideoPromptBtn}
      </button>
      {videoPromptPlanNote && (
        <p className="text-xs text-violet-100/90">{videoPromptPlanNote}</p>
      )}
      {isBrandVideoStyle(visualStyleId) && !brandProfile?.businessName && (
        <p className="text-xs text-amber-200/90">{m.errors.brandAnalyzeRequired}</p>
      )}
      {isCreativeVideoStyle(visualStyleId) && !creativeVideoBrief.trim() && !headline.trim() && (
        <p className="text-xs text-amber-200/90">{m.errors.creativeBriefRequired}</p>
      )}
    </div>
  )}

  {!usesCompositor && videoCreativeMode === "reference-concept" && (
      <div className="space-y-3 rounded-2xl border border-violet-900/40 bg-violet-950/20 p-4">
        <p className="text-sm font-medium text-violet-100">{m.wizard.extraAnglesLabel}</p>
        <p className="text-xs text-violet-200/70">{m.wizard.extraAnglesHint}</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-800 file:px-3 file:py-2 file:text-sm file:text-white"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 3);
            setExtraAnglePhotos(files);
            setError(null);
          }}
        />
        {extraAnglePhotos.length > 0 && (
          <p className="text-xs text-violet-200">
            {extraAnglePhotos.length} {m.wizard.extraAnglesCta}
          </p>
        )}
      </div>
    )}

  {!usesCompositor && videoCreativeMode !== "reference-concept" && !usesConceptTextVideo && !showCinematicStitch && !isConceptCinematicSingleOutput && (
    <UploadZone
      label={m.wizard.endFrameLabel}
      hint={m.wizard.endFrameHint}
      cta={m.wizard.uploadCta}
      changeLabel={m.wizard.uploadChange}
      previewUrl={endFramePreviewUrl ?? (endFrameUrl || null)}
      fileName={endFramePhoto?.name ?? (endFrameUrl ? "ai-second-frame.png" : null)}
      onFile={(f) => {
        setEndFramePhoto(f);
        setEndFrameUrl(null);
        setError(null);
      }}
    />
  )}

  {!usesCompositor && showVideoReferenceSection && (
  <div
    id="video-reference-upload"
    className="space-y-3 rounded-2xl border-2 border-emerald-600/50 bg-emerald-950/25 p-4 shadow-lg shadow-emerald-950/30"
  >
    <h3 className="text-base font-semibold text-emerald-100">{m.wizard.videoSectionReference}</h3>
    <p className="text-xs text-emerald-200/80">{m.wizard.referenceHint}</p>
    <p className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
      {m.wizard.referenceVideoTips}
    </p>
    <ReferenceClipPicker
      selectedClipId={selectedReferenceClipId}
      onSelectClip={loadReferenceClip}
      loading={referenceClipLoading}
    />
    <ReferenceUploadZone
      label={m.wizard.referenceLabel}
      hint={m.wizard.referenceVideoOnlyHint}
      cta={m.wizard.referenceCta}
      changeLabel={m.wizard.referenceChange}
      previewUrl={referencePreviewUrl}
      isVideo={referenceIsVideo}
      fileName={referenceAd?.name ?? null}
      onFile={onReferenceAdFile}
    />
    {useReferenceVideo && (
      <>
        <p className="rounded-lg bg-emerald-900/40 px-3 py-2 text-xs text-emerald-200">
          {m.wizard.referenceModeActive}
        </p>
        {(researchReelAnalyzeBusy || researchReelAnalyzeNote) && (
          <p className="rounded-lg bg-purple-950/40 px-3 py-2 text-xs text-purple-100">
            {researchReelAnalyzeBusy ? m.wizard.researchReelAnalyzing : researchReelAnalyzeNote}
          </p>
        )}
        {workflowMode === "video-only" && useReferenceVideo && (
          <p className="text-xs text-slate-400">{m.wizard.referenceR2vDurationHint}</p>
        )}
        {researchReelAnalysis?.productionNotesZh ? (
          <p className="text-xs text-slate-400">{researchReelAnalysis.productionNotesZh}</p>
        ) : null}
        {workflowMode === "video-only" && (imageUrl || productPhoto) && (
          <p className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
            {m.wizard.videoRefProductMismatch}
          </p>
        )}
        {workflowMode === "combined" &&
          imageUrl &&
          productPhoto &&
          videoCreativeMode === "reference-concept" && (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
              {m.wizard.combinedRefKeyframeNote}
            </p>
          )}
      </>
    )}
    {referenceAd && !referenceIsVideo && (
      <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
        {m.wizard.referenceImageOnlyHint}
      </p>
    )}
  </div>

  )}

  <TemplateSlotChecklist
    templateId={templateId}
    filled={templateSlotStatus()}
    optionalSlotIds={
      showCinematicStitch || isConceptCinematicSingleOutput
        ? ["productPhoto", "product", "business", "referenceVideo", "headline", "subline", "offer"]
        : undefined
    }
  />

  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
    <h3 className="text-sm font-semibold text-white">
      {isStoryboardOutput
        ? m.wizard.storyboardKeyframeSectionTitle
        : showCinematicStitch
          ? formatCinematicCopy(m.wizard.cinematicStitchOutputTitle)
        : isConceptCinematicSingleOutput
          ? m.wizard.conceptCinematicSingleOutputTitle
        : usesConceptTextVideo
          ? m.wizard.conceptVideoPromptSectionTitle
          : m.wizard.videoSectionKeyframe}
    </h3>

    {usesConceptTextVideo ? (
      <div className="space-y-2">
        <p className="text-xs text-cyan-200/90">{m.wizard.conceptVideoPromptSectionHint}</p>
        {videoPrompt.trim() ? (
          <textarea
            readOnly
            value={videoPrompt}
            rows={8}
            className="w-full rounded-lg border border-cyan-900/40 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-cyan-50/90"
          />
        ) : (
          <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            {m.wizard.conceptVideoPromptPending}
          </p>
        )}
      </div>
    ) : showCinematicStitch && cinematicScenes.length > 0 ? (
      <p className="text-xs text-fuchsia-200/90">{formatCinematicCopy(m.wizard.cinematicStitchImageHint)}</p>
    ) : isConceptCinematicSingleOutput && cinematicScenes.length > 0 ? (
      <p className="text-xs text-fuchsia-200/90">{m.wizard.conceptCinematicSingleOutputDesc}</p>
    ) : isStoryboardOutput && storyboardScenes.length > 0 ? (
      <div className="space-y-3">
        <p className="text-xs text-teal-200/90">{m.wizard.storyboardAllScenesHint}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {storyboardScenes.map((scene: StoryboardSceneResult) => (
            <div
              key={scene.imageUrl}
              className="rounded-lg border border-teal-900/40 bg-teal-950/20 p-2"
            >
              <p className="mb-1 text-center text-xs font-semibold text-teal-100">
                @Image{scene.imageIndex}
              </p>
              <img
                src={scene.imageUrl}
                alt=""
                className="mx-auto max-h-36 w-full rounded object-contain"
              />
              <p className="mt-1 text-center text-[10px] text-slate-400 line-clamp-2">
                {scene.sceneDescriptionZh || scene.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    ) : workflowMode === "video-only" && !usesProductAssistant && !productPhoto ? (
      <UploadZone
        label={
          isConcept ? m.wizard.conceptVideoImageLabel : m.wizard.videoKeyframeProductLabel
        }
        hint={
          isConcept
            ? m.wizard.conceptVideoImageHint
            : usesCompositor
              ? m.wizard.compositorImageHint
              : m.wizard.videoKeyframeProductHint
        }
        cta={m.wizard.uploadCta}
        changeLabel={m.wizard.uploadChange}
        previewUrl={uploadPreviewUrl}
        fileName={null}
        onFile={async (f) => {
          setProductPhoto(f);
          setImageUrl(null);
          setUseOriginalImage(Boolean(f) && !usesCompositor);
          setError(null);
          setUploadQualityWarning(null);
          if (!f) return;
          try {
            const quality = await analyzeProductImageFile(f);
            setUploadQualityWarning(quality.warnings[0] ?? null);
          } catch {
            setUploadQualityWarning(null);
          }
        }}
      />
    ) : keyframePreview ? (
      <div>
        <p className="mb-2 text-xs text-slate-500">
          {isConcept && workflowMode === "video-only"
            ? m.wizard.conceptVideoKeyframeFromSetup
            : workflowMode === "combined"
              ? m.wizard.imageReadyHintCombined
              : m.wizard.imageReadyHint}
        </p>
        <img
          src={keyframePreview}
          alt=""
          className="mx-auto max-h-48 rounded-lg border border-slate-700 object-contain"
        />
        {isConcept && productPhoto && (
          <button
            type="button"
            onClick={() => {
              setProductPhoto(null);
              setUseOriginalImage(false);
              setConceptImageVisionNote("");
            }}
            className="mt-2 text-xs text-slate-400 underline hover:text-slate-200"
          >
            {m.wizard.uploadChange}
          </button>
        )}
      </div>
    ) : directReferenceR2vReady ? (
      <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100">
        {m.wizard.conceptVideoRefKeyframeReady}
      </p>
    ) : (
      <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
        {m.wizard.needKeyframeGoBack}
      </p>
    )}
  </div>

  {!usesCompositor ? (
    <>
      {isConcept && <ConceptPreGeneratePanel />}
      <div data-coach-id="coach-ad-pack">
        <AdPackReviewPanel />
      </div>
    </>
  ) : (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <h3 className="text-sm font-semibold text-white">{m.wizard.videoSectionBgm}</h3>
      <div className="flex flex-wrap gap-2">
        {bgmOptions.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setBgmTrack(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              bgmTrack === id
                ? "bg-emerald-600 text-white"
                : "border border-slate-600 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )}

  {usesProductAssistant && productVideoPlan && videoPrompt.trim() && (
    <div className="space-y-2 rounded-xl border border-cyan-900/50 bg-cyan-950/25 p-4">
      <p className="text-sm font-semibold text-cyan-50">{m.wizard.productVideoPlanLabel}</p>
      <p className="text-xs text-cyan-200/80">{m.wizard.productVideoPlanHint}</p>
      <textarea
        readOnly
        value={videoPrompt}
        rows={10}
        className="w-full rounded-lg border border-cyan-900/40 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-cyan-50/90"
      />
    </div>
  )}

  {isStoryboardOutput && videoPrompt.trim() && (
    <div className="space-y-2 rounded-xl border border-teal-900/50 bg-teal-950/25 p-4">
      <p className="text-sm font-semibold text-teal-50">{m.wizard.storyboardPromptLabel}</p>
      <p className="text-xs text-teal-200/80">{m.wizard.storyboardPromptHint}</p>
      <textarea
        readOnly
        value={videoPrompt}
        rows={12}
        className="w-full rounded-lg border border-teal-900/40 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-teal-50/90"
      />
    </div>
  )}

  {!usesCompositor && !shipItMode && (
  <details
    className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
    open={isStoryboardOutput ? true : showAdvancedVideo}
    onToggle={(e) => setShowAdvancedVideo((e.target as HTMLDetailsElement).open)}
  >
    <summary className="cursor-pointer text-sm text-slate-400">
      {isStoryboardOutput ? m.wizard.storyboardPromptEditLabel : m.wizard.videoPromptLabel}
    </summary>
    <AdvancedPromptPanel
      section="video"
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

  {showReferenceR2vOutputSettings && !videoBusy && (
    <VideoSettingsPanel
      compact
      variant="dark"
      value={videoSettings}
      onChange={setVideoSettings}
    />
  )}

  {videoPreflight && !videoBusy && (
    <div className="rounded-xl border border-sky-900/50 bg-sky-950/25 px-4 py-3 text-xs text-sky-100">
      <p className="font-semibold text-sky-50">{m.wizard.videoPreflightTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {videoPreflight.lines.map((line: string) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2 font-medium text-sky-200">{videoPreflight.costLine}</p>
    </div>
  )}

  {error && <WizardErrorBanner message={error} variant="dark" />}

  {videoBusy && (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 py-8 text-center">
      <span className="inline-block size-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
      <p className="mt-3 text-sm text-emerald-300">
        {usesCompositor
          ? m.wizard.compositorPhaseRender
          : videoPhase === "second-frame"
            ? m.wizard.phaseSecondFrame
            : videoPhase === "bgm"
            ? m.wizard.phaseBgm
            : videoPhase === "voiceover"
              ? m.wizard.phaseVoiceover
            : videoPhase === "captions"
              ? m.wizard.phaseCaptions
              : m.wizard.phaseVideo}
      </p>
      {videoProgressInfo && (
        <div className="mx-auto mt-4 max-w-sm px-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-emerald-200/90">
            <span>{videoProgressInfo.pct}%</span>
            <span>{videoProgressInfo.eta}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${videoProgressInfo.pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )}

  <div className="hidden flex-col gap-2 md:flex">
    {videoGenerateDisabled && !videoBusy && videoGenerateDisabledReason && (
      <p className="text-center text-xs text-amber-200/90">{videoGenerateDisabledReason}</p>
    )}
    <div className="flex gap-3">
    <button
      type="button"
      disabled={videoBusy}
      onClick={goBackFromVideo}
      className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50"
    >
      {m.wizard.back}
    </button>
    <button
      type="button"
      data-coach-id="coach-generate-video"
      disabled={videoGenerateDisabled}
      title={videoGenerateDisabledReason ?? undefined}
      onClick={() => void generateVideo()}
      className="flex-1 rounded-2xl bg-linear-to-r from-cyan-500 via-emerald-500 to-teal-500 py-3.5 text-base font-semibold text-white shadow-[0_0_28px_rgba(16,185,129,0.35)] disabled:opacity-40"
    >
      {videoBusy
        ? usesCompositor
          ? m.wizard.compositorPhaseRender
          : m.wizard.phaseVideo
        : usesCompositor
          ? m.wizard.compositorVideoBtn
          : showCinematicStitch
            ? formatCinematicCopy(m.wizard.cinematicStitchGenerateVideoBtn)
            : isConceptCinematicSingleOutput
              ? m.wizard.conceptCinematicSingleGenerateVideoBtn
            : m.wizard.generateVideoBtn}
    </button>
    </div>
  </div>
  {!videoBusy && usesProductAssistant && !productVideoPlan && (
    <p className="text-center text-xs text-amber-200/90">
      {productPhoto ? m.wizard.productVideoAnalyzeFirstHint : m.wizard.productVideoUploadFirstHint}
    </p>
  )}
  {!videoBusy && !hasFinalImage && !usesProductAssistant && !usesConceptTextVideo && !directReferenceR2vReady && (
    <p className="text-center text-xs text-amber-200/90">
      {isConcept && productPhoto
        ? m.wizard.conceptVideoKeyframeFromSetup
        : m.wizard.videoGenerateDisabledHint}
    </p>
  )}
  {!videoBusy && planVideoPromptBusy && isConcept && (
    <p className="text-center text-xs text-violet-200/90">{m.wizard.planVideoPromptBusy}</p>
  )}
</section>
  );
}
