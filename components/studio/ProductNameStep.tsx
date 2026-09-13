"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { setupContentPhaseIndex, studioPhasesForMode } from "@/lib/studio-phases";

type Props = {
  value: string;
  onChange: (value: string) => void;
  showPhaseStepper?: boolean;
  onSelectPhaseIndex?: (index: number) => void;
  /** Physical product vs concept/service naming — same layout, different copy. */
  variant?: "product" | "concept";
};

const PANEL_CSS = `
.pn-page { background: #ffffff; color: #0f172a; }
.pn-phase-rail {
  position: relative; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.35rem; max-width: 1180px; margin: 0 auto; padding: 1rem 0.85rem 1.15rem;
}
.pn-phase-line {
  position: absolute; top: calc(1rem + 16px); left: calc(0.85rem + 16px); right: calc(0.85rem + 16px);
  border-top: 2px dotted #cbd5e1; z-index: 0; pointer-events: none;
}
.pn-phase-item {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem; flex: 1 1 0; min-width: 0; text-align: center;
}
.pn-phase-dot--active { background: #6c3bff !important; color: #fff !important; box-shadow: 0 0 0 4px rgba(108,59,255,0.16); }
.pn-phase-dot--done { background: #6c3bff !important; color: #fff !important; }
.pn-phase-dot--idle { background: #f1f5f9 !important; color: #94a3b8 !important; }
.pn-phase-label { font-size: 11px; line-height: 1.25; max-width: 7.5rem; }
@media (max-width: 639px) {
  .pn-phase-label { display: none; }
  .pn-phase-item.is-active .pn-phase-label {
    display: block; font-weight: 600; color: #5b2fe0;
  }
}
.pn-panel {
  margin-top: 0.75rem;
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}
.pn-panel-body {
  padding: 1.25rem 1.05rem 1.35rem;
}
.pn-header { max-width: 40rem; }
.pn-field {
  margin-top: 1.15rem;
  max-width: 40rem;
  display: flex; flex-direction: column; gap: 0.95rem;
  border-radius: 1.1rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 1.15rem 1.05rem 1.2rem;
  box-shadow: 0 1px 2px rgba(15,23,42,0.03);
}
.pn-field-label-row {
  display: flex; align-items: flex-start; gap: 0.75rem;
}
.pn-field-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.35rem; height: 2.35rem; flex-shrink: 0;
  border-radius: 0.75rem; background: #ede9fe; color: #5b2fe0;
}
.pn-input {
  width: 100%; border-radius: 0.95rem; border: 1.5px solid #e2e8f0;
  background: #fff; padding: 0.95rem 1.05rem; font-size: 16px; line-height: 1.35;
  color: #0f172a; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.pn-input:focus {
  border-color: #6c3bff; box-shadow: 0 0 0 4px rgba(108,59,255,0.12);
}
.pn-input::placeholder { color: #94a3b8; }
.pn-examples {
  padding-top: 0.15rem;
  border-top: 1px solid #f1f5f9;
}
.pn-example {
  display: inline-flex; align-items: center; border-radius: 9999px;
  border: 1px solid #ddd6fe; background: #f5f3ff; padding: 0.4rem 0.85rem;
  font-size: 12px; font-weight: 600; color: #5b2fe0;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.pn-example:hover { background: #ede9fe; border-color: #c4b5fd; }
.pn-example.is-on {
  background: #6c3bff; border-color: #6c3bff; color: #fff;
}
@media (max-width: 639px) {
  .pn-phase-rail { padding: 0.85rem 0.5rem 0.95rem; }
  .pn-phase-line { left: calc(0.5rem + 16px); right: calc(0.5rem + 16px); top: calc(0.85rem + 16px); }
  .pn-panel { margin-top: 0.55rem; border-radius: 1rem; }
  .pn-panel-body { padding: 1rem 0.85rem 1.1rem; }
  .pn-field { padding: 0.95rem 0.85rem 1rem; border-radius: 1rem; }
}
@media (min-width: 640px) {
  .pn-input { font-size: 15px; }
}
@media (min-width: 768px) {
  .pn-panel-body { padding: 1.45rem 1.5rem 1.55rem; }
  .pn-field { padding: 1.25rem 1.25rem 1.3rem; }
}
`;

function PhaseStepper({
  phases,
  activeIndex,
  onSelectIndex,
}: {
  phases: readonly string[];
  activeIndex: number;
  onSelectIndex?: (index: number) => void;
}) {
  return (
    <nav aria-label="Progress" className="border-b border-slate-100">
      <ol className="pn-phase-rail">
        <span className="pn-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          const clickable = Boolean(onSelectIndex) && done;
          return (
            <li
              key={label}
              className={`pn-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              {clickable ? (
                <button
                  type="button"
                  className="flex w-full cursor-pointer flex-col items-center gap-[0.45rem] rounded-lg text-center outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400"
                  onClick={() => onSelectIndex?.(i)}
                  aria-label={`Go back to ${label}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold pn-phase-dot--done">
                    ✓
                  </span>
                  <span className="pn-phase-label text-slate-500 hover:text-violet-700">
                    {label}
                  </span>
                </button>
              ) : (
                <>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      active
                        ? "pn-phase-dot--active"
                        : done
                          ? "pn-phase-dot--done"
                          : "pn-phase-dot--idle"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`pn-phase-label ${
                      active ? "font-semibold text-violet-700" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ProductNameStep({
  value,
  onChange,
  showPhaseStepper = true,
  onSelectPhaseIndex,
  variant = "product",
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const pn =
    variant === "concept" ? m.microWizard.conceptNameStep : m.microWizard.productNameStep;
  const trimmed = value.trim();
  const isConcept = variant === "concept";

  return (
    <div className="pn-page -mx-1 sm:mx-0">
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />

      {showPhaseStepper ? (
        <PhaseStepper
          phases={studioPhasesForMode(m.start, wizard.workflowMode)}
          activeIndex={setupContentPhaseIndex()}
          onSelectIndex={onSelectPhaseIndex}
        />
      ) : null}

      <div className="pn-panel">
        <div className="pn-panel-body">
          <div className="pn-header">
            <p className="text-[13px] font-bold tracking-[0.14em] text-violet-600 sm:text-[14px]">
              {pn.stepEyebrow}
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {pn.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{pn.hint}</p>
          </div>

          <div className="pn-field">
            <div className="pn-field-label-row">
              <span className="pn-field-icon" aria-hidden>
                {isConcept ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18h6" />
                    <path d="M10 21h4" />
                    <path d="M12 3a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.2 1.1 2V16h4.4v-1.1c.1-.8.5-1.5 1.1-2A5.5 5.5 0 0 0 12 3Z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 3.5h6l.8 2.2H8.2L9 3.5Z" />
                    <path d="M8 5.7h8l1.2 14.1a1 1 0 0 1-1 1.1H7.8a1 1 0 0 1-1-1.1L8 5.7Z" />
                    <path d="M10 10.5h4M10 14h4" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-semibold text-slate-900">{pn.label}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{pn.labelHint}</p>
              </div>
            </div>

            <label className="block">
              <span className="sr-only">{pn.label}</span>
              <input
                data-coach-id={isConcept ? "coach-concept-idea" : "coach-product-name"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={pn.placeholder}
                autoComplete="off"
                className="pn-input"
              />
            </label>

            <div className="pn-examples">
              <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {pn.examplesLabel}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pn.examples.map((example) => {
                  const on = trimmed === example;
                  return (
                    <button
                      key={example}
                      type="button"
                      className={`pn-example${on ? " is-on" : ""}`}
                      onClick={() => onChange(example)}
                    >
                      {example}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
