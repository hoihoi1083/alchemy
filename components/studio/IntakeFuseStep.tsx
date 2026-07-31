"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { ContentResearchPanel } from "@/components/content-research/ContentResearchPanel";
import { ConceptWizardPanel } from "@/components/studio/ConceptWizardPanel";
import { useWizard } from "@/components/studio/WizardContext";
import type { ConceptSource } from "@/lib/concept-source-state";
import type { IntakePath } from "@/lib/wizard-micro-steps.types";
import type { WorkflowMode } from "@/lib/workflow-mode";

type TabId = "research" | "direct";

type Props = {
  activeTab: TabId | null;
  onSelectResearch: () => void;
  onSelectDirect: () => void;
  /** Concept mode: Direct tab is Concept assistant. */
  isConcept: boolean;
  workflowMode: WorkflowMode;
  showPhaseStepper?: boolean;
};

const FUSE_CSS = `
.if-page { background: #ffffff; color: #0f172a; }
.if-phase-rail {
  position: relative; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.35rem; max-width: 1180px; margin: 0 auto; padding: 1rem 0.85rem 1.15rem;
}
.if-phase-line {
  position: absolute; top: calc(1rem + 16px); left: calc(0.85rem + 16px); right: calc(0.85rem + 16px);
  border-top: 2px dotted #cbd5e1; z-index: 0; pointer-events: none;
}
.if-phase-item {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem; flex: 1 1 0; min-width: 0; text-align: center;
}
.if-phase-dot--active { background: #7c3aed !important; color: #fff !important; box-shadow: 0 0 0 4px rgba(124,58,237,0.16); }
.if-phase-dot--done { background: #7c3aed !important; color: #fff !important; }
.if-phase-dot--idle { background: #f1f5f9 !important; color: #94a3b8 !important; }
.if-phase-label { font-size: 11px; line-height: 1.25; max-width: 7.5rem; }
@media (max-width: 639px) {
  .if-phase-label { display: none; }
  .if-phase-item.is-active .if-phase-label {
    display: block; font-weight: 600; color: #6d28d9;
  }
  .if-phase-rail { padding: 0.85rem 0.5rem 0.95rem; }
  .if-phase-line { left: calc(0.5rem + 16px); right: calc(0.5rem + 16px); top: calc(0.85rem + 16px); }
  .if-panel { margin-top: 0.65rem; border-radius: 1rem; }
  .if-panel-body { padding: 1rem 0.85rem 1.1rem; }
  .if-main-card, .if-tip-card { padding: 0.85rem; border-radius: 1rem; }
  .if-layout { margin-top: 0.9rem; gap: 0.85rem; }
}
.if-panel {
  border-radius: 1.25rem; border: 1px solid #e2e8f0; background: #fff;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.if-panel-body { padding: 1.15rem 1rem 1.25rem; }
.if-hero {
  display: grid; gap: 0.85rem; align-items: center;
  grid-template-columns: 1fr;
}
.if-hero-copy { min-width: 0; }
.if-hero-art {
  display: none; justify-content: center; align-items: center;
  min-width: 0;
}
.if-hero-art img {
  width: 100%; max-width: 320px; height: auto; object-fit: contain;
  user-select: none; pointer-events: none;
}
.if-layout {
  display: grid; gap: 1rem; margin-top: 1.1rem; align-items: start;
  grid-template-columns: 1fr;
}
.if-main-card {
  display: flex; flex-direction: column; gap: 0.85rem; min-width: 0;
  border-radius: 1.15rem; border: 1px solid #e2e8f0; background: #fff; padding: 1rem;
}
.if-tip-card {
  display: flex; flex-direction: column; min-width: 0; gap: 0;
  border-radius: 1.35rem; border: 1px solid #e9e4ff; background: #f7f5ff;
  padding: 1.15rem 1.1rem 1.2rem;
  box-shadow: 0 10px 28px -22px rgba(91, 33, 182, 0.35);
}
.if-tip-icon {
  display: flex; align-items: center; justify-content: center;
  width: 2.35rem; height: 2.35rem; border-radius: 9999px;
  background: #ede9fe; color: #6d28d9; flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08), 0 8px 18px -10px rgba(124, 58, 237, 0.45);
}
.if-tip-row {
  display: grid; grid-template-columns: 2.1rem minmax(0, 1fr); gap: 0.7rem; align-items: start;
}
.if-tip-feature {
  display: flex; align-items: center; justify-content: center;
  width: 2.1rem; height: 2.1rem; border-radius: 9999px;
  background: #fff; color: #7c3aed; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.35), 0 6px 14px -8px rgba(124, 58, 237, 0.55);
}
.if-tip-feature svg { width: 1rem; height: 1rem; }
.if-tip-secure {
  display: grid; grid-template-columns: 1.5rem minmax(0, 1fr); gap: 0.7rem; align-items: start;
  margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9e4ff;
}
.if-tip-secure-icon {
  display: flex; align-items: center; justify-content: center;
  width: 1.5rem; height: 1.5rem; margin-top: 0.1rem; color: #7c3aed; flex-shrink: 0;
}
.if-tip-bullet {
  display: flex; align-items: center; justify-content: center;
  width: 1.5rem; height: 1.5rem; margin-top: 0.1rem; border-radius: 9999px;
  background: #7c3aed; color: #fff; flex-shrink: 0; line-height: 0;
}
.if-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  width: 100%; border-bottom: 1px solid #e2e8f0; margin: 0 0 0.15rem;
}
.if-tab {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  gap: 0.5rem; width: 100%; padding: 0.75rem 0.5rem 0.9rem; font-size: 14px; font-weight: 600;
  color: #64748b; background: transparent; border: none; border-radius: 0;
  box-shadow: none; transition: color 0.15s ease;
}
.if-tab::after {
  content: ""; position: absolute; left: 12%; right: 12%; bottom: -1px; height: 3px;
  border-radius: 999px; background: transparent;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.if-tab.is-on {
  color: #6d28d9; background: transparent; box-shadow: none;
}
.if-tab.is-on::after {
  background: linear-gradient(90deg, #a78bfa 0%, #7c3aed 50%, #a78bfa 100%);
  box-shadow:
    0 0 0 1px rgba(167, 139, 250, 0.35),
    0 0 10px rgba(124, 58, 237, 0.55),
    0 0 18px rgba(139, 92, 246, 0.35);
}
.if-tab:hover { color: #6d28d9; }
@media (max-width: 639px) {
  .if-tab { font-size: 13px; gap: 0.4rem; padding: 0.7rem 0.35rem 0.85rem; }
  .if-tab::after { left: 8%; right: 8%; }
}
.if-direct-card {
  border-radius: 1rem; border: 1px solid #ede9fe; background: #faf8ff; padding: 1rem;
}
@media (min-width: 768px) {
  .if-panel-body { padding: 1.35rem 1.5rem 1.5rem; }
  .if-hero {
    grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
    gap: 1rem; align-items: center;
  }
  .if-hero-art { display: flex; }
  .if-hero-art img { max-width: 100%; }
  .if-layout {
    grid-template-columns: minmax(0, 4fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
}
@media (min-width: 1024px) {
  .if-hero {
    grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  }
  .if-layout {
    grid-template-columns: minmax(0, 4fr) minmax(0, 1fr);
  }
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
      <ol className="if-phase-rail">
        <span className="if-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li
              key={label}
              className={`if-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active
                    ? "if-phase-dot--active"
                    : done
                      ? "if-phase-dot--done"
                      : "if-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`if-phase-label ${
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

function TipFeatureIcon({ kind }: { kind: "timer" | "globe" | "link" }) {
  if (kind === "timer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="7.5" />
        <path d="M12 9.5v3.7l2.2 1.4" />
        <path d="M9.5 3.8h5" />
      </svg>
    );
  }
  if (kind === "globe") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.2" />
        <path d="M3.8 12h16.4" />
        <path d="M12 3.8c2.3 2.4 3.5 5.1 3.5 8.2s-1.2 5.8-3.5 8.2c-2.3-2.4-3.5-5.1-3.5-8.2s1.2-5.8 3.5-8.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.07 0l1.4-1.4a5 5 0 1 0-7.07-7.07L10.5 5.4" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.4a5 5 0 0 0 7.07 7.07L13.5 18.6" />
    </svg>
  );
}

function TabIcon({ kind }: { kind: "research" | "direct" }) {
  if (kind === "research") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l1.4-1.4a5 5 0 1 0-7.07-7.07L10.5 5.4" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.4a5 5 0 0 0 7.07 7.07L13.5 18.6" />
    </svg>
  );
}

export function IntakeFuseStep({
  activeTab,
  onSelectResearch,
  onSelectDirect,
  isConcept,
  workflowMode,
  showPhaseStepper = true,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const fuse = m.microWizard.intakeFuse;
  const [researchNote, setResearchNote] = useState<string | null>(null);

  const promoteTarget = isConcept
    ? wizard.conceptIdea.trim() || wizard.effectivePromoteName
    : wizard.product;
  const defaultTopic = isConcept
    ? wizard.conceptIdea.trim() || wizard.business.trim() || ""
    : wizard.business.trim() || wizard.product.trim();

  const tipItems = [
    { ...fuse.tip1, icon: "timer" as const },
    { ...fuse.tip2, icon: "globe" as const },
    { ...fuse.tip3, icon: "link" as const },
  ];

  return (
    <div className="if-page -mx-1 sm:mx-0">
      <style dangerouslySetInnerHTML={{ __html: FUSE_CSS }} />

      {showPhaseStepper ? (
        <PhaseStepper phases={m.start.phases} activeIndex={2} />
      ) : null}

      <div className="if-panel mt-3">
        <div className="if-panel-body">
          <div className="if-hero">
            <div className="if-hero-copy">
              <p className="text-[14px] font-bold tracking-[0.12em] text-violet-600 sm:text-[15px]">
                {fuse.stepEyebrow}
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                {isConcept ? fuse.conceptTitle : fuse.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {isConcept ? fuse.conceptHint : fuse.hint}
              </p>
            </div>
            <div className="if-hero-art" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/landing/intake-ai-research-orbit.png"
                alt=""
                width={640}
                height={400}
              />
            </div>
          </div>

          <div className="if-layout">
            <div className="if-main-card">
              <div className="if-tabs" role="tablist" aria-label={fuse.tabsAriaLabel}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "research"}
                  className={`if-tab${activeTab === "research" ? " is-on" : ""}`}
                  onClick={onSelectResearch}
                >
                  <TabIcon kind="research" />
                  {fuse.tabResearch}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "direct"}
                  className={`if-tab${activeTab === "direct" ? " is-on" : ""}`}
                  onClick={onSelectDirect}
                >
                  <TabIcon kind="direct" />
                  {isConcept ? fuse.tabAssistant : fuse.tabDirect}
                </button>
              </div>

              {activeTab === null ? (
                <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
                  {fuse.pickTabHint}
                </p>
              ) : null}

              {activeTab === "research" ? (
                <div className="space-y-2">
                  <ContentResearchPanel
                    compact
                    tone="violet"
                    hidePromotionModeToggle
                    hidePromoteProduct={!isConcept}
                    defaultTopic={defaultTopic}
                    promoteProduct={promoteTarget}
                    onPromoteProductChange={isConcept ? wizard.setConceptIdea : wizard.setProduct}
                    syncTopicFromProduct={false}
                    promotionMode={wizard.promotionMode}
                    market={wizard.promptMarket}
                    workflowMode={workflowMode}
                    wizard={{
                      setHeadline: wizard.setHeadline,
                      setSubline: wizard.setSubline,
                      setOffer: wizard.setOffer,
                      setConceptIdea: wizard.setConceptIdea,
                      setProduct: wizard.setProduct,
                      setPromptExtra: wizard.setPromptExtra,
                      setImageOutputMode: wizard.setImageOutputMode,
                      setImageAspectRatio: wizard.setImageAspectRatio,
                      setCampaignTheme: wizard.setCampaignTheme,
                      selectVisualStyle: wizard.selectVisualStyle,
                      onWorkflowModeChange: wizard.onWorkflowModeChange,
                      setImageRefPhoto: wizard.setImageRefPhoto,
                      setImageCreativeMode: wizard.setImageCreativeMode,
                      onImageInputModeChange: wizard.onImageInputModeChange,
                      setExtraKitPhotos: wizard.setExtraKitPhotos,
                      setReferenceCarouselSlideCount: wizard.setReferenceCarouselSlideCount,
                      setContentResearchApplyRef: wizard.setContentResearchApplyRef,
                      setCinematicSceneCount: wizard.onCinematicSceneCountChange,
                      onVideoCreativeModeChange: wizard.onVideoCreativeModeChange,
                      onReferenceAdFile: wizard.onReferenceAdFile,
                      setError: wizard.setError,
                    }}
                    onApplied={(_angle, _plan, result) => {
                      setResearchNote(result?.message ?? m.studioAssistant.actionApplied);
                      if (result?.refs.videoAttached) wizard.setError(null);
                    }}
                  />
                  {researchNote ? (
                    <p className="text-xs text-emerald-800">{researchNote}</p>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "direct" && !isConcept ? (
                <div className="if-direct-card space-y-3">
                  <h3 className="text-[15px] font-bold text-slate-900">{fuse.directTitle}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-600">{fuse.directBody}</p>
                  <ul className="space-y-2">
                    {fuse.directBullets.map((line) => (
                      <li key={line} className="if-tip-row">
                        <span className="if-tip-bullet" aria-hidden>
                          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                            <path d="M8.2 13.6 4.9 10.3l1.2-1.2 2.1 2.1 5-5.1 1.2 1.2-6.2 6.3Z" />
                          </svg>
                        </span>
                        <p className="text-[13px] text-slate-700">{line}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeTab === "direct" && isConcept ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-slate-600">{fuse.assistantIntro}</p>
                  <ConceptWizardPanel showHeadlineField />
                </div>
              ) : null}
            </div>

            <aside className="if-tip-card">
              <div className="if-tip-icon" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8.2" />
                  <circle cx="12" cy="12" r="3.1" />
                  <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1" />
                  <path d="m16.2 7.8 1.4-1.4" />
                </svg>
              </div>
              <h3 className="mt-2.5 text-[15px] font-bold leading-snug tracking-tight text-slate-900">
                {fuse.tipTitle}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{fuse.tipIntro}</p>
              <div className="mt-4 space-y-3.5">
                {tipItems.map((item) => (
                  <div key={item.title} className="if-tip-row">
                    <span className="if-tip-feature" aria-hidden>
                      <TipFeatureIcon kind={item.icon} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] font-bold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="if-tip-secure">
                <span className="if-tip-secure-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3.2 19 6.4v5.1c0 4.35-2.95 8.15-7 9.2-4.05-1.05-7-4.85-7-9.2V6.4L12 3.2Z" />
                    <path d="m9.2 12 1.9 1.9 3.7-3.8" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900">{fuse.tipSecure.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                    {fuse.tipSecure.body}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helpers for MicroStepRenderer tab wiring. */
export function intakeTabFromPending(args: {
  isConcept: boolean;
  pendingIntakePath?: IntakePath;
  intakePath?: IntakePath | null;
  pendingConceptSource?: ConceptSource;
  conceptSource?: ConceptSource | null;
}): TabId | null {
  const { isConcept, pendingIntakePath, intakePath, pendingConceptSource, conceptSource } = args;
  if (isConcept) {
    const source = pendingConceptSource ?? conceptSource ?? null;
    if (source === "research") return "research";
    if (source === "assistant") return "direct";
  }
  const path = pendingIntakePath ?? intakePath ?? null;
  if (path === "research") return "research";
  if (path === "direct") return "direct";
  return null;
}
