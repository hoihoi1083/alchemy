"use client";

import { useWizard } from "@/components/studio/WizardContext";
import { useLocale } from "@/components/LocaleProvider";
import { isExplosionUnboxStyle, isStoryboardVideoStyle } from "@/lib/visual-styles";

type WizardStepHelpPanelProps = {
  step: "setup" | "video";
};

export function WizardStepHelpPanel({ step }: WizardStepHelpPanelProps) {
  const { m } = useLocale();
  const {
    promotionMode,
    workflowMode,
    visualStyleId,
  } = useWizard();
  const help = m.wizard.stepHelp;

  const title =
    step === "setup" ? help.setupTitle : help.videoTitle;

  const steps: readonly string[] = (() => {
    if (step === "setup") {
      if (isExplosionUnboxStyle(visualStyleId)) return help.setupExplosionUnboxSteps;
      if (promotionMode === "concept" && workflowMode === "video-only") {
        return help.setupConceptVideoSteps;
      }
      if (workflowMode === "video-only") return help.setupVideoOnlySteps;
      if (workflowMode === "image-only") return help.setupImageOnlySteps;
      return help.setupCombinedSteps;
    }
    if (isExplosionUnboxStyle(visualStyleId)) return help.videoExplosionUnboxSteps;
    if (isStoryboardVideoStyle(visualStyleId)) return help.videoStoryboardSteps;
    if (promotionMode === "concept" && workflowMode === "video-only") {
      return help.videoConceptSteps;
    }
    if (workflowMode === "video-only") return help.videoPhysicalSteps;
    return help.videoCombinedSteps;
  })();

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{help.noChatCoachNote}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-300">
        {steps.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
