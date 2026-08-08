"use client";

import { Fragment } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { studioPhasesForMode } from "@/lib/studio-phases";

type Props = {
  value: WorkflowMode | null;
  onChange: (mode: WorkflowMode) => void;
  /** Show the /start-style phase rail (Setup active). */
  showPhaseStepper?: boolean;
};

const PATH_IMAGES: Record<WorkflowMode, string> = {
  "image-only": "/images/landing/start-path-images-only.png?v=4",
  "video-only": "/images/landing/start-path-videos-only.png?v=4",
  combined: "/images/landing/start-path-combined.png?v=4",
};

/** Soft purple badge icons under the preview image. */
function PathHeroIcon({ mode }: { mode: WorkflowMode }) {
  if (mode === "image-only") {
    return (
      <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" aria-hidden>
        <rect x="8" y="12" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M12 30l7.5-8.5a2 2 0 0 1 3 0L28 28l2.5-2.8a2 2 0 0 1 3.1.1L36 30"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="17.5" cy="19" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  if (mode === "video-only") {
    return (
      <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.2" />
        <path d="M21 18.5v11l10-5.5-10-5.5Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" aria-hidden>
      <rect x="7" y="11" width="28" height="22" rx="3.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M11 28l6-7a1.8 1.8 0 0 1 2.7 0L25 27l2-2.2a1.8 1.8 0 0 1 2.8.1L33 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="17.5" r="1.8" fill="currentColor" />
      <circle cx="34" cy="32" r="8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M32 28.8v6.4l5.5-3.2-5.5-3.2Z" fill="currentColor" />
    </svg>
  );
}

type NextIconKind = "setup" | "generate" | "image" | "video" | "done";

function NextStepIcon({ kind }: { kind: NextIconKind }) {
  const common = {
    className: "h-6 w-6",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (kind === "setup") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" />
        <path d="M9.5 9h5M9.5 12h5M9.5 15h3" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
        <path d="m6.5 15.5 3.2-3.6a1.2 1.2 0 0 1 1.8 0L14 14.5l1.4-1.5a1.2 1.2 0 0 1 1.8.1L18.5 15.5" />
        <circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "video") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M10.5 9.2v5.6L15.2 12l-4.7-2.8Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "generate") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 3.5 13.2 8l4.3.4-3.3 3 1.1 4.3L12 13.5 8.7 15.7l1.1-4.3-3.3-3L10.8 8 12 3.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="m8.8 12.2 2.2 2.2 4.2-4.4" />
    </svg>
  );
}

const PATH_CSS = `
.path-page { background: #ffffff; color: #0f172a; }
.path-phase-rail {
  position: relative; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.35rem; max-width: 1180px; margin: 0 auto; padding: 1rem 0.85rem 1.15rem;
}
.path-phase-line {
  position: absolute; top: calc(1rem + 16px); left: calc(0.85rem + 16px); right: calc(0.85rem + 16px);
  border-top: 2px dotted #cbd5e1; z-index: 0; pointer-events: none;
}
.path-phase-item {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem; flex: 1 1 0; min-width: 0; text-align: center;
}
.path-phase-dot--active { background: #6c3bff !important; color: #fff !important; box-shadow: 0 0 0 4px rgba(108,59,255,0.16); }
.path-phase-dot--idle { background: #f1f5f9 !important; color: #94a3b8 !important; }
.path-phase-label { font-size: 11px; line-height: 1.25; max-width: 7.5rem; }
.path-phase-dot--done { background: #6c3bff !important; color: #fff !important; }
@media (max-width: 639px) {
  .path-phase-label { display: none; }
  /* Show the active step label only (not a fixed nth-child — line span shifts indices). */
  .path-phase-item.is-active .path-phase-label {
    display: block; font-weight: 600; color: #5b2fe0;
  }
}
.path-panel {
  border-radius: 1.25rem; border: 1px solid #e2e8f0; background: #fff;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.path-panel-body { padding: 1.15rem 1rem 1.25rem; }
.path-select-grid {
  display: grid; gap: 0.85rem; align-items: stretch; margin-top: 1rem;
  grid-template-columns: 1fr;
}
.path-type-card {
  position: relative; display: flex; flex-direction: column; gap: 0.7rem;
  width: 100%; min-width: 0; height: 100%; padding: 0.85rem;
  border-radius: 1.15rem; border: 2px solid #e2e8f0; background: #fff;
  text-align: left; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.path-type-card:hover {
  border-color: #c4b5fd; box-shadow: 0 10px 28px -16px rgba(76,37,212,0.35);
}
.path-type-card.is-selected {
  border-color: #6c3bff; box-shadow: 0 16px 40px -18px rgba(76,37,212,0.45);
}
.path-type-check {
  position: absolute; top: 0.5rem; right: 0.5rem; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  width: 1.15rem; height: 1.15rem; border-radius: 9999px;
  border: 2px solid rgba(203,213,225,0.95); background: #fff; color: transparent;
  font-size: 9px; font-weight: 800; line-height: 1;
  box-shadow: 0 1px 2px rgba(15,23,42,0.12);
}
.path-type-card.is-selected .path-type-check {
  border-color: #6c3bff; background: #6c3bff; color: #fff;
}
.path-card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 0.85rem;
  background: #f8fafc;
}
.path-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
.path-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.55rem;
  background: #ede9fe;
  color: #5b2fe0;
}
.path-card-icon svg {
  width: 1.15rem !important;
  height: 1.15rem !important;
}
.path-tip-card {
  display: flex; flex-direction: column; min-width: 0; height: 100%;
  border-radius: 1.15rem; border: 1px solid #e2e8f0; background: #fff; padding: 1rem;
}
.path-tip-icon {
  display: flex; align-items: center; justify-content: center;
  width: 2.35rem; height: 2.35rem; border-radius: 9999px;
  background: #ede9fe; color: #5b2fe0; flex-shrink: 0;
}
.path-tip-list {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  margin-top: 0.85rem;
  flex: 1 1 auto;
}
.path-tip-row {
  display: grid;
  grid-template-columns: 2.35rem minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
}
.path-tip-row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 9999px;
  background: #6c3bff;
  color: #fff;
  flex-shrink: 0;
}
.path-tip-row-icon svg {
  width: 1.15rem !important;
  height: 1.15rem !important;
}
.path-tip-star {
  display: flex; align-items: center; justify-content: center;
  width: 1.5rem; height: 1.5rem; margin-top: 0.1rem; border-radius: 9999px;
  background: #6c3bff; color: #fff; flex-shrink: 0; line-height: 0;
}
.path-tip-star svg { width: 0.75rem; height: 0.75rem; display: block; }
.path-next-wrap {
  margin-top: 1.35rem; padding: 1.1rem 1rem 1.15rem;
  border-radius: 1rem; border: 1px solid #ede9fe; background: #faf8ff;
}
.path-next-grid {
  display: grid; gap: 0.85rem; margin-top: 0.9rem;
}
.path-next-step {
  display: grid; grid-template-columns: 3rem minmax(0,1fr); gap: 0.65rem; align-items: center;
}
.path-next-icon {
  display: flex; align-items: center; justify-content: center;
  width: 3rem; height: 3rem; border-radius: 0.85rem;
  background: #ede9fe; color: #5b2fe0; box-sizing: border-box;
}
.path-next-arrow { display: none; color: #6c3bff; }
/* Tablet+: next-step arrows; keep path cards single-column to avoid orphan 3rd card. */
@media (min-width: 768px) {
  .path-select-grid { gap: 1rem; }
  .path-next-grid {
    grid-template-columns: repeat(var(--path-next-cols, 5), minmax(0, 1fr));
    align-items: center;
  }
  .path-next-grid[data-count="3"] { --path-next-cols: 5; grid-template-columns: 1fr auto 1fr auto 1fr; }
  .path-next-grid[data-count="4"] { --path-next-cols: 7; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; }
  .path-next-arrow { display: flex; align-items: center; justify-content: center; }
}
/* Wide tablet / small laptop: 3 equal path cards, tip full-width underneath. */
@media (min-width: 900px) {
  .path-select-grid { grid-template-columns: 1fr 1fr 1fr; }
  .path-tip-card { grid-column: 1 / -1; }
}
/* Desktop: 3 cards + tip sidebar (needs room inside max-w-6xl). */
@media (min-width: 1180px) {
  .path-panel-body { padding: 1.35rem 1.5rem 1.5rem; }
  .path-select-grid { grid-template-columns: 1fr 1fr 1fr minmax(220px, 0.92fr); }
  .path-tip-card { grid-column: auto; }
}
`;

const MODES: WorkflowMode[] = ["image-only", "video-only", "combined"];

function PhaseStepper({
  phases,
  activeIndex,
}: {
  phases: readonly string[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Progress" className="border-b border-slate-100">
      <ol className="path-phase-rail">
        <span className="path-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li
              key={label}
              className={`path-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active
                    ? "path-phase-dot--active"
                    : done
                      ? "path-phase-dot--done"
                      : "path-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`path-phase-label ${
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

export function CreationPathPicker({
  value,
  onChange,
  showPhaseStepper = true,
}: Props) {
  const { m } = useLocale();
  const cp = m.wizard.creationPath;
  const modes = m.wizard.workflowModes;

  const nextSteps =
    value === "image-only"
      ? cp.nextStepsImage
      : value === "video-only"
        ? cp.nextStepsVideo
        : value === "combined"
          ? cp.nextStepsCombined
          : cp.nextStepsUnset;

  const nextSubtitle =
    value === "image-only"
      ? cp.nextSubtitleImage
      : value === "video-only"
        ? cp.nextSubtitleVideo
        : value === "combined"
          ? cp.nextSubtitleCombined
          : cp.nextSubtitleUnset;

  return (
    <div className="path-page -mx-1 sm:mx-0">
      <style dangerouslySetInnerHTML={{ __html: PATH_CSS }} />

      {showPhaseStepper ? (
        <PhaseStepper phases={studioPhasesForMode(m.start, value)} activeIndex={1} />
      ) : null}

      <div className="path-panel mt-3">
        <div className="path-panel-body">
          <p className="text-[14px] font-bold tracking-[0.12em] text-violet-600 sm:text-[15px]">
            {cp.stepEyebrow}
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
            {cp.title}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">{cp.hint}</p>

          <div className="path-select-grid">
            {MODES.map((id) => {
              const copy = modes[id];
              const selected = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={`path-type-card ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                >
                  <div className="path-card-preview">
                    <span className="path-type-check" aria-hidden>
                      ✓
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PATH_IMAGES[id]} alt="" />
                  </div>

                  <div className="path-card-icon" aria-hidden>
                    <PathHeroIcon mode={id} />
                  </div>

                  <div className="min-w-0 pr-1">
                    <h3
                      className={`text-[15px] font-bold leading-snug sm:text-[16px] ${
                        selected ? "text-violet-700" : "text-slate-900"
                      }`}
                    >
                      {copy.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">
                      {copy.cardDescription}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {cp.bestForLabel}
                    </span>
                    {copy.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          selected
                            ? "bg-violet-50 text-violet-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}

            <aside className="path-tip-card">
              <div className="path-tip-icon" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v1.4" />
                  <path d="M5.05 5.05l1 1" />
                  <path d="M2 12h1.4" />
                  <path d="M18.95 5.05l-1 1" />
                  <path d="M20.6 12H22" />
                  <path d="M9 18h6" />
                  <path d="M10 21h4" />
                  <path d="M12 4.8a5.4 5.4 0 0 0-3.2 9.7c.55.45.9 1.1 1 1.85V17h4.4v-.65c.1-.75.45-1.4 1-1.85A5.4 5.4 0 0 0 12 4.8Z" />
                </svg>
              </div>

              <h3 className="mt-2.5 text-[15px] font-bold tracking-tight text-slate-900">
                {cp.tipTitle}
              </h3>

              <div className="path-tip-list">
                {(
                  [
                    { mode: "image-only" as const, body: cp.tipImage },
                    { mode: "video-only" as const, body: cp.tipVideo },
                    { mode: "combined" as const, body: cp.tipCombined },
                  ] as const
                ).map((row) => (
                  <div key={row.mode} className="path-tip-row">
                    <span className="path-tip-row-icon" aria-hidden>
                      <PathHeroIcon mode={row.mode} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-snug text-slate-900">
                        {modes[row.mode].title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                        {row.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3">
                <div className="flex items-start gap-2.5">
                  <span className="path-tip-star" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.5l2.6 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.2l-5.9 3.4 1.6-6.7L2.5 9.4l6.9-.6L12 2.5z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">{cp.tipNote}</p>
                    <p className="mt-1 text-[12px] leading-snug text-slate-500">
                      {cp.tipNoteBody}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="path-next-wrap">
            <h3 className="text-center text-[15px] font-bold text-slate-900 sm:text-left">
              {cp.nextTitle}
            </h3>
            <p className="mt-1 text-center text-sm text-slate-500 sm:text-left">
              {nextSubtitle}
            </p>
            <div className="path-next-grid" data-count={nextSteps.length}>
              {nextSteps.map((step, i) => (
                <Fragment key={`${step.icon}-${step.title}`}>
                  <div className="path-next-step">
                    <div className="path-next-icon">
                      <NextStepIcon kind={step.icon as NextIconKind} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                        {step.body}
                      </p>
                    </div>
                  </div>
                  {i < nextSteps.length - 1 ? (
                    <div className="path-next-arrow" aria-hidden>
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 4.5 12.5 10 7 15.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
