"use client";

import type { ProjectPhase } from "@/lib/project-browse";
import { phaseCompleted, phasesForWorkflow } from "@/lib/project-browse";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import { useLocale } from "@/components/LocaleProvider";

type Props = {
  workflowMode: WorkflowMode;
  currentPhase: ProjectPhase;
  wizard: Pick<
    StudioWizardValue,
    | "imageUrl"
    | "videoUrl"
    | "storyboardScenes"
    | "campaignSlides"
    | "product"
    | "headline"
    | "conceptIdea"
    | "isStoryboardOutput"
  >;
  onSelectPhase: (phase: ProjectPhase) => void;
};

export function ProjectPhaseStepper({
  workflowMode,
  currentPhase,
  wizard,
  onSelectPhase,
}: Props) {
  const { m } = useLocale();
  const L = m.studio.phaseStepper;
  const phases = phasesForWorkflow(workflowMode, {
    storyboardKeyframes:
      workflowMode === "video-only" && wizard.isStoryboardOutput,
  });

  const labelFor = (phase: ProjectPhase): string => {
    if (phase === "setup") return L.setup;
    if (phase === "image") return L.image;
    if (phase === "video") return L.video;
    return L.export;
  };

  return (
    <nav
      aria-label={L.ariaLabel}
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2"
    >
      <ol className="flex min-w-max items-center gap-1">
        {phases.map((phase, i) => {
          const done = phaseCompleted(phase, wizard);
          const active = phase === currentPhase;
          const clickable = done || active;
          return (
            <li key={phase} className="flex items-center gap-1">
              {i > 0 ? (
                <span className="px-0.5 text-slate-300" aria-hidden>
                  ·
                </span>
              ) : null}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (clickable) onSelectPhase(phase);
                }}
                className={
                  active
                    ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    : done
                      ? "rounded-lg px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
                      : "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400"
                }
                aria-current={active ? "step" : undefined}
              >
                {labelFor(phase)}
                {done && !active ? (
                  <span className="ml-1 text-[10px] text-violet-500">✓</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 px-1 text-[11px] text-slate-500">{L.hint}</p>
    </nav>
  );
}
