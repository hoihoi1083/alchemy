"use client";

import { useEffect, useId, type ChangeEvent } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { BrandWebsitePanel } from "@/components/studio/BrandWebsitePanel";
import { useWizard } from "@/components/studio/WizardContext";
import { estimateVideoTokens } from "@/lib/billing/token-costs";
import { isBrandVideoStyle, isCreativeVideoStyle } from "@/lib/visual-styles";

const PANEL_CSS = `
.pv-page {
  background: transparent;
  color: #0f172a;
  margin-left: -1rem;
  margin-right: -1rem;
  padding: 0.35rem 1rem 1.25rem;
}
@media (min-width: 640px) {
  .pv-page { margin-left: -1.5rem; margin-right: -1.5rem; padding-left: 1.5rem; padding-right: 1.5rem; }
}
.pv-phase-rail {
  position: relative; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.35rem; max-width: 1320px; margin: 0 auto; padding: 0.85rem 0.25rem 1.05rem;
}
.pv-phase-line {
  position: absolute; top: calc(0.85rem + 16px); left: calc(0.25rem + 16px); right: calc(0.25rem + 16px);
  border-top: 2px dotted #cbd5e1; z-index: 0; pointer-events: none;
}
.pv-phase-item {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem; flex: 1 1 0; min-width: 0; text-align: center;
}
.pv-phase-dot--active { background: #7c3aed !important; color: #fff !important; box-shadow: 0 0 0 4px rgba(124,58,237,0.16); }
.pv-phase-dot--done { background: #7c3aed !important; color: #fff !important; }
.pv-phase-dot--idle { background: #e2e8f0 !important; color: #94a3b8 !important; }
.pv-phase-label { font-size: 11px; line-height: 1.25; max-width: 7.5rem; }
.pv-layout {
  display: grid; gap: 1.15rem; margin-top: 1rem; align-items: start;
  grid-template-columns: 1fr;
}
.pv-stack { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.pv-card {
  border-radius: 1rem; border: 1px solid #e2e8f0; background: #fff;
  padding: 1.05rem 1.05rem 1.15rem;
  box-shadow: 0 1px 2px rgba(15,23,42,0.03);
}
.pv-card-title-row { display: flex; align-items: center; gap: 0.55rem; min-width: 0; }
.pv-card-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.35rem; height: 2.35rem; border-radius: 0.65rem;
  background: #f5f3ff; color: #7c3aed; flex-shrink: 0;
}
.pv-card-title {
  font-size: 0.95rem; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;
}
.pv-label { display: block; font-size: 0.75rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem; }
.pv-label-req { color: #7c3aed; margin-left: 0.15rem; }
.pv-label-opt { font-weight: 500; color: #94a3b8; margin-left: 0.35rem; }
.pv-input, .pv-textarea {
  width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; background: #fff;
  padding: 0.65rem 0.85rem; font-size: 0.875rem; color: #0f172a;
}
.pv-textarea { resize: vertical; min-height: 4.5rem; }
.pv-field-grid { display: grid; gap: 0.85rem; }
.pv-tip-wrap { display: flex; flex-direction: column; gap: 0.85rem; }
.pv-tip-card {
  border-radius: 1rem; border: 1px solid #ddd6fe; background: linear-gradient(180deg, #faf5ff 0%, #fff 55%);
  padding: 1rem 1.05rem 1.1rem;
}
.pv-tip-head { display: flex; align-items: center; gap: 0.5rem; }
.pv-tip-head-icon, .pv-tip-icon, .pv-secure-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.85rem; height: 1.85rem; border-radius: 0.55rem;
  background: #ede9fe; color: #6d28d9; flex-shrink: 0;
}
.pv-secure {
  display: flex; gap: 0.65rem; align-items: flex-start;
  border-radius: 0.85rem; border: 1px solid #e2e8f0; background: #f8fafc; padding: 0.75rem 0.85rem;
}
.pv-generate-btn {
  display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: 0.45rem;
  border-radius: 0.85rem; background: #7c3aed; color: #fff; font-size: 0.95rem; font-weight: 700;
  padding: 0.85rem 1rem; border: none; cursor: pointer;
}
.pv-generate-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pv-cost {
  border-radius: 0.75rem; border: 1px solid #ddd6fe; background: #f5f3ff;
  padding: 0.65rem 0.85rem; font-size: 0.8rem; color: #5b21b6; font-weight: 600;
}
.pv-output-card {
  position: relative; display: flex; gap: 0.65rem; align-items: flex-start;
  border-radius: 0.85rem; border: 1.5px solid #e2e8f0; background: #fff;
  padding: 0.85rem 0.9rem; text-align: left; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.pv-output-card:hover { border-color: #ddd6fe; }
.pv-output-card.is-selected {
  border-color: #7c3aed; background: #faf5ff;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
}
.pv-output-copy { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.pv-output-copy strong { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
.pv-output-copy span { font-size: 0.72rem; line-height: 1.35; color: #64748b; }
.pv-check {
  position: absolute; top: 0.55rem; right: 0.55rem;
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.25rem; height: 1.25rem; border-radius: 999px;
  background: #7c3aed; color: #fff;
}
.pv-style-grid { display: grid; gap: 0.55rem; margin-top: 0.75rem; grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .pv-style-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 639px) {
  .pv-phase-label { display: none; }
  .pv-phase-item.is-active .pv-phase-label {
    display: block; font-weight: 600; color: #6d28d9;
  }
}
@media (min-width: 640px) {
  .pv-field-grid { grid-template-columns: 1fr 1fr; gap: 1rem 1.1rem; }
}
@media (min-width: 768px) {
  .pv-layout {
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 1.35rem;
  }
  .pv-tip-wrap { position: sticky; top: 1rem; }
}
@media (max-width: 767px) {
  .pv-mobile-cta {
    display: flex; flex-direction: column; gap: 0.55rem;
    position: sticky; bottom: 0.35rem; z-index: 30; margin-top: 0.75rem;
    padding: 0.65rem 0.7rem; border-radius: 1rem; border: 1px solid #ddd6fe;
    background: rgba(255,255,255,0.96); box-shadow: 0 8px 24px rgba(15,23,42,0.12);
  }
  .pv-tip-wrap .pv-desktop-generate { display: none; }
}
@media (min-width: 768px) {
  .pv-mobile-cta { display: none; }
}
`;

function PhaseStepper({
  phases,
  activeIndex,
}: {
  phases: readonly string[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Progress" className="border-b border-slate-100">
      <ol className="pv-phase-rail">
        <span className="pv-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li
              key={label}
              className={`pv-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active
                    ? "pv-phase-dot--active"
                    : done
                      ? "pv-phase-dot--done"
                      : "pv-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`pv-phase-label ${
                  active ? "font-semibold text-violet-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PreVideoSetupPanel({
  onGenerate,
  generateDisabled = false,
  generateLabel,
  generateBlockMessage,
  videoSubpath,
  onPickVideoSubpath,
}: {
  onGenerate?: () => void;
  generateDisabled?: boolean;
  generateLabel?: string;
  generateBlockMessage?: string | null;
  videoSubpath?: string;
  onPickVideoSubpath?: (subpath: string) => void;
} = {}) {
  const { m } = useLocale();
  const wizard = useWizard();
  const pv = m.microWizard.preVideoSetup;
  const mainInputId = useId();
  const refVideoInputId = useId();
  const isConcept = wizard.promotionMode === "concept";
  /** Research / R2V already chose reference — do not default into 快速廣告. */
  const prefersReference =
    wizard.videoCreativeMode === "reference-concept" ||
    Boolean(wizard.researchReelAnalysis?.seedancePrompt?.trim());
  const activeSubpath =
    videoSubpath ??
    (prefersReference
      ? "reference_reel"
      : isConcept
        ? "creative_video"
        : "product_promo");
  const isReference = activeSubpath === "reference_reel";
  const isUgc = activeSubpath === "ugc_presenter";
  const isQuickAssistant = !isConcept && activeSubpath === "product_promo";
  const showCreativeBrief =
    !isReference && !isUgc && isCreativeVideoStyle(wizard.visualStyleId);
  const showBrandWebsite =
    !isReference && !isUgc && isBrandVideoStyle(wizard.visualStyleId);
  const showConceptAiPlan =
    isConcept && !isReference && !isUgc && (showCreativeBrief || showBrandWebsite);
  // Product + reference/research still needs @Image1 (product photo). Concept R2V can be MP4-only.
  const showProductPhoto = isConcept ? !isReference : !isUgc;
  const photoRequired = !isConcept && !isUgc;

  // Keep research/R2V on reference_reel when ctx.videoSubpath was never set.
  useEffect(() => {
    if (!onPickVideoSubpath || videoSubpath) return;
    if (!prefersReference) return;
    onPickVideoSubpath("reference_reel");
  }, [onPickVideoSubpath, videoSubpath, prefersReference]);

  // 快速廣告 = DeepSeek product-assistant (vision → Seedance prompt), not raw product-promo I2V.
  // Never run this when reference-concept / research reel is active — that was overwriting R2V.
  useEffect(() => {
    if (!isQuickAssistant) return;
    if (wizard.videoCreativeMode === "reference-concept") return;
    if (wizard.videoCreativeMode === "product-assistant") return;
    wizard.applyPrimaryPathVideoOnly("assistant");
    // Intentionally omit applyPrimaryPathVideoOnly identity — only re-sync when mode/subpath drifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [isQuickAssistant, wizard.videoCreativeMode]);

  // UGC removed from product video fused setup — bounce sticky selection to 快速廣告.
  useEffect(() => {
    if (isConcept || !isUgc || !onPickVideoSubpath) return;
    onPickVideoSubpath("product_promo");
  }, [isConcept, isUgc, onPickVideoSubpath]);

  const durationRaw = wizard.videoSettings.duration;
  const durationNum =
    durationRaw === "auto" ? 8 : typeof durationRaw === "number" ? durationRaw : Number(durationRaw) || 8;
  const tokenEstimate = estimateVideoTokens({
    resolution: wizard.videoSettings.resolution,
    fast: Boolean(wizard.videoSettings.fast),
    duration: durationRaw === "auto" ? "auto" : durationNum,
  });

  const mainThumb = wizard.uploadPreviewUrl
    ? { url: wizard.uploadPreviewUrl, name: wizard.productPhoto?.name ?? "product" }
    : null;

  const refVideoName = wizard.referenceAd?.name ?? null;

  function onMainFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) wizard.onProductPhotoSelected(file);
  }

  function onRefVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    wizard.onReferenceAdFile(file);
  }

  const productStyleOptions = [
    {
      id: "product_promo",
      title: m.wizard.pathQuickTitle,
      desc: m.wizard.pathQuickVideoDesc,
    },
    {
      id: "reference_reel",
      title: m.wizard.pathReferenceVideoTitle,
      desc: m.wizard.pathReferenceVideoDesc,
    },
  ] as const;

  const conceptStyleOptions = [
    {
      id: "creative_video",
      title: m.wizard.visualStyles["creative-video"].title,
      desc: m.wizard.visualStyles["creative-video"].description,
    },
    {
      id: "brand_video",
      title: m.wizard.visualStyles["brand-video"].title,
      desc: m.wizard.visualStyles["brand-video"].description,
    },
    {
      id: "reference_reel",
      title: m.wizard.pathReferenceVideoTitle,
      desc: m.wizard.pathReferenceVideoDesc,
    },
  ] as const;

  const styleOptions = isConcept ? conceptStyleOptions : productStyleOptions;

  const setupHint = isUgc
    ? pv.ugcHint
    : isReference
      ? pv.referenceHint
      : isConcept
        ? showCreativeBrief
          ? pv.conceptCreativeHint
          : showBrandWebsite
            ? pv.conceptBrandHint
            : pv.conceptHint
        : isQuickAssistant
          ? pv.assistantHint
          : pv.hint;

  const tips = isConcept
    ? [pv.conceptTip1, pv.conceptTip2, pv.conceptTip3]
    : isReference
      ? [pv.refTip1, pv.refTip2, pv.tip3]
      : isUgc
        ? [pv.ugcTip1, pv.ugcTip2, pv.tip3]
        : isQuickAssistant
          ? [pv.assistantTip1, pv.assistantTip2, pv.tip3]
          : [pv.tip1, pv.tip2, pv.tip3];

  const generateBlock = (
    <>
      {generateBlockMessage ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
          {generateBlockMessage}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generateDisabled}
        className="pv-generate-btn"
      >
        {generateLabel ?? (isUgc ? pv.ugcContinueLabel : m.wizard.generateVideoBtn)}
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );

  return (
    <div className="pv-page">
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />
      <PhaseStepper phases={m.start.phases} activeIndex={2} />

      <div className="mt-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {pv.titleBefore}{" "}
          <span className="relative inline-block text-violet-600">
            {pv.titleAccent}
            <span
              className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-violet-400/70"
              aria-hidden
            />
          </span>
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{setupHint}</p>

        <div className="pv-layout">
          <div className="pv-stack">
            <section className="pv-card">
              <div className="pv-card-title-row">
                <span className="pv-card-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className="pv-card-title">{pv.stylePickerTitle}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{pv.stylePickerHint}</p>
                </div>
              </div>
              <div className="pv-style-grid">
                {styleOptions.map((opt) => {
                  const selected = activeSubpath === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onPickVideoSubpath?.(opt.id)}
                      className={`pv-output-card${selected ? " is-selected" : ""}`}
                    >
                      {selected ? (
                        <span className="pv-check" aria-hidden>
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                      <div className="pv-output-copy pr-6">
                        <strong>{opt.title}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="pv-card">
              <div className="pv-card-title-row mb-3">
                <span className="pv-card-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16v12H4z" strokeLinejoin="round" />
                    <path d="M8 7V5h8v2" strokeLinecap="round" />
                  </svg>
                </span>
                <h3 className="pv-card-title">{pv.contentTitle}</h3>
              </div>
              <div className="pv-field-grid">
                {isConcept ? (
                  <label className="sm:col-span-2">
                    <span className="pv-label">
                      {pv.conceptTopicLabel}
                      <span className="pv-label-req" aria-hidden>
                        *
                      </span>
                    </span>
                    <input
                      className="pv-input"
                      value={wizard.conceptIdea}
                      onChange={(e) => wizard.setConceptIdea(e.target.value)}
                      placeholder={m.microWizard.conceptTopicPlaceholder}
                    />
                  </label>
                ) : (
                  <label>
                    <span className="pv-label">
                      {m.wizard.productLabelRequired}
                      <span className="pv-label-req" aria-hidden>
                        *
                      </span>
                    </span>
                    <input
                      className="pv-input"
                      value={wizard.product}
                      onChange={(e) => wizard.setProduct(e.target.value)}
                      placeholder={m.wizard.productPlaceholder}
                    />
                  </label>
                )}
                <label className={isConcept ? "sm:col-span-2" : undefined}>
                  <span className="pv-label">
                    {pv.hookLabel}
                    {!showCreativeBrief && !isUgc ? (
                      <span className="pv-label-req" aria-hidden>
                        *
                      </span>
                    ) : (
                      <span className="pv-label-opt">{pv.extraOptional}</span>
                    )}
                  </span>
                  <input
                    className="pv-input"
                    value={wizard.headline}
                    onChange={(e) => wizard.setHeadline(e.target.value)}
                    placeholder={m.wizard.headlinePlaceholder}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="pv-label">{pv.supportingLabel}</span>
                  <textarea
                    className="pv-textarea"
                    rows={2}
                    value={wizard.subline}
                    onChange={(e) => wizard.setSubline(e.target.value.slice(0, 200))}
                    placeholder={m.wizard.sublinePlaceholder}
                  />
                </label>
                {showCreativeBrief ? (
                  <label className="sm:col-span-2">
                    <span className="pv-label">
                      {m.wizard.creativeBriefLabel}
                      <span className="pv-label-req" aria-hidden>
                        *
                      </span>
                    </span>
                    <textarea
                      className="pv-textarea"
                      rows={5}
                      value={wizard.creativeVideoBrief}
                      onChange={(e) => wizard.setCreativeVideoBrief(e.target.value)}
                      placeholder={m.wizard.creativeBriefPlaceholder}
                    />
                  </label>
                ) : null}
                <label className="sm:col-span-2">
                  <span className="pv-label">
                    {pv.extraLabel}
                    <span className="pv-label-opt">{pv.extraOptional}</span>
                  </span>
                  <textarea
                    className="pv-textarea"
                    rows={2}
                    value={wizard.promptExtra}
                    onChange={(e) => wizard.setPromptExtra(e.target.value)}
                    placeholder={m.wizard.requirementsPlaceholder}
                  />
                </label>
              </div>
            </section>

            {showBrandWebsite ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M3.5 12h17M12 3.5c2.4 2.6 2.4 14.4 0 17M12 3.5c-2.4 2.6-2.4 14.4 0 17" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">{pv.brandTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pv.brandHint}</p>
                  </div>
                </div>
                <BrandWebsitePanel />
              </section>
            ) : null}

            {isReference ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="6" width="16" height="12" rx="2" />
                      <path d="M10 10.5v5l4.5-2.5L10 10.5Z" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">{pv.referenceVideoTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pv.referenceVideoHint}</p>
                  </div>
                </div>
                <input
                  id={refVideoInputId}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="sr-only"
                  onChange={onRefVideoFile}
                />
                {refVideoName ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-300 bg-violet-50/70 px-3 py-2.5">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-800">{refVideoName}</p>
                    <div className="flex shrink-0 gap-2">
                      <label
                        htmlFor={refVideoInputId}
                        className="cursor-pointer text-xs font-semibold text-violet-700"
                      >
                        {m.wizard.uploadChange}
                      </label>
                      <button
                        type="button"
                        onClick={() => wizard.onReferenceAdFile(null)}
                        className="text-xs font-semibold text-slate-500"
                      >
                        {pv.referenceRemove}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor={refVideoInputId}
                    className="flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/70 px-3 text-center text-sm font-semibold text-violet-700 hover:bg-violet-50"
                  >
                    {pv.referenceUploadCta}
                  </label>
                )}
              </section>
            ) : null}

            {showProductPhoto ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
                      <circle cx="9" cy="10" r="1.6" />
                      <path d="m7.5 16.5 3.2-3.4 2.4 2.3 2.6-3.2 3.3 4.3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">
                      {isConcept ? pv.conceptPhotoTitle : pv.productPhotoTitle}
                      {!photoRequired ? (
                        <span className="pv-label-opt font-medium">{pv.extraOptional}</span>
                      ) : null}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isConcept
                        ? pv.conceptPhotoHint
                        : isUgc
                          ? pv.ugcPhotoHint
                          : isReference
                            ? pv.productPhotoWithRefHint
                            : pv.productPhotoHint}
                    </p>
                  </div>
                </div>
                <input
                  id={mainInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onMainFile}
                />
                <div className="flex flex-wrap gap-2.5">
                  {mainThumb ? (
                    <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-violet-400 ring-1 ring-violet-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mainThumb.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => wizard.onProductPhotoSelected(null)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-[10px] text-white"
                        aria-label={m.wizard.uploadChange}
                      >
                        ×
                      </button>
                      <label
                        htmlFor={mainInputId}
                        className="absolute inset-x-0 bottom-0 cursor-pointer bg-slate-900/55 py-0.5 text-center text-[9px] font-semibold text-white"
                      >
                        {m.wizard.uploadChange}
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor={mainInputId}
                      className="flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/70 px-1 text-center text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                    >
                      {pv.dragDrop}
                    </label>
                  )}
                </div>
              </section>
            ) : null}

            {isQuickAssistant ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">{pv.assistantTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pv.assistantBody}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={wizard.planProductVideoBusy || !wizard.productPhoto}
                  onClick={() => void wizard.planProductVideo()}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {wizard.planProductVideoBusy
                    ? m.wizard.planProductVideoBusy
                    : m.wizard.planProductVideoBtn}
                </button>
                {wizard.productVideoPlan ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {wizard.productVideoPlan.productSummary}
                    </p>
                    {wizard.productVideoPlan.imageRoles?.map((role) => (
                      <p key={role.imageIndex} className="text-xs text-slate-600">
                        <span className="font-semibold text-violet-700">@Image{role.imageIndex}</span>{" "}
                        {role.role}
                      </p>
                    ))}
                    {wizard.videoPromptPlanNote ? (
                      <p className="text-xs leading-relaxed text-violet-900/80">
                        {wizard.videoPromptPlanNote}
                      </p>
                    ) : null}
                    {wizard.videoPrompt ? (
                      <textarea
                        value={wizard.videoPrompt}
                        onChange={(e) => wizard.setVideoPrompt(e.target.value)}
                        rows={5}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700"
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">{pv.assistantNeedPlan}</p>
                )}
              </section>
            ) : null}

            {showConceptAiPlan ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">{pv.conceptPlanTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pv.conceptPlanBody}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={
                    wizard.planVideoPromptBusy ||
                    (showCreativeBrief &&
                      !wizard.creativeVideoBrief.trim() &&
                      !wizard.headline.trim())
                  }
                  onClick={() => void wizard.planAiVideoPrompt()}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {wizard.planVideoPromptBusy
                    ? m.wizard.planVideoPromptBusy
                    : m.wizard.planVideoPromptBtn}
                </button>
                {wizard.videoPrompt ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-3">
                    {wizard.videoPromptPlanNote ? (
                      <p className="text-xs leading-relaxed text-violet-900/80">
                        {wizard.videoPromptPlanNote}
                      </p>
                    ) : null}
                    <textarea
                      value={wizard.videoPrompt}
                      onChange={(e) => wizard.setVideoPrompt(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">{pv.conceptPlanNeed}</p>
                )}
              </section>
            ) : null}

            {!isUgc ? (
              <section className="pv-card">
                <div className="pv-card-title-row mb-3">
                  <span className="pv-card-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="6" width="16" height="12" rx="2" />
                      <path d="M10 10.5v5l4.5-2.5L10 10.5Z" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="pv-card-title">{pv.settingsTitle}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{pv.settingsHint}</p>
                  </div>
                </div>
                <VideoSettingsPanel
                  compact
                  setup
                  accent="violet"
                  value={wizard.videoSettings}
                  onChange={wizard.setVideoSettings}
                />
                <p className="pv-cost mt-3">
                  {pv.costLabel.replace("{n}", String(tokenEstimate))}
                </p>
              </section>
            ) : (
              <section className="pv-card">
                <p className="text-sm leading-relaxed text-slate-600">{pv.ugcNextNote}</p>
              </section>
            )}
          </div>

          <aside className="pv-tip-wrap">
            <div className="pv-tip-card">
              <div className="pv-tip-head">
                <span className="pv-tip-head-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 18h6M10 21h4" strokeLinecap="round" />
                    <path
                      d="M12 3a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.2 1.1 2.1h4.4c.1-.9.5-1.6 1.1-2.1A5.5 5.5 0 0 0 12 3Z"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="text-sm font-bold text-violet-800">{pv.tipTitle}</p>
              </div>
              <div className="mt-3.5 space-y-3.5">
                {tips.map((tip) => (
                  <div key={tip.title} className="flex gap-2.5">
                    <span className="pv-tip-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{tip.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{tip.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pv-secure">
              <span className="pv-secure-icon" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.85">
                  <path d="M12 3.2 19 6.4v5.1c0 4.35-2.95 8.15-7 9.2-4.05-1.05-7-4.85-7-9.2V6.4L12 3.2Z" />
                </svg>
              </span>
              <p className="text-xs leading-relaxed text-slate-600">{pv.secureNote}</p>
            </div>
            {onGenerate ? <div className="pv-desktop-generate flex flex-col gap-2.5">{generateBlock}</div> : null}
          </aside>
        </div>

        {onGenerate ? <div className="pv-mobile-cta">{generateBlock}</div> : null}
      </div>
    </div>
  );
}

