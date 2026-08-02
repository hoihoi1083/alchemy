"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { UploadZone } from "@/components/UploadZone";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";

type ConceptDraft = {
  audience?: string;
  painPoint?: string;
  promise?: string;
  proof?: string;
  cta?: string;
  visualMetaphor?: string;
};

type Props = {
  /** Concept video paths: optional keyframe upload before AI analyze */
  showConceptVideoImage?: boolean;
  /** Micro-wizard: show headline field on same screen */
  showHeadlineField?: boolean;
};

export function ConceptWizardPanel({
  showConceptVideoImage = false,
  showHeadlineField = false,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    conceptIdea,
    setConceptIdea,
    headline,
    setHeadline,
    product,
    business,
    subline,
    offer,
    setSubline,
    setOffer,
    setPromptExtra,
    setCreativeVideoBrief,
    setConceptImageVisionNote,
    setUserReferenceBrief,
    setUseOriginalImage,
    setError,
    effectivePromptExtra,
    productPhoto,
    uploadPreviewUrl,
    onProductPhotoSelected,
    visualStyleId,
    workflowMode,
    promptMarket,
    planAiVideoPrompt,
    conceptPlanBusy,
    setConceptPlanBusy,
  } = wizard;

  const [conceptAudience, setConceptAudience] = useState("");
  const [conceptPain, setConceptPain] = useState("");
  const [conceptPromise, setConceptPromise] = useState("");
  const [conceptProof, setConceptProof] = useState("");
  const [conceptCta, setConceptCta] = useState("");
  const [conceptVisualMetaphor, setConceptVisualMetaphor] = useState("");
  const [conceptPlanNote, setConceptPlanNote] = useState<string | null>(null);

  const isConceptVideoOnly = workflowMode === "video-only";

  function applyConceptWizard(draft?: ConceptDraft, imageVisionNote?: string) {
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
        fd.set("promptExtra", effectivePromptExtra());
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
            promptExtra: effectivePromptExtra(),
            conceptIdea: conceptIdea.trim(),
            visualStyleId,
            workflowMode,
            market: promptMarket,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? m.errors.planConceptFailed);
      const draft = data.draft as ConceptDraft;
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

  const fieldClass =
    "w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3.5">
      <p className="text-sm font-semibold text-slate-900">{m.wizard.conceptWizardTitle}</p>
      <p className="text-xs leading-relaxed text-slate-600">{m.wizard.conceptWizardHint}</p>
      {isConceptVideoOnly && (
        <p className="text-xs font-medium text-violet-800">{m.wizard.conceptVideoSameBriefHint}</p>
      )}
      {showConceptVideoImage && (
        <div
          className="rounded-xl border border-violet-200 bg-white p-3"
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
          <p className="mt-2 text-[11px] text-slate-500">{m.wizard.conceptVideoImageOrderHint}</p>
        </div>
      )}
      <textarea
        data-coach-id="coach-concept-idea"
        value={conceptIdea}
        onChange={(e) => setConceptIdea(e.target.value)}
        placeholder={m.wizard.conceptIdeaPlaceholder}
        rows={3}
        className={fieldClass}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <textarea
          value={conceptAudience}
          onChange={(e) => setConceptAudience(e.target.value)}
          placeholder={m.wizard.conceptAudiencePlaceholder}
          rows={2}
          className={fieldClass}
        />
        <textarea
          value={conceptPain}
          onChange={(e) => setConceptPain(e.target.value)}
          placeholder={m.wizard.conceptPainPlaceholder}
          rows={2}
          className={fieldClass}
        />
        <textarea
          value={conceptPromise}
          onChange={(e) => setConceptPromise(e.target.value)}
          placeholder={m.wizard.conceptPromisePlaceholder}
          rows={2}
          className={fieldClass}
        />
        <textarea
          value={conceptProof}
          onChange={(e) => setConceptProof(e.target.value)}
          placeholder={m.wizard.conceptProofPlaceholder}
          rows={2}
          className={fieldClass}
        />
        <textarea
          value={conceptCta}
          onChange={(e) => setConceptCta(e.target.value)}
          placeholder={m.wizard.conceptCtaPlaceholder}
          rows={2}
          className={fieldClass}
        />
        <textarea
          value={conceptVisualMetaphor}
          onChange={(e) => setConceptVisualMetaphor(e.target.value)}
          placeholder={m.wizard.conceptVisualMetaphorPlaceholder}
          rows={2}
          className={fieldClass}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void analyzeConceptWithAi()}
          disabled={conceptPlanBusy || !conceptIdea.trim()}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {conceptPlanBusy ? m.wizard.conceptAnalyzeBusy : m.wizard.conceptAnalyzeBtn}
        </button>
        <button
          type="button"
          onClick={() => applyConceptWizard()}
          disabled={!conceptIdea.trim()}
          className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
        >
          {m.wizard.conceptApplyBtn}
        </button>
      </div>
      {conceptPlanNote ? (
        <p className="rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-xs text-violet-900">
          {conceptPlanNote}
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-slate-500">{m.wizard.conceptApplyHint}</p>
      {showHeadlineField ? (
        <label className="mt-1 block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">{m.wizard.headlineLabel}</span>
          <input
            data-coach-id="coach-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={m.wizard.headlinePlaceholder}
            className={`${fieldClass} py-2.5`}
          />
        </label>
      ) : null}
    </div>
  );
}
