"use client";

import { useWizard } from "@/components/studio/WizardContext";
import { VideoCreativeModePicker } from "@/components/VideoCreativeModePicker";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { UploadZone } from "@/components/UploadZone";
import { MotionPosterDialectPicker } from "@/components/studio/MotionPosterDialectPicker";
import { ReferenceClipPicker } from "@/components/ReferenceClipPicker";
import { ReferenceUploadZone } from "@/components/ReferenceUploadZone";
import { TemplateSlotChecklist } from "@/components/TemplateSlotChecklist";
import { AdvancedPromptPanel } from "@/components/AdvancedPromptPanel";
import { AdPackReviewPanel } from "@/components/studio/AdPackReviewPanel";
import { ConceptPreGeneratePanel } from "@/components/studio/ConceptPreGeneratePanel";
import { PresenterAvatarPicker } from "@/components/studio/PresenterAvatarPicker";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import {
  GenerationWaitPlaceholder,
  waitAspectFromString,
} from "@/components/studio/GenerationWaitPlaceholder";
import { estimateH3Tokens, estimateVideoTokens } from "@/lib/billing/token-costs";
import { storyboardSceneDisplayCopy } from "@/lib/storyboard-scene-copy";
import { isBrandVideoStyle, isCreativeVideoStyle, isStoryboardVideoStyle } from "@/lib/visual-styles";
import { isVideoOutputPathLocked, resolveVideoOutputPresentation } from "@/lib/video-output-presentation";
import { analyzeProductImageFile } from "@/lib/image-upload-quality";
import {
  isH3ShotRecipeMode,
  h3ShotRecipeAcceptsReel,
  h3ShotRecipeNeedsReel,
  MACRO_SNAP_INTENSITIES,
  FOOD_BULLET_ARCS,
  H3_SHOWREEL_ASPECTS,
  H3_SHOWREEL_SCHEME_IDS,
  H3_SPHERE_MG_SCHEME_IDS,
  H3_LOGO_MG_SCHEME_IDS,
  type MacroSnapIntensity,
  type FoodBulletArc,
  type H3ShowreelAspect,
  type H3ShowreelSchemePick,
  type H3SphereMgSchemePick,
  type H3LogoMgSchemePick,
} from "@/lib/h3-shot-recipes";
import {
  isFaceHeavyVideoJob,
  resolveVideoEnginePlan,
} from "@/lib/video-engine-router";
import { resolveWizardOutputDurationSec } from "@/lib/video-settings";
import type { CinematicSceneResult } from "@/lib/cinematic-reel-types";
import type { StoryboardSceneResult } from "@/lib/video-storyboard-types";

export function VideoStep() {
  const { applyPromptRebuild, bgmOptions, bgmTrack, brandProfile, cinematicScenes, cinematicSceneCount, cinematicStitchReady, conceptReferenceR2vReady, directReferenceR2vReady, creativeVideoBrief, endFramePhoto, endFramePreviewUrl, endFrameUrl, error, extraAnglePhotos, extraKitPhotos, extraKitPreviewUrls, formatCinematicCopy, generateVideo, goBackFromVideo, hasFinalImage, headline, imageAspectRatio, imagePrompt, imageUrl, isCinematicStitchOutput, isConceptCinematicSingleOutput, isStoryboardOutput, isUgcPresenterOutput, keyframePreview, loadReferenceClip, m, onReferenceAdFile, onVideoCreativeModeChange, packagingPhoto, packagingPreviewUrl, planAiVideoPrompt, planProductVideo, planProductVideoBusy, planVideoPromptBusy, presenterAvatarId, presenterSourceMode, productPhoto, productVideoPlan, promotionMode, promptExtra, promptMarket, referenceAd, referenceClipLoading, referenceIsVideo, referencePreviewUrl, researchReelAnalysis, researchReelAnalyzeBusy, researchReelAnalyzeNote, selectedReferenceClipId, setBgmTrack, setConceptImageVisionNote, setEndFramePhoto, setEndFrameUrl, setError, setExtraAnglePhotos, setExtraKitPhotos, setPackagingPhoto, setImagePrompt, setImageUrl, setPresenterAvatarId, setPresenterSourceMode, setProductPhoto, setPromptExtra, setPromptMarket, setShowAdvancedVideo, setSubjectFraming, setUploadQualityWarning, setUseOriginalImage, setVideoPrompt, setVideoSettings, shipItMode, showAdvancedVideo, showVideoReferenceSection, storyboardScenes, storyboardTrimDuration, subjectFraming, templateId, templateSlotStatus, uploadPreviewUrl, useReferenceVideo, usesCompositor, usesConceptTextVideo, usesProductAssistant, videoBusy, videoCreativeMode, motionPosterDialectPick, setMotionPosterDialectPick, macroSnapIntensity, setMacroSnapIntensity, foodBulletArc, setFoodBulletArc, h3ShowreelAspect, setH3ShowreelAspect, h3ShowreelSchemePick, setH3ShowreelSchemePick, h3SphereMgSchemePick, setH3SphereMgSchemePick, h3LogoMgSchemePick, setH3LogoMgSchemePick, videoGenerateDisabled, videoGenerateDisabledReason, videoPhase, videoPreflight, videoProgressInfo, videoPrompt, videoPromptPlanNote, videoSettings, videoStepHint, visualStyleId, workflowMode } = useWizard();
  const isConcept = promotionMode === "concept";
  const outputDurationSec = resolveWizardOutputDurationSec(videoSettings);
  const durationForCost = isStoryboardOutput
    ? Number(storyboardTrimDuration) || 8
    : outputDurationSec;
  // Match generateVideo routing: Seedance reel path bills ~3× H3 — never show H3 when Seedance will run.
  const videoEnginePlan = resolveVideoEnginePlan({
    motionPoster:
      videoCreativeMode === "motion-poster" ||
      videoCreativeMode === "impact-poster",
    socialDrip: videoCreativeMode === "social-drip",
    blockbuster: videoCreativeMode === "blockbuster",
    h3ShotRecipe: isH3ShotRecipeMode(videoCreativeMode),
    hasReel: Boolean(referenceAd && referenceIsVideo),
    faceHeavy: isFaceHeavyVideoJob({
      visualStyleId,
      videoCreativeMode,
      subjectFraming,
    }),
    storyboard: isStoryboardOutput,
  });
  const videoTokenCost =
    videoEnginePlan.firstEngine === "seedance"
      ? estimateVideoTokens({
          resolution: videoSettings.resolution,
          fast: false,
          duration: durationForCost,
        })
      : estimateH3Tokens({
          resolution: videoSettings.resolution,
          duration: durationForCost,
        });
  const pv = m.microWizard.preVideoSetup;
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
  const isMotionPoster = videoCreativeMode === "motion-poster";
  const isBlockbuster = videoCreativeMode === "blockbuster";
  const h3ShotMode = isH3ShotRecipeMode(videoCreativeMode)
    ? videoCreativeMode
    : null;
  const isH3Shot = Boolean(h3ShotMode);
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
    <p className="rounded-xl border border-violet-800/50 bg-violet-950/30 px-4 py-3 text-xs text-violet-100">
      {formatCinematicCopy(m.wizard.cinematicStitchWorkflowOrder)}
    </p>
  )}

  {isConcept && visualStyleId === "concept-cinematic" && (
    <div className="rounded-xl border border-violet-900/50 bg-violet-950/25 px-4 py-3 text-xs text-violet-100">
      <p className="font-semibold text-violet-50">{m.wizard.cinematicRecipeTitle}</p>
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
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
      <p className="text-sm font-semibold text-violet-100">{m.wizard.conceptCinematicSingleSceneReady}</p>
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
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-4">
      <p className="text-sm font-semibold text-violet-100">
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
    <div className="space-y-2 rounded-xl border border-teal-900/50 bg-teal-950/30 px-4 py-3 text-xs text-teal-100">
      <p>{m.wizard.storyboardVideoIntro}</p>
      <p className="text-teal-200/80">{m.wizard.storyboardEnginePipelineHint}</p>
    </div>
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

  {!usesCompositor && (usesProductAssistant || isBlockbuster || isH3Shot) && (
    <div className="space-y-4 rounded-xl border-2 border-cyan-500/40 bg-cyan-950/30 px-4 py-4 shadow-lg shadow-cyan-950/30">
      <div>
        <p className="text-base font-semibold text-cyan-50">
          {isBlockbuster
            ? m.wizard.videoCreativeModes.blockbuster.title
            : isH3Shot && h3ShotMode
              ? m.wizard.videoCreativeModes[h3ShotMode].title
              : m.wizard.productVideoKitTitle}
        </p>
        <p className="mt-1 text-xs text-cyan-200/85">
          {isBlockbuster
            ? m.wizard.blockbusterHint
            : isH3Shot && h3ShotMode
              ? m.wizard.h3ShotHint[h3ShotMode]
              : m.wizard.productVideoKitHint}
        </p>
      </div>
      {h3ShotMode === "macro-snap" ? (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-950/40 px-3 py-3">
          <p className="text-xs font-semibold text-cyan-100">
            {m.wizard.macroSnapIntensityTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.macroSnapIntensityHint}
          </p>
          <div
            className="mt-2 grid grid-cols-3 gap-1.5"
            role="radiogroup"
            aria-label={m.wizard.macroSnapIntensityTitle}
          >
            {MACRO_SNAP_INTENSITIES.map((level) => {
              const active = macroSnapIntensity === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMacroSnapIntensity(level as MacroSnapIntensity)}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2 py-2 text-center text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2 py-2 text-center text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                >
                  <span className="block">{m.wizard.macroSnapIntensity[level].title}</span>
                  <span
                    className={
                      active
                        ? "mt-0.5 block text-[10px] font-normal text-slate-800"
                        : "mt-0.5 block text-[10px] font-normal text-cyan-200/70"
                    }
                  >
                    {m.wizard.macroSnapIntensity[level].desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {h3ShotMode === "food-bullet-time" ? (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-950/40 px-3 py-3">
          <p className="text-xs font-semibold text-cyan-100">
            {m.wizard.foodBulletArcTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.foodBulletArcHint}
          </p>
          <div
            className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2"
            role="radiogroup"
            aria-label={m.wizard.foodBulletArcTitle}
          >
            {FOOD_BULLET_ARCS.map((arc) => {
              const active = foodBulletArc === arc;
              return (
                <button
                  key={arc}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFoodBulletArc(arc as FoodBulletArc)}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2.5 py-2 text-left text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-2 text-left text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                >
                  <span className="block">
                    {m.wizard.foodBulletArc[arc].title}
                  </span>
                  <span
                    className={
                      active
                        ? "mt-0.5 block text-[10px] font-normal text-slate-800"
                        : "mt-0.5 block text-[10px] font-normal text-cyan-200/70"
                    }
                  >
                    {m.wizard.foodBulletArc[arc].desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {h3ShotMode === "h3-sphere-mg" ? (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-950/40 px-3 py-3">
          <p className="text-xs font-semibold text-cyan-100">
            {m.wizard.h3SphereMgSchemeTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.h3SphereMgSchemeHint}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={
                h3SphereMgSchemePick === "auto"
                  ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                  : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
              }
              onClick={() => setH3SphereMgSchemePick("auto")}
            >
              {m.wizard.h3SphereMgSchemeAuto}
            </button>
            {H3_SPHERE_MG_SCHEME_IDS.map((id) => {
              const active = h3SphereMgSchemePick === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={m.wizard.h3SphereMgSchemes[id].desc}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                  onClick={() =>
                    setH3SphereMgSchemePick(id as H3SphereMgSchemePick)
                  }
                >
                  {m.wizard.h3SphereMgSchemes[id].title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {h3ShotMode === "h3-logo-mg" ? (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-950/40 px-3 py-3">
          <p className="text-xs font-semibold text-cyan-100">
            {m.wizard.h3LogoMgSchemeTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.h3LogoMgSchemeHint}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={
                h3LogoMgSchemePick === "auto"
                  ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                  : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
              }
              onClick={() => setH3LogoMgSchemePick("auto")}
            >
              {m.wizard.h3LogoMgSchemeAuto}
            </button>
            {H3_LOGO_MG_SCHEME_IDS.map((id) => {
              const active = h3LogoMgSchemePick === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={m.wizard.h3LogoMgSchemes[id].desc}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                  onClick={() =>
                    setH3LogoMgSchemePick(id as H3LogoMgSchemePick)
                  }
                >
                  {m.wizard.h3LogoMgSchemes[id].title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {h3ShotMode === "h3-showreel" ? (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-950/40 px-3 py-3">
          <p className="text-xs font-semibold text-cyan-100">
            {m.wizard.h3ShowreelSchemeTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.h3ShowreelSchemeHint}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className={
                h3ShowreelSchemePick === "auto"
                  ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                  : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
              }
              onClick={() => setH3ShowreelSchemePick("auto")}
            >
              {m.wizard.h3ShowreelSchemeAuto}
            </button>
            {H3_SHOWREEL_SCHEME_IDS.map((id) => {
              const active = h3ShowreelSchemePick === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={m.wizard.h3ShowreelSchemes[id].desc}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                  onClick={() =>
                    setH3ShowreelSchemePick(id as H3ShowreelSchemePick)
                  }
                >
                  {m.wizard.h3ShowreelSchemes[id].title}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-semibold text-cyan-100">
            {m.wizard.h3ShowreelAspectTitle}
          </p>
          <p className="mt-1 text-[11px] text-cyan-200/80">
            {m.wizard.h3ShowreelAspectHint}
          </p>
          <div
            className="mt-2 grid grid-cols-2 gap-1.5"
            role="radiogroup"
            aria-label={m.wizard.h3ShowreelAspectTitle}
          >
            {H3_SHOWREEL_ASPECTS.map((aspect) => {
              const active = h3ShowreelAspect === aspect;
              return (
                <button
                  key={aspect}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setH3ShowreelAspect(aspect as H3ShowreelAspect)}
                  className={
                    active
                      ? "rounded-lg bg-cyan-500 px-2 py-2 text-center text-xs font-semibold text-slate-950"
                      : "rounded-lg border border-cyan-500/40 bg-slate-900/60 px-2 py-2 text-center text-xs font-medium text-cyan-100 hover:bg-cyan-950/50"
                  }
                >
                  <span className="block">{m.wizard.h3ShowreelAspect[aspect].title}</span>
                  <span
                    className={
                      active
                        ? "mt-0.5 block text-[10px] font-normal text-slate-800"
                        : "mt-0.5 block text-[10px] font-normal text-cyan-200/70"
                    }
                  >
                    {m.wizard.h3ShowreelAspect[aspect].desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadZone
          label={
            h3ShotMode === "food-bullet-time"
              ? m.wizard.h3ShotPhotoTitle["food-bullet-time"]
              : h3ShotMode === "h3-lifestyle"
                ? m.wizard.h3ShotPhotoTitle["h3-lifestyle"]
                : isH3Shot && isConcept
                  ? m.wizard.h3ShotConceptHeroTitle
                  : m.wizard.productVideoHeroLabel
          }
          hint={
            isH3Shot && h3ShotMode
              ? m.wizard.h3ShotHeroHint[h3ShotMode]
              : m.wizard.productVideoHeroHint
          }
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
      {h3ShotMode && h3ShotRecipeAcceptsReel(h3ShotMode) ? (
        <div className="space-y-2 rounded-xl border-2 border-violet-500/50 bg-violet-950/30 p-3">
          <p className="text-sm font-semibold text-violet-100">
            {m.wizard.videoSectionReference}
            <span className="ml-2 rounded-full bg-violet-500/30 px-2 py-0.5 text-[11px] font-semibold text-violet-100">
              {h3ShotRecipeNeedsReel(h3ShotMode)
                ? pv.requiredBadge
                : pv.extraOptional}
            </span>
          </p>
          <p className="text-xs text-violet-200/85">
            {m.wizard.h3ShotReelHint[
              h3ShotMode as keyof typeof m.wizard.h3ShotReelHint
            ]}
          </p>
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
        </div>
      ) : null}
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
      {!isBlockbuster ? (
      <button
        type="button"
        onClick={planProductVideo}
        disabled={planProductVideoBusy || !productPhoto}
        className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 sm:w-auto"
      >
        {planProductVideoBusy ? m.wizard.planProductVideoBusy : m.wizard.planProductVideoBtn}
      </button>
      ) : null}
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

  {!usesCompositor && !shipItMode && !showReferenceR2vOutputSettings && !isStoryboardOutput && (
    <VideoSettingsPanel
      value={videoSettings}
      onChange={setVideoSettings}
      motionPoster={isMotionPoster}
      compact={isMotionPoster}
    />
  )}

  {isStoryboardOutput && !videoBusy ? (
    <div className="space-y-2 rounded-xl border border-teal-900/50 bg-teal-950/25 p-4">
      <p className="text-sm font-semibold text-teal-50">{pv.settingsTitle}</p>
      <p className="text-xs text-teal-200/80">{pv.klingSettingsHint}</p>
      <p className="text-[11px] text-teal-300/75">{m.wizard.storyboardEnginePipelineHint}</p>
      <p className="text-sm font-semibold text-teal-50">
        {pv.costLabel.replace("{n}", String(videoTokenCost))}
      </p>
    </div>
  ) : null}

  {!usesCompositor && !isStoryboardOutput && !showCinematicStitch && !isConceptCinematicSingleOutput && !usesProductAssistant && !usesConceptTextVideo && !isMotionPoster && !isBlockbuster && (
    <div className="rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
      <p className="font-semibold text-sky-50">{m.wizard.videoWearVarietyTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-sky-100/90">
        {m.wizard.videoWearVarietyTips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )}

  {!usesCompositor && !isStoryboardOutput && !showCinematicStitch && !isConceptCinematicSingleOutput && !usesProductAssistant && !isMotionPoster && !isBlockbuster && (
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
        onClick={() => void planAiVideoPrompt()}
        disabled={
          planVideoPromptBusy ||
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
      {isCreativeVideoStyle(visualStyleId) && !creativeVideoBrief.trim() && !headline.trim() && (
        <p className="text-xs text-amber-200/90">{m.errors.creativeBriefRequired}</p>
      )}
    </div>
  )}

  {!usesCompositor && videoCreativeMode === "motion-poster" && (
    <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3">
      <p className="text-sm font-semibold text-amber-50">
        {m.wizard.videoCreativeModes["motion-poster"].title}
      </p>
      <p className="text-xs text-amber-100/85">{m.wizard.motionPosterHint}</p>
      <MotionPosterDialectPicker
        variant="dark"
        value={motionPosterDialectPick}
        onChange={setMotionPosterDialectPick}
      />
      <UploadZone
        label={m.wizard.endFrameLabel}
        hint={m.wizard.endFrameHint}
        cta={m.wizard.uploadCta}
        changeLabel={m.wizard.uploadChange}
        previewUrl={endFramePreviewUrl}
        fileName={endFramePhoto?.name ?? null}
        onFile={(f) => {
          setEndFramePhoto(f);
          setError(null);
        }}
      />
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

  {!usesCompositor && videoCreativeMode !== "reference-concept" && !isMotionPoster && !usesConceptTextVideo && !showCinematicStitch && !isConceptCinematicSingleOutput && (
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
      <p className="text-xs text-violet-200/90">{formatCinematicCopy(m.wizard.cinematicStitchImageHint)}</p>
    ) : isConceptCinematicSingleOutput && cinematicScenes.length > 0 ? (
      <p className="text-xs text-violet-200/90">{m.wizard.conceptCinematicSingleOutputDesc}</p>
    ) : isStoryboardOutput && storyboardScenes.length > 0 ? (
      <div className="space-y-3">
        <p className="text-xs text-teal-200/90">{m.wizard.storyboardAllScenesHint}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {storyboardScenes.map((scene: StoryboardSceneResult) => {
            const copy = storyboardSceneDisplayCopy(scene);
            return (
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
              {copy.caption || copy.beat ? (
                <div className="mt-1.5 space-y-0.5 px-0.5">
                  {copy.caption ? (
                    <p className="text-center text-[11px] font-medium leading-snug text-teal-50 line-clamp-3">
                      {copy.caption}
                    </p>
                  ) : null}
                  {copy.beat ? (
                    <p className="text-center text-[10px] leading-snug text-slate-400 line-clamp-2">
                      {copy.beat}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            );
          })}
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
      hideAutoDuration
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

  {error && (
    <WizardErrorBanner message={error} variant="dark" onDismiss={() => setError(null)} />
  )}

  {videoBusy && (
    <GenerationWaitPlaceholder
      message={
        usesCompositor
          ? m.wizard.compositorPhaseRender
          : videoPhase === "second-frame"
            ? m.wizard.phaseSecondFrame
            : videoPhase === "bgm"
              ? m.wizard.phaseBgm
              : videoPhase === "voiceover"
                ? m.wizard.phaseVoiceover
                : videoPhase === "captions"
                  ? m.wizard.phaseCaptions
                  : m.wizard.phaseVideo
      }
      hint={m.wizard.generationWaitHint}
      progress={videoProgressInfo}
      aspectRatio={waitAspectFromString(imageAspectRatio)}
      previewUrl={keyframePreview || imageUrl || uploadPreviewUrl || referencePreviewUrl || null}
    />
  )}

  <div className="hidden flex-col gap-2 md:flex">
    {videoGenerateDisabled && !videoBusy && videoGenerateDisabledReason && (
      <p className="text-center text-xs text-amber-200/90">{videoGenerateDisabledReason}</p>
    )}
    {!videoBusy && !videoGenerateDisabled && (
      <p className="text-center text-xs text-slate-400">
        {m.wizard.tokenCostHint.replace("{n}", String(videoTokenCost))}
      </p>
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
      className="flex-1 rounded-2xl bg-linear-to-r from-violet-600 via-violet-500 to-violet-700 py-3.5 text-base font-semibold text-white shadow-[0_0_28px_rgba(108,59,255,0.35)] disabled:opacity-40"
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
