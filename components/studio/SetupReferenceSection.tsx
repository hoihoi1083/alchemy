"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { ReferenceBriefPanel } from "@/components/ReferenceBriefPanel";
import { UploadZone } from "@/components/UploadZone";

/**
 * Reference image preview + analyzed brief — same slot as classic ImageStep
 * (`coach-style-reference` + ReferenceBriefPanel).
 */
export function SetupReferenceSection() {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    extraKitPhotos,
    imageCreativeMode,
    imageRefPhoto,
    imageRefPreviewUrl,
    productPhoto,
    promotionMode,
    referenceAd,
    referenceAnalyzeBusy,
    referenceAnalyzeNote,
    referenceStrategy,
    researchReelAnalysis,
    researchReelAnalyzeBusy,
    researchReelAnalyzeNote,
    setImageRefPhoto,
    useReferenceVideo,
    userReferenceBrief,
    usesCompositor,
  } = wizard;

  const isConcept = promotionMode === "concept";
  const showRefUpload =
    !usesCompositor &&
    (imageCreativeMode === "reference-concept" || Boolean(imageRefPhoto));

  const showBriefPanel =
    Boolean(imageRefPhoto) ||
    referenceAnalyzeBusy ||
    Boolean(userReferenceBrief) ||
    (useReferenceVideo && Boolean(referenceAd));

  if (!showRefUpload && !showBriefPanel) return null;

  const carouselExtra = extraKitPhotos.length;
  const briefNote =
    researchReelAnalyzeNote ||
    referenceAnalyzeNote ||
    (useReferenceVideo && referenceAd && !researchReelAnalysis && !researchReelAnalyzeBusy
      ? m.wizard.setupReferenceVideoAnalyzeRequired
      : null);

  return (
    <div className="space-y-3">
      {showRefUpload ? (
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
          {carouselExtra > 0 && !userReferenceBrief ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {m.contentResearch.carouselSlides(carouselExtra + 1)}
            </p>
          ) : null}
          {isConcept && imageRefPhoto && !productPhoto ? (
            <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
              {m.wizard.referenceConceptStyleOnlyHint}
            </p>
          ) : null}
        </>
      ) : null}

      {showBriefPanel ? (
        <ReferenceBriefPanel
          m={m}
          brief={userReferenceBrief}
          strategy={referenceStrategy}
          busy={referenceAnalyzeBusy || researchReelAnalyzeBusy}
          note={briefNote}
        />
      ) : null}
    </div>
  );
}
