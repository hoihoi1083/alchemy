"use client";

import { useState } from "react";
import { useWizard } from "@/components/studio/WizardContext";
import { WorkflowModePicker } from "@/components/WorkflowModePicker";
import { VisualStylePicker } from "@/components/VisualStylePicker";
import { ArtStylePicker } from "@/components/ArtStylePicker";
import { TemplateSlotChecklist } from "@/components/TemplateSlotChecklist";
import { AdvancedPromptPanel } from "@/components/AdvancedPromptPanel";
import { isSlotRequired, templateHasSlot } from "@/lib/template-slots";
import { VIDEO_DURATIONS, type VideoDuration, type VideoSettings } from "@/lib/video-settings";
import { isBrandVideoStyle, isCreativeVideoStyle, isBrandVisualStyle, isStoryboardVideoStyle, isUgcPresenterStyle, isAiPlannedVideoStyle, visualStylePromptHint } from "@/lib/visual-styles";
import { UploadZone } from "@/components/UploadZone";
import { ReferenceUploadZone } from "@/components/ReferenceUploadZone";
import { ContentResearchPanel } from "@/components/content-research/ContentResearchPanel";
import { CINEMATIC_SCENE_COUNTS, type CinematicSceneCount } from "@/lib/cinematic-scene-config";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { ShipItPanel } from "@/components/studio/ShipItPanel";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";

export function SetupStep() {
  const { advancedSection, analyzeBrand, applyClosestMatchRecipe, applyCinematicStitchRecipe, applyPrimaryPath, applyPrimaryPathConcept, applyPrimaryPathConceptVideo, applyPrimaryPathVideoOnly, applyPromptRebuild, applyQuickTest8sRecipe, artStyleId, brandAnalyzeBusy, brandAnalyzeNote, brandSocialHint, brandWebsiteUrl, business, cinematicSceneCount, conceptIdea, continueSetupLabel, effectivePromoteName, setupNextDisabled, setupNextDisabledReason, creativeVideoBrief, error, formatCinematicCopy, goNextFromSetup, headline, imageCreativeMode, imagePrompt, isConceptStoryboardOutput, isContentResearchVideoPath, isStoryboardOutput, lockedCampaignMode, m, offer, onCinematicSceneCountChange, onImageInputModeChange, onProductPhotoSelected, onImageCreativeModeChange, onReferenceAdFile, onVideoCreativeModeChange, onWorkflowModeChange, planAiVideoPrompt, product, productPhoto, promotionMode, promptExtra, promptMarket, referenceAd, referenceIsVideo, referencePreviewUrl, researchReelAnalysis, researchReelAnalyzeBusy, researchReelAnalyzeNote, runShipItPipeline, selectVisualStyle, setArtStyleId, setBrandKit, setBrandSocialHint, setBrandWebsiteUrl, setBusiness, setCampaignTheme, setConceptIdea, setConceptImageVisionNote, setCreativeVideoBrief, setError, setExtraKitPhotos, setHeadline, setImageAspectRatio, setImageCreativeMode, setImageOutputMode, setImagePrompt, setImageRefPhoto, setOffer, setProduct, setPromptExtra, setPromptMarket, setReferenceCarouselSlideCount, setContentResearchApplyRef, setShipItMode, setShowAdvancedSetup, setShowAdvancedSetupPrompts, setStoryboardBrief, setSubjectFraming, setSubline, setUserReferenceBrief, setUseOriginalImage, setVideoPrompt, setVideoSettings, shipItEligible, shipItVisionBlocked, shipItMode, shipItPipelineBusy, showAdvancedSetup, showAdvancedSetupPrompts, storyboardBrief, subjectFraming, subline, templateId, templateSlotStatus, uploadPreviewUrl, usesCompositor, usesReferenceConceptForImage, videoCreativeMode, videoPrompt, videoSettings, visualStyleId, workflowMode } = useWizard();
  const isConcept = promotionMode === "concept";
  const isConceptImageOnly = isConcept && workflowMode === "image-only";
  const isConceptVideoOnly = isConcept && workflowMode === "video-only";
  const hidePrimaryPathsForResearch =
    isContentResearchStyleExtra(promptExtra) &&
    (workflowMode === "image-only" || workflowMode === "video-only");
  const hidePrimaryPaths =
    isConceptImageOnly ||
    isConceptVideoOnly ||
    (hidePrimaryPathsForResearch && !isConcept);
  const showResearchPathsHint = hidePrimaryPathsForResearch && !isConcept;
  const isVideoOnlyPhysical = !isConcept && workflowMode === "video-only";
  const isVideoWorkflow = workflowMode === "video-only" || workflowMode === "combined";
  const setupReferenceVideoOnStep1 =
    isVideoWorkflow && !usesCompositor && !shipItMode;

  function handleSetupReferenceVideo(file: File | null) {
    if (file) {
      onVideoCreativeModeChange("reference-concept");
      onImageCreativeModeChange("reference-concept");
      if (isConcept) onImageInputModeChange("reference");
    }
    onReferenceAdFile(file);
  }
  const pathsTitle = isConceptVideoOnly
    ? m.wizard.conceptVideoPathsTitle
    : isConcept
    ? m.wizard.conceptPathsTitle
    : isVideoOnlyPhysical
      ? m.wizard.videoPathsTitle
      : m.wizard.primaryPathsTitle;
  const pathsHint = isConceptVideoOnly
    ? m.wizard.conceptVideoPathsHint
    : isConcept
    ? m.wizard.conceptPathsHint
    : isVideoOnlyPhysical
      ? m.wizard.videoPathsHint
      : m.wizard.primaryPathsHint;
  const assistantMode = m.wizard.videoCreativeModes["product-assistant"];
  const [conceptAudience, setConceptAudience] = useState("");
  const [conceptPain, setConceptPain] = useState("");
  const [conceptPromise, setConceptPromise] = useState("");
  const [conceptProof, setConceptProof] = useState("");
  const [conceptCta, setConceptCta] = useState("");
  const [conceptVisualMetaphor, setConceptVisualMetaphor] = useState("");
  const [conceptPlanBusy, setConceptPlanBusy] = useState(false);
  const [conceptPlanNote, setConceptPlanNote] = useState<string | null>(null);
  const [contentResearchNote, setContentResearchNote] = useState<string | null>(null);
  const [contentResearchOpen, setContentResearchOpen] = useState(true);
  const [recipeApplyNote, setRecipeApplyNote] = useState<string | null>(null);
  const defaultResearchTopic = isConcept
    ? conceptIdea.trim() || business.trim() || ""
    : business.trim() || "";
  function applyConceptWizard(
    draft?: {
      audience?: string;
      painPoint?: string;
      promise?: string;
      proof?: string;
      cta?: string;
      visualMetaphor?: string;
    },
    imageVisionNote?: string,
  ) {
    const audience = (draft?.audience ?? conceptAudience).trim();
    const pain = (draft?.painPoint ?? conceptPain).trim();
    const promise = (draft?.promise ?? conceptPromise).trim();
    const proof = (draft?.proof ?? conceptProof).trim();
    const cta = (draft?.cta ?? conceptCta).trim();
    const metaphor = (draft?.visualMetaphor ?? conceptVisualMetaphor).trim();
    const nextHeadline = promise;
    const nextSubline = [pain, proof].filter(Boolean).join(" | ");
    const nextOffer = cta;
    const conceptExtra = [
      audience ? `Target audience: ${audience}` : "",
      metaphor ? `Visual metaphor and scene direction: ${metaphor}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    if (nextHeadline) setHeadline(nextHeadline);
    if (nextSubline) setSubline(nextSubline);
    if (nextOffer) setOffer(nextOffer);
    if (conceptExtra) {
      setPromptExtra((prev: string) => [prev.trim(), conceptExtra].filter(Boolean).join(" | "));
    }
    const conceptBrief = [
      conceptIdea.trim(),
      audience ? `Audience: ${audience}` : "",
      pain ? `Pain: ${pain}` : "",
      promise ? `Promise: ${promise}` : "",
      proof ? `Proof: ${proof}` : "",
      metaphor ? `Visual direction: ${metaphor}` : "",
      imageVisionNote?.trim() ? `Reference image: ${imageVisionNote.trim()}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    if (conceptBrief && (workflowMode === "video-only" || workflowMode === "combined")) {
      setCreativeVideoBrief(conceptBrief);
    }
  }
  async function analyzeConceptWithAi() {
    setConceptPlanBusy(true);
    setConceptPlanNote(null);
    setError(null);
    try {
      let res: Response;
      if (productPhoto) {
        const fd = new FormData();
        fd.set("product", product.trim());
        fd.set("business", business.trim());
        fd.set("headline", headline.trim());
        fd.set("subline", subline.trim());
        fd.set("offer", offer.trim());
        fd.set("promptExtra", promptExtra.trim());
        fd.set("conceptIdea", conceptIdea.trim());
        fd.set("visualStyleId", visualStyleId);
        fd.set("workflowMode", workflowMode);
        fd.set("market", promptMarket);
        fd.set("reference_image", productPhoto);
        res = await fetch("/api/plan-concept", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/plan-concept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: product.trim(),
            business: business.trim(),
            headline: headline.trim(),
            subline: subline.trim(),
            offer: offer.trim(),
            promptExtra: promptExtra.trim(),
            conceptIdea: conceptIdea.trim(),
            visualStyleId,
            workflowMode,
            market: promptMarket,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.planConceptFailed);
      const draft = data.draft as {
        audience?: string;
        painPoint?: string;
        promise?: string;
        proof?: string;
        cta?: string;
        visualMetaphor?: string;
      };
      setConceptAudience(String(draft.audience ?? "").trim());
      setConceptPain(String(draft.painPoint ?? "").trim());
      setConceptPromise(String(draft.promise ?? "").trim());
      setConceptProof(String(draft.proof ?? "").trim());
      setConceptCta(String(draft.cta ?? "").trim());
      setConceptVisualMetaphor(String(draft.visualMetaphor ?? "").trim());
      const imageVisionNote = String(data.imageVisionNote ?? "").trim();
      if (imageVisionNote) setConceptImageVisionNote(imageVisionNote);
      const referenceBrief = data.referenceBrief as UserReferenceBrief | undefined;
      if (referenceBrief) setUserReferenceBrief(referenceBrief);
      if (productPhoto && (workflowMode === "video-only" || workflowMode === "combined")) {
        setUseOriginalImage(true);
      }
      applyConceptWizard(
        {
          audience: draft.audience,
          painPoint: draft.painPoint,
          promise: draft.promise,
          proof: draft.proof,
          cta: draft.cta,
          visualMetaphor: draft.visualMetaphor,
        },
        imageVisionNote,
      );
      setConceptPlanNote(
        [data.sourceNote as string | undefined, m.wizard.conceptAnalyzeApplied]
          .filter(Boolean)
          .join(" — "),
      );
      if (workflowMode === "video-only") {
        await planAiVideoPrompt();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : m.errors.planConceptFailed);
    } finally {
      setConceptPlanBusy(false);
    }
  }
  function handleApplyClosestMatchRecipe() {
    applyClosestMatchRecipe();
    setRecipeApplyNote(m.wizard.closestMatchRecipeApplied);
    window.setTimeout(() => setRecipeApplyNote(null), 1800);
  }
  function handleApplyQuickTest8sRecipe() {
    applyQuickTest8sRecipe();
    setRecipeApplyNote(m.wizard.quickTest8sRecipeApplied);
    window.setTimeout(() => setRecipeApplyNote(null), 1800);
  }
  return (
<section className="space-y-5 rounded-3xl border border-cyan-100/70 bg-white/90 p-5 shadow-sm backdrop-blur">
  <div className="h-1 w-full rounded-full bg-linear-to-r from-cyan-400 via-indigo-400 to-emerald-400 opacity-80" />
  <div>
    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
      {m.wizard.step1Title}
    </h2>
    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{m.wizard.step1Hint}</p>
  </div>

  <WorkflowModePicker value={workflowMode} onChange={onWorkflowModeChange} />

  <ShipItPanel
    shipItMode={shipItMode}
    onShipItModeChange={setShipItMode}
    eligible={shipItEligible && !shipItVisionBlocked}
    busy={shipItPipelineBusy}
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

  {workflowMode !== "image-only" && <VideoOutputSourceCard variant="setup" />}

  <details
    open={contentResearchOpen}
    onToggle={(e) => setContentResearchOpen(e.currentTarget.open)}
    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
  >
    <summary className="cursor-pointer text-sm font-medium text-slate-800">
      {m.wizard.contentResearchSectionTitle}
    </summary>
    <p className="mt-1 text-xs text-slate-600">{m.wizard.contentResearchSectionHint}</p>
    <div className="mt-3">
  <ContentResearchPanel
    defaultTopic={defaultResearchTopic}
    promoteProduct={product}
    onPromoteProductChange={setProduct}
    syncTopicFromProduct={false}
    promotionMode={promotionMode}
    market={promptMarket}
    workflowMode={workflowMode}
    wizard={{
      setHeadline,
      setSubline,
      setOffer,
      setConceptIdea,
      setProduct,
      setPromptExtra,
      setImageOutputMode,
      setImageAspectRatio,
      setCampaignTheme,
      selectVisualStyle,
      onWorkflowModeChange,
      setImageRefPhoto,
      setImageCreativeMode,
      onImageInputModeChange,
      setExtraKitPhotos,
      setReferenceCarouselSlideCount,
      setContentResearchApplyRef,
      setCinematicSceneCount: onCinematicSceneCountChange,
      onVideoCreativeModeChange,
      onReferenceAdFile,
      setError,
    }}
    onApplied={(angle, plan, result) => {
      setContentResearchNote(result?.message ?? m.studioAssistant.actionApplied);
      if (result?.refs.videoAttached) {
        setError(null);
      }
      setConceptAudience("");
      setConceptPain("");
      setConceptPromise("");
      setConceptProof("");
      setConceptCta("");
      setConceptVisualMetaphor("");
      setConceptPlanNote(null);
    }}
  />
    </div>
  </details>
  {contentResearchNote && (
    <p className="text-xs text-emerald-800">{contentResearchNote}</p>
  )}

  {isContentResearchVideoPath && (
    <div
      id="research-reel-setup"
      className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-xs text-violet-950"
    >
      <div>
        <p className="font-semibold text-violet-900">
          {isConcept ? m.wizard.researchReelSetupTitleConcept : m.wizard.researchReelSetupTitle}
        </p>
        <p className="mt-1 leading-relaxed text-violet-800">
          {isConcept ? m.wizard.researchReelSetupIntroConcept : m.wizard.researchReelSetupIntro}
        </p>
      </div>
      <ul className="space-y-1.5">
        <li className="flex items-start gap-2">
          <span aria-hidden>{isContentResearchStyleExtra(promptExtra) ? "✓" : "○"}</span>
          <span>{m.wizard.researchReelStatusPost}</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>{referenceAd && referenceIsVideo ? "✓" : "○"}</span>
          <span>
            {referenceAd && referenceIsVideo
              ? m.wizard.researchReelStatusMp4
              : m.wizard.researchReelMp4Missing}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>
            {researchReelAnalyzeBusy ? "…" : researchReelAnalysis || videoPrompt.trim() ? "✓" : "○"}
          </span>
          <span>
            {researchReelAnalyzeBusy
              ? m.wizard.researchReelAnalyzing
              : researchReelAnalyzeNote || researchReelAnalysis?.productionNotesZh || "—"}
          </span>
        </li>
        {isConcept ? (
          <li className="flex items-start gap-2">
            <span aria-hidden>{headline.trim() || conceptIdea.trim() ? "✓" : "○"}</span>
            <span>
              {headline.trim() || conceptIdea.trim()
                ? m.wizard.researchReelStatusConceptCopy
                : m.wizard.researchReelStatusConceptCopyMissing}
            </span>
          </li>
        ) : (
          <li className="flex items-start gap-2">
            <span aria-hidden>{productPhoto ? "✓" : "○"}</span>
            <span>
              {productPhoto
                ? m.wizard.researchReelStatusProductPhoto
                : m.wizard.researchReelStatusProductPhotoOptional}
            </span>
          </li>
        )}
      </ul>
      <div className={`grid gap-3 ${isConcept ? "" : "sm:grid-cols-2"}`}>
        {!isConcept && (
        <div
          className="rounded-xl border border-violet-200 bg-white/90 p-3"
          data-coach-id="coach-product-photo"
        >
          <UploadZone
            label={m.wizard.uploadLabel}
            hint={m.wizard.researchReelUploadProductHint}
            cta={m.wizard.uploadCta}
            changeLabel={m.wizard.uploadChange}
            previewUrl={uploadPreviewUrl}
            fileName={productPhoto?.name ?? null}
            onFile={onProductPhotoSelected}
          />
        </div>
        )}
        <div className="rounded-xl border border-violet-200 bg-white/90 p-3">
          <ReferenceUploadZone
            label={m.wizard.referenceLabel}
            hint={m.wizard.researchReelUploadMp4Hint}
            cta={m.wizard.referenceCta}
            changeLabel={m.wizard.referenceChange}
            previewUrl={referencePreviewUrl}
            isVideo={referenceIsVideo}
            fileName={referenceAd?.name ?? null}
            onFile={handleSetupReferenceVideo}
          />
        </div>
      </div>
      {referencePreviewUrl && referenceIsVideo ? (
        <video
          src={referencePreviewUrl}
          className="max-h-40 w-full rounded-lg border border-violet-200 object-contain"
          muted
          playsInline
          controls
        />
      ) : null}
    </div>
  )}

  {setupReferenceVideoOnStep1 && !isContentResearchVideoPath && (
    <div
      id="setup-reference-video"
      className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-950"
    >
      <div>
        <p className="font-semibold text-emerald-900">{m.wizard.setupReferenceVideoTitle}</p>
        <p className="mt-1 leading-relaxed text-emerald-800">{m.wizard.setupReferenceVideoIntro}</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-white/90 p-3">
        <ReferenceUploadZone
          label={m.wizard.referenceLabel}
          hint={m.wizard.setupReferenceVideoHint}
          cta={m.wizard.referenceCta}
          changeLabel={m.wizard.referenceChange}
          previewUrl={referencePreviewUrl}
          isVideo={referenceIsVideo}
          fileName={referenceAd?.name ?? null}
          onFile={handleSetupReferenceVideo}
        />
      </div>
      {referenceAd && referenceIsVideo && (researchReelAnalyzeBusy || researchReelAnalyzeNote) ? (
        <p className="rounded-lg bg-purple-950/10 px-3 py-2 text-purple-900">
          {researchReelAnalyzeBusy ? m.wizard.researchReelAnalyzing : researchReelAnalyzeNote}
        </p>
      ) : referenceAd && referenceIsVideo && !effectivePromoteName ? (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-amber-950">
          {m.wizard.setupReferenceVideoWaitingCopy}
        </p>
      ) : null}
      {!referenceAd || !referenceIsVideo ? (
        <p className="text-emerald-800/90">{m.wizard.setupReferenceVideoSkipNote}</p>
      ) : !isStoryboardOutput ? (
        <p className="text-emerald-800/90">{m.wizard.setupReferenceVideoNonStoryboardHint}</p>
      ) : null}
    </div>
  )}

  {hidePrimaryPaths ? (
    showResearchPathsHint ? (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
        {m.wizard.primaryPathsHiddenResearchHint}
      </p>
    ) : null
  ) : (
  <div className="rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-50 via-white to-indigo-50 p-4">
    <p className="text-sm font-semibold text-slate-900">{pathsTitle}</p>
    <p className="mt-1 text-xs text-slate-600">{pathsHint}</p>
    {isConceptVideoOnly ? (
      <>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => applyPrimaryPathConceptVideo("creative")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "creative-video"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {m.wizard.visualStyles["creative-video"].title}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {m.wizard.visualStyles["creative-video"].description}
          </p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathConceptVideo("brand")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "brand-video"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {m.wizard.visualStyles["brand-video"].title}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {m.wizard.visualStyles["brand-video"].description}
          </p>
        </button>
        </div>
      </>
    ) : isConcept ? (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => applyPrimaryPathConcept("info")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "info-poster"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathInfoTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathInfoDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathConcept("brand")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "brand-fit"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathBrandTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathBrandDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathConcept("pricing")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "pricing-offer"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathPricingTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathPricingDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathConcept("website")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "website-launch"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathWebsiteTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathWebsiteDesc}</p>
        </button>
      </div>
    ) : isVideoOnlyPhysical ? (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => applyPrimaryPathVideoOnly("assistant")}
          className={`rounded-xl border px-3 py-3 text-left ${
            videoCreativeMode === "product-assistant"
              ? "border-cyan-400 bg-cyan-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            <span className="mr-1">🤖</span>
            {assistantMode.title}
          </p>
          <p className="mt-1 text-xs text-slate-600">{assistantMode.description}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathVideoOnly("storyboard")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "storyboard-video"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {m.wizard.pathStoryboardTitle}
          </p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathStoryboardDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathVideoOnly("brand")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "brand-video"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {m.wizard.visualStyles["brand-video"].title}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {m.wizard.visualStyles["brand-video"].description}
          </p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPathVideoOnly("creative")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "creative-video"
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">
            {m.wizard.visualStyles["creative-video"].title}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {m.wizard.visualStyles["creative-video"].description}
          </p>
        </button>
      </div>
    ) : (
      <div className="mt-3 grid gap-2 sm:grid-cols-2" data-coach-id="coach-visual-style-paths">
        <button
          type="button"
          onClick={() => applyPrimaryPath("quick")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "product" && imageCreativeMode !== "reference-concept"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathQuickTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathQuickDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPath("reference")}
          className={`rounded-xl border px-3 py-3 text-left ${
            imageCreativeMode === "reference-concept"
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathReferenceTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathReferenceDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPath("model")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "model-wear"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathModelTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathModelDesc}</p>
        </button>
        <button
          type="button"
          onClick={() => applyPrimaryPath("ugc-presenter")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "ugc-presenter"
              ? "border-rose-400 bg-rose-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathUgcPresenterTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathUgcPresenterDesc}</p>
        </button>
        {workflowMode !== "image-only" && (
        <button
          type="button"
          onClick={() => applyPrimaryPath("storyboard")}
          className={`rounded-xl border px-3 py-3 text-left ${
            visualStyleId === "storyboard-video"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">{m.wizard.pathStoryboardTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{m.wizard.pathStoryboardDesc}</p>
        </button>
        )}
      </div>
    )}
    {isConcept && (
      <div className="mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
        <p className="text-xs font-semibold text-fuchsia-900">{m.wizard.conceptCinematicPathsTitle}</p>
        <p className="mt-1 text-xs text-fuchsia-800">{m.wizard.conceptCinematicPathsHint}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => applyPrimaryPathConceptVideo("cinematic")}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              visualStyleId === "concept-cinematic" && cinematicSceneCount === 1
                ? "border-fuchsia-400 bg-white"
                : "border-fuchsia-200 bg-white/90"
            }`}
          >
            <p className="font-semibold text-fuchsia-950">{m.wizard.conceptCinematicSingleTitle}</p>
            <p className="mt-0.5 text-fuchsia-800">{m.wizard.conceptCinematicSingleDesc}</p>
          </button>
          <button
            type="button"
            onClick={applyCinematicStitchRecipe}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              visualStyleId === "concept-cinematic" && cinematicSceneCount > 1
                ? "border-fuchsia-400 bg-white"
                : "border-fuchsia-200 bg-white/90"
            }`}
          >
            <p className="font-semibold text-fuchsia-950">{m.wizard.conceptCinematicStitchTitle}</p>
            <p className="mt-0.5 text-fuchsia-800">{m.wizard.conceptCinematicStitchDesc}</p>
          </button>
        </div>
        {visualStyleId === "concept-cinematic" && (
          <div className="mt-3 rounded-lg border border-fuchsia-200 bg-white/80 p-2">
            <label className="flex flex-wrap items-center gap-2 text-xs text-fuchsia-950">
              <span className="font-semibold">{m.wizard.cinematicSceneCountLabel}</span>
              <select
                value={cinematicSceneCount}
                onChange={(e) =>
                  onCinematicSceneCountChange(Number(e.target.value) as CinematicSceneCount)
                }
                className="rounded-md border border-fuchsia-300 bg-white px-2 py-1 text-xs text-fuchsia-950"
              >
                {CINEMATIC_SCENE_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n === 1
                      ? m.wizard.conceptCinematicSingleTitle
                      : formatCinematicCopy(m.wizard.cinematicSceneCountOption, n)}
                  </option>
                ))}
              </select>
              <span className="text-fuchsia-800">
                {formatCinematicCopy(m.wizard.cinematicSceneCountTotalHint)}
              </span>
            </label>
            <p className="mt-1 text-[11px] text-fuchsia-800">{m.wizard.cinematicSceneCountHint}</p>
          </div>
        )}
        <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/80 p-2">
          <p className="text-xs font-semibold text-cyan-900">{m.wizard.closestMatchRecipeTitle}</p>
          <p className="mt-1 text-xs text-cyan-800">{m.wizard.closestMatchRecipeHint}</p>
          <button
            type="button"
            onClick={handleApplyClosestMatchRecipe}
            className="mt-2 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:border-cyan-400"
          >
            {m.wizard.closestMatchRecipeApply}
          </button>
          {recipeApplyNote && (
            <p className="mt-1 text-[11px] text-cyan-900">{recipeApplyNote}</p>
          )}
        </div>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
          <p className="text-xs font-semibold text-amber-900">{m.wizard.quickTest8sRecipeTitle}</p>
          <p className="mt-1 text-xs text-amber-800">{m.wizard.quickTest8sRecipeHint}</p>
          <button
            type="button"
            onClick={handleApplyQuickTest8sRecipe}
            className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:border-amber-400"
          >
            {m.wizard.quickTest8sRecipeApply}
          </button>
        </div>
      </div>
    )}
    {!isConcept && (
      <p className="mt-2 text-[11px] text-slate-500">{m.wizard.primaryPathsShortcutNote}</p>
    )}
    {isVideoOnlyPhysical && videoCreativeMode === "product-assistant" && (
      <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-950">
        {m.wizard.videoAssistantStepHint}
      </p>
    )}
  </div>
  )}

  {isConcept && (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3">
      <p className="text-sm font-semibold text-indigo-950">{m.wizard.conceptWizardTitle}</p>
      <p className="text-xs text-indigo-900/80">{m.wizard.conceptWizardHint}</p>
      {isConceptVideoOnly && (
        <p className="text-xs font-medium text-cyan-800">{m.wizard.conceptVideoSameBriefHint}</p>
      )}
      {(isConceptVideoOnly || workflowMode === "combined" || workflowMode === "image-only") && (
        <div
          className="rounded-lg border border-indigo-200 bg-white/80 p-3"
          data-coach-id="coach-product-photo"
        >
          <UploadZone
            label={m.wizard.conceptVideoImageLabel}
            hint={m.wizard.conceptVideoImageHint}
            cta={m.wizard.uploadCta}
            changeLabel={m.wizard.uploadChange}
            previewUrl={uploadPreviewUrl}
            fileName={productPhoto?.name ?? null}
            onFile={onProductPhotoSelected}
          />
          <p className="mt-2 text-[11px] text-indigo-900/75">{m.wizard.conceptVideoImageOrderHint}</p>
        </div>
      )}
      <textarea
        data-coach-id="coach-concept-idea"
        value={conceptIdea}
        onChange={(e) => setConceptIdea(e.target.value)}
        placeholder={m.wizard.conceptIdeaPlaceholder}
        rows={3}
        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <textarea
          value={conceptAudience}
          onChange={(e) => setConceptAudience(e.target.value)}
          placeholder={m.wizard.conceptAudiencePlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <textarea
          value={conceptPain}
          onChange={(e) => setConceptPain(e.target.value)}
          placeholder={m.wizard.conceptPainPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <textarea
          value={conceptPromise}
          onChange={(e) => setConceptPromise(e.target.value)}
          placeholder={m.wizard.conceptPromisePlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <textarea
          value={conceptProof}
          onChange={(e) => setConceptProof(e.target.value)}
          placeholder={m.wizard.conceptProofPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <textarea
          value={conceptCta}
          onChange={(e) => setConceptCta(e.target.value)}
          placeholder={m.wizard.conceptCtaPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <textarea
          value={conceptVisualMetaphor}
          onChange={(e) => setConceptVisualMetaphor(e.target.value)}
          placeholder={m.wizard.conceptVisualMetaphorPlaceholder}
          rows={2}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <button
        type="button"
        onClick={() => void analyzeConceptWithAi()}
        disabled={conceptPlanBusy}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {conceptPlanBusy ? m.wizard.conceptAnalyzeBusy : m.wizard.conceptAnalyzeBtn}
      </button>
      <button
        type="button"
        onClick={() => applyConceptWizard()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {m.wizard.conceptApplyBtn}
      </button>
      {conceptPlanNote && (
        <p className="text-xs text-indigo-900/90">{conceptPlanNote}</p>
      )}
      <p className="text-[11px] text-indigo-900/80">{m.wizard.conceptApplyHint}</p>
    </div>
  )}

  {!usesCompositor && (
    <details
      className="rounded-xl border border-violet-900/50 bg-violet-950/25 px-4 py-3"
      open={isBrandVisualStyle(visualStyleId)}
    >
      <summary className="cursor-pointer text-sm font-semibold text-violet-50">
        {isBrandVisualStyle(visualStyleId)
          ? m.wizard.brandFitTitleRequired
          : m.wizard.brandFitTitle}
      </summary>
      <div className="mt-3 space-y-3">
      <p className="text-xs text-violet-200/90">
        {isBrandVisualStyle(visualStyleId)
          ? lockedCampaignMode
            ? m.wizard.brandCampaignIntro
            : isBrandVideoStyle(visualStyleId)
              ? m.wizard.brandVideoIntro
              : m.wizard.brandFitIntro
          : m.wizard.brandAnalyzeOptionalIntro}
      </p>
      <label className="block text-xs font-medium text-violet-100">
        {m.wizard.brandWebsiteLabel}
      </label>
      <input
        data-coach-id="coach-brand-website"
        value={brandWebsiteUrl}
        onChange={(e) => setBrandWebsiteUrl(e.target.value)}
        placeholder={m.wizard.brandWebsitePlaceholder}
        className="w-full rounded-lg border border-violet-800/60 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <label className="block text-xs font-medium text-violet-100">
        {m.wizard.brandSocialLabel}
      </label>
      <input
        value={brandSocialHint}
        onChange={(e) => setBrandSocialHint(e.target.value)}
        placeholder={m.wizard.brandSocialPlaceholder}
        className="w-full rounded-lg border border-violet-800/60 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <button
        type="button"
        data-coach-id="coach-analyze-brand"
        onClick={() => void analyzeBrand()}
        disabled={brandAnalyzeBusy}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {brandAnalyzeBusy ? m.wizard.brandAnalyzeBusy : m.wizard.brandAnalyzeBtn}
      </button>
      {brandAnalyzeNote && (
        <p className="text-xs text-violet-100/90">{brandAnalyzeNote}</p>
      )}
      <BrandKitPanel onChange={setBrandKit} />
      </div>
    </details>
  )}

  {!shipItMode && (
  <details
    className="rounded-xl border border-slate-200 bg-white p-3"
    open={showAdvancedSetup}
    onToggle={(e) => setShowAdvancedSetup((e.target as HTMLDetailsElement).open)}
  >
    <summary className="cursor-pointer text-sm font-medium text-slate-700">
      {m.wizard.advancedWorkflow}
    </summary>
    <div className="mt-3 space-y-4">
      <VisualStylePicker
        value={visualStyleId}
        onChange={selectVisualStyle}
        workflowMode={workflowMode}
        promotionMode={promotionMode}
      />
      {!usesCompositor && (
        <ArtStylePicker value={artStyleId} onChange={setArtStyleId} />
      )}
    </div>
  </details>
  )}

  {!usesCompositor && isUgcPresenterStyle(visualStyleId) && (
    <div className="space-y-2 rounded-xl border border-rose-900/50 bg-rose-950/25 px-4 py-3">
      <p className="text-sm font-semibold text-rose-50">
        {m.wizard.visualStyles["ugc-presenter"].title}
      </p>
      <p className="text-xs text-rose-100/90">{m.wizard.ugcPresenter.setupIntro}</p>
    </div>
  )}

  {!usesCompositor && isStoryboardVideoStyle(visualStyleId) && (
    <div className="space-y-3 rounded-xl border border-teal-900/50 bg-teal-950/25 px-4 py-3">
      <p className="text-sm font-semibold text-teal-50">
        {m.wizard.visualStyles["storyboard-video"].title}
      </p>
      <p className="text-xs text-teal-100/90">{m.wizard.storyboardIntro}</p>
      <label className="block text-xs font-medium text-teal-100">
        {m.wizard.storyboardBriefLabel}
      </label>
      <textarea
        data-coach-id="coach-storyboard-brief"
        value={storyboardBrief}
        onChange={(e) => setStoryboardBrief(e.target.value)}
        placeholder={m.wizard.storyboardBriefPlaceholder}
        rows={3}
        className="w-full rounded-lg border border-teal-800/60 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <div>
        <p className="mb-2 text-xs font-medium text-teal-100">
          {m.wizard.storyboardDurationLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_DURATIONS.filter((d) => d !== "auto").map((d) => (
            <button
              key={d}
              type="button"
              onClick={() =>
                setVideoSettings((prev: VideoSettings) => ({ ...prev, duration: d as VideoDuration }))
              }
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                videoSettings.duration === d
                  ? "bg-teal-600 text-white"
                  : "border border-teal-800/60 text-teal-200/80"
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-teal-200/70">
          {m.wizard.storyboardDurationHint}
        </p>
      </div>
    </div>
  )}

  {!usesCompositor && isCreativeVideoStyle(visualStyleId) && (
    <div className="space-y-3 rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3">
      <p className="text-sm font-semibold text-sky-50">{m.wizard.visualStyles["creative-video"].title}</p>
      <p className="text-xs text-sky-100/90">{m.wizard.creativeVideoIntro}</p>
      <label className="block text-xs font-medium text-sky-100">
        {m.wizard.creativeBriefLabel}
      </label>
      <textarea
        data-coach-id="coach-creative-video-brief"
        value={creativeVideoBrief}
        onChange={(e) => setCreativeVideoBrief(e.target.value)}
        placeholder={m.wizard.creativeBriefPlaceholder}
        rows={4}
        className="w-full rounded-lg border border-sky-800/60 bg-slate-950 px-3 py-2 text-sm text-white"
      />
    </div>
  )}

  {!usesCompositor && visualStyleId === "model-wear" && (
    <div className="rounded-xl border border-rose-900/50 bg-rose-950/25 px-4 py-3 text-sm text-rose-100">
      <p className="font-semibold text-rose-50">{m.wizard.visualStyles["model-wear"].title}</p>
      <p className="mt-1 text-xs text-rose-200/90">{m.wizard.modelWearIntro}</p>
    </div>
  )}

  {!usesCompositor && visualStyleId === "info-poster" && (
    <div className="rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
      <p className="font-semibold text-sky-50">{m.wizard.infoPosterTechniqueTitle}</p>
      <p className="mt-1 text-xs text-sky-200/90">{m.wizard.infoPosterTechniqueIntro}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-sky-100/90">
        {m.wizard.infoPosterTechniqueSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )}

  {!usesCompositor && usesReferenceConceptForImage && (
    <p className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90">
      {m.wizard.referenceConceptOverridesStyle}
    </p>
  )}

  {!usesCompositor &&
    !usesReferenceConceptForImage &&
    visualStylePromptHint(visualStyleId) && (
    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="font-medium text-slate-800">{m.wizard.styleAutoAppliedLabel}</span>{" "}
      {m.wizard.visualStyleHints[visualStyleId as keyof typeof m.wizard.visualStyleHints]}
    </p>
  )}

  <label className="block text-sm font-medium text-slate-700">
    {m.wizard.requirementsLabel}
  </label>
  <textarea
    value={promptExtra}
    onChange={(e) => setPromptExtra(e.target.value)}
    placeholder={
      m.wizard.requirementsPlaceholders[visualStyleId as keyof typeof m.wizard.requirementsPlaceholders] ??
      m.wizard.requirementsPlaceholder
    }
    rows={2}
    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
  />

  {usesCompositor && (
    <p className="rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
      {m.wizard.compositorCallout}
    </p>
  )}

  {templateHasSlot(templateId, "product") && (
    <>
      <label className="block text-sm font-medium text-slate-700">
        {promotionMode === "physical" && !usesCompositor
          ? m.wizard.productLabelRequired
          : m.wizard.productLabel}
      </label>
      <input
        data-coach-id="coach-product-name"
        value={product}
        onChange={(e) => setProduct(e.target.value)}
        placeholder={m.wizard.productPlaceholder}
        required={promotionMode === "physical" && !usesCompositor}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
      />
    </>
  )}

  {templateHasSlot(templateId, "headline") && (
    <>
      <label className="block text-sm font-medium text-slate-700">
        {m.wizard.headlineLabel}
        {isSlotRequired(templateId, "headline") && " *"}
      </label>
      <input
        data-coach-id="coach-headline"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder={m.wizard.headlinePlaceholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
      />
    </>
  )}

  {templateHasSlot(templateId, "subline") && (
    <>
      <label className="block text-sm font-medium text-slate-700">
        {usesCompositor || visualStyleId === "info-poster"
          ? m.wizard.sublineBulletsLabel
          : m.wizard.sublineLabel}
      </label>
      {usesCompositor || visualStyleId === "info-poster" ? (
        <textarea
          value={subline}
          onChange={(e) => setSubline(e.target.value)}
          placeholder={
            visualStyleId === "info-poster"
              ? m.wizard.infoPosterBulletsPlaceholder
              : m.wizard.sublineBulletsPlaceholder
          }
          rows={4}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
        />
      ) : (
        <input
          value={subline}
          onChange={(e) => setSubline(e.target.value)}
          placeholder={m.wizard.sublinePlaceholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
        />
      )}
    </>
  )}

  {templateHasSlot(templateId, "business") && (
    <>
      <label className="block text-sm font-medium text-slate-700">
        {usesCompositor ? m.wizard.brandLabel : m.wizard.businessLabel}
      </label>
      <input
        data-coach-id="coach-business"
        value={business}
        onChange={(e) => setBusiness(e.target.value)}
        placeholder={
          usesCompositor ? m.wizard.brandPlaceholder : m.wizard.businessPlaceholder
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
      />
    </>
  )}

  {templateHasSlot(templateId, "offer") && (
    <>
      <label className="block text-sm font-medium text-slate-700">
        {usesCompositor ? m.wizard.signoffLabel : m.wizard.offerLabel}
      </label>
      <input
        value={offer}
        onChange={(e) => setOffer(e.target.value)}
        placeholder={
          usesCompositor ? m.wizard.signoffPlaceholder : m.wizard.offerPlaceholder
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500"
      />
    </>
  )}

  <TemplateSlotChecklist
    templateId={templateId}
    filled={templateSlotStatus()}
    optionalSlotIds={isConceptStoryboardOutput ? ["productPhoto"] : undefined}
    deferredSlotIds={
      setupReferenceVideoOnStep1
        ? isContentResearchVideoPath
          ? ["styleRef"]
          : ["productPhoto", "styleRef"]
        : ["productPhoto", "styleRef", "referenceVideo"]
    }
  />

  {!usesCompositor && !shipItMode && (
    <details
      className="rounded-xl border border-slate-200 bg-white p-3"
      open={showAdvancedSetupPrompts}
      onToggle={(e) =>
        setShowAdvancedSetupPrompts((e.target as HTMLDetailsElement).open)
      }
    >
      <summary className="cursor-pointer text-sm font-medium text-slate-700">
        {workflowMode === "image-only" ? m.wizard.imageAdvancedLabel : m.wizard.advancedPrompts}
      </summary>
      <AdvancedPromptPanel
        section={advancedSection}
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

  {error && <WizardErrorBanner message={error} variant="light" />}

  {setupNextDisabled && setupNextDisabledReason && (
    <p className="text-center text-xs text-amber-700">{setupNextDisabledReason}</p>
  )}

  <button
    type="button"
    data-coach-id="coach-continue-setup"
    onClick={goNextFromSetup}
    disabled={setupNextDisabled}
    title={setupNextDisabledReason ?? undefined}
    className="hidden w-full rounded-2xl bg-linear-to-r from-cyan-500 via-emerald-500 to-teal-500 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] transition hover:scale-[1.01] disabled:opacity-40 md:block"
  >
    {continueSetupLabel}
  </button>
</section>
  );
}
