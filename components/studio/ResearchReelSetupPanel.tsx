"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { UploadZone } from "@/components/UploadZone";
import { ReferenceUploadZone } from "@/components/ReferenceUploadZone";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";

type Props = {
  onReferenceVideo?: (file: File | null) => void;
};

export function ResearchReelSetupPanel({ onReferenceVideo }: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    conceptIdea,
    headline,
    isContentResearchVideoPath,
    onImageCreativeModeChange,
    onImageInputModeChange,
    onProductPhotoSelected,
    onReferenceAdFile,
    onVideoCreativeModeChange,
    productPhoto,
    promotionMode,
    promptExtra,
    referenceAd,
    referenceIsVideo,
    referencePreviewUrl,
    researchReelAnalysis,
    researchReelAnalyzeBusy,
    researchReelAnalyzeNote,
    setVideoSettings,
    uploadPreviewUrl,
    videoPrompt,
    videoSettings,
  } = wizard;

  if (!isContentResearchVideoPath) return null;

  const isConcept = promotionMode === "concept";
  const outputDurationExplicit = videoSettings.duration !== "auto";

  function handleReferenceVideo(file: File | null) {
    if (file) {
      onVideoCreativeModeChange("reference-concept");
      onImageCreativeModeChange("reference-concept");
      if (isConcept) onImageInputModeChange("reference");
    }
    onReferenceAdFile(file);
    onReferenceVideo?.(file);
  }

  return (
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
      {/* Duration must be pickable HERE — wait.reel_analyze gates on duration≠auto before setup.pre_video. */}
      <div className="rounded-xl border border-violet-200 bg-white/90 p-3">
        <VideoSettingsPanel
          compact
          setup
          hideAutoDuration
          value={videoSettings}
          onChange={setVideoSettings}
        />
        {!outputDurationExplicit ? (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-950">
            {m.wizard.researchReelPickDurationFirst}
          </p>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        <li className="flex items-start gap-2">
          <span aria-hidden>{outputDurationExplicit ? "✓" : "○"}</span>
          <span>
            {outputDurationExplicit
              ? `${m.wizard.researchReelStatusOutputDuration} (${videoSettings.duration}s)`
              : m.wizard.researchReelStatusOutputDurationMissing}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>{isContentResearchStyleExtra(promptExtra) ? "✓" : "○"}</span>
          <span>{m.wizard.researchReelStatusPost}</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>{referenceAd && referenceIsVideo ? "✓" : "○"}</span>
          <span>
            {referenceAd && referenceIsVideo
              ? m.wizard.researchReelStatusMp4
              : wizard.workflowMode === "combined"
                ? m.wizard.researchReelMp4OptionalCombined
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
        {!isConcept ? (
          <div className="rounded-xl border border-violet-200 bg-white/90 p-3" data-coach-id="coach-product-photo">
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
        ) : null}
        <div className="rounded-xl border border-violet-200 bg-white/90 p-3">
          <ReferenceUploadZone
            label={m.wizard.referenceLabel}
            hint={m.wizard.researchReelUploadMp4Hint}
            cta={m.wizard.referenceCta}
            changeLabel={m.wizard.referenceChange}
            previewUrl={referencePreviewUrl}
            isVideo={referenceIsVideo}
            fileName={referenceAd?.name ?? null}
            onFile={handleReferenceVideo}
          />
        </div>
      </div>
      {referencePreviewUrl && referenceIsVideo ? (
        <video
          src={referencePreviewUrl}
          className="mx-auto max-h-28 w-full max-w-[14rem] rounded-lg border border-violet-200 object-contain"
          muted
          playsInline
          controls
        />
      ) : null}
    </div>
  );
}
