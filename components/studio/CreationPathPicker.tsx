"use client";

import { useEffect, useRef, useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import { canUseStoryboard, minPlanForFeature } from "@/lib/billing/plan-gates";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { creationPathPhaseIndex, studioPhasesForMode } from "@/lib/studio-phases";

type Props = {
  value: WorkflowMode | null;
  onChange: (mode: WorkflowMode) => void;
  /** Show the /start-style phase rail (Setup active). */
  showPhaseStepper?: boolean;
  /** Click a completed phase to go back. */
  onSelectPhaseIndex?: (index: number) => void;
};

const PATH_MEDIA: Record<
  WorkflowMode,
  { kind: "image" | "video"; src: string; poster?: string }
> = {
  "image-only": {
    kind: "image",
    src: "/images/landing/start-path-images-only.png?v=9",
  },
  "video-only": {
    kind: "video",
    src: "/images/landing/start-path-videos-only.mp4?v=9",
    poster: "/images/landing/start-path-videos-only-poster.png?v=9",
  },
  combined: {
    kind: "video",
    src: "/images/landing/start-path-combined.mp4?v=11",
    poster: "/images/landing/start-path-combined-poster.png?v=11",
  },
};

/** Soft purple badge icons under the preview image. */
function PathPreviewVideo({
  src,
  poster,
}: {
  src: string;
  poster?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    const tryPlay = () => {
      void el.play().catch(() => {
        /* autoplay can be blocked until gesture — poster still shows storyboard */
      });
    };
    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    return () => el.removeEventListener("loadeddata", tryPlay);
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="pointer-events-none"
      aria-hidden
    />
  );
}

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
  position: relative; display: flex; flex-direction: column; gap: 0.55rem;
  width: 100%; min-width: 0; height: auto; padding: 0.85rem;
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
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0.85rem;
  background: #f8fafc;
}
.path-card-preview img,
.path-card-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
.path-scene-badge {
  position: absolute; left: 0.5rem; bottom: 0.5rem; z-index: 2;
  display: inline-flex; align-items: center; max-width: calc(100% - 1rem);
  padding: 0.28rem 0.55rem; border-radius: 9999px;
  background: rgba(15, 23, 42, 0.78); color: #fff;
  font-size: 11px; font-weight: 700; line-height: 1.2;
  letter-spacing: 0.01em; backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
}
.path-type-card.is-selected .path-scene-badge {
  background: rgba(108, 59, 255, 0.92);
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
@media (min-width: 768px) {
  .path-select-grid { gap: 1rem; grid-template-columns: 1fr 1fr 1fr; }
}
/* Desktop: three equal path cards fill the row. */
@media (min-width: 1024px) {
  .path-panel-body { padding: 1.35rem 1.5rem 1.5rem; }
  .path-select-grid { grid-template-columns: 1fr 1fr 1fr; gap: 1.1rem; }
}
`;

const MODES: WorkflowMode[] = ["image-only", "video-only", "combined"];

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
      <ol className="path-phase-rail">
        <span className="path-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          const clickable = Boolean(onSelectIndex) && done;
          return (
            <li
              key={label}
              className={`path-phase-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              {clickable ? (
                <button
                  type="button"
                  className="flex w-full cursor-pointer flex-col items-center gap-[0.45rem] rounded-lg text-center outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400"
                  onClick={() => onSelectIndex?.(i)}
                  aria-label={`Go back to ${label}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      done ? "path-phase-dot--done" : "path-phase-dot--idle"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="path-phase-label text-slate-500 hover:text-violet-700">
                    {label}
                  </span>
                </button>
              ) : (
                <>
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
                </>
              )}
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
  onSelectPhaseIndex,
}: Props) {
  const { m } = useLocale();
  const cp = m.wizard.creationPath;
  const modes = m.wizard.workflowModes;
  const { plan, planReady } = useUserPlanEntitlements();
  // Loading ≠ locked: never show "Pro+" until /api/me returns (avoids false-gating paid users).
  const storyboardLoading = !planReady;
  const storyboardAllowed = planReady && canUseStoryboard(plan);
  const [storyboardGateOpen, setStoryboardGateOpen] = useState(false);

  return (
    <div className="path-page -mx-1 sm:mx-0">
      <style dangerouslySetInnerHTML={{ __html: PATH_CSS }} />

      {showPhaseStepper ? (
        <PhaseStepper
          phases={studioPhasesForMode(m.start, value)}
          activeIndex={creationPathPhaseIndex()}
          onSelectIndex={onSelectPhaseIndex}
        />
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

          <div className="path-select-grid" data-coach-id="coach-workflow-mode">
            {MODES.map((id) => {
              const copy = modes[id];
              const selected = value === id;
              const modeLocked = id === "combined" && !storyboardAllowed && !storyboardLoading;
              const modeLoading = id === "combined" && storyboardLoading;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    // Image/video stay selectable immediately.
                    if (id === "combined" && storyboardLoading) return;
                    if (modeLocked) {
                      setStoryboardGateOpen(true);
                      return;
                    }
                    onChange(id);
                  }}
                  className={`path-type-card ${selected ? "is-selected" : ""}${
                    modeLocked || modeLoading ? " opacity-90" : ""
                  }`}
                  aria-pressed={selected}
                  aria-disabled={modeLocked || modeLoading}
                  style={
                    modeLocked || modeLoading
                      ? { borderStyle: "dashed", borderColor: "#cbd5e1" }
                      : undefined
                  }
                >
                  <div className="path-card-preview">
                    <span className="path-type-check" aria-hidden>
                      ✓
                    </span>
                    {PATH_MEDIA[id].kind === "video" ? (
                      <PathPreviewVideo
                        src={PATH_MEDIA[id].src}
                        poster={PATH_MEDIA[id].poster}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={PATH_MEDIA[id].src} alt="" />
                    )}
                    {"sceneBadge" in copy && copy.sceneBadge ? (
                      <span className="path-scene-badge">{copy.sceneBadge}</span>
                    ) : null}
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
                      {modeLoading ? (
                        <span className="ml-1.5 text-[11px] font-semibold text-slate-500">
                          {m.account.checkingPlan}
                        </span>
                      ) : modeLocked ? (
                        <span className="ml-1.5 text-[11px] font-semibold text-amber-800">
                          {m.pricing.plans.pro.name}+
                        </span>
                      ) : null}
                    </h3>
                    <p
                      className={`mt-1.5 text-[12px] leading-snug sm:text-[13px] ${
                        selected ? "text-violet-600/90" : "text-slate-500"
                      }`}
                    >
                      {copy.cardDescription}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="w-full text-[11px] font-semibold text-slate-400">
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
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <PlanGateDialog
        open={storyboardGateOpen}
        onClose={() => setStoryboardGateOpen(false)}
        requiredPlan={minPlanForFeature("storyboard")}
        featureLabel={modes.combined.title}
      />
    </div>
  );
}
