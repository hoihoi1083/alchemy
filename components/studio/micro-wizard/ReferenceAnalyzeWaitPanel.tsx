"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { SetupReferenceSection } from "@/components/studio/SetupReferenceSection";

/** Shared UI for wait.research_apply + wait.reference_analyze. */
export function ReferenceAnalyzeWaitPanel() {
  const { m } = useLocale();
  const mw = m.microWizard;
  const wizard = useWizard();

  const analyzeDone =
    Boolean(wizard.userReferenceBrief) || Boolean(wizard.referenceAnalyzeNote);
  const waitingForRef =
    !wizard.imageRefPhoto && Boolean(wizard.promptExtra?.trim());
  const analyzePending =
    (Boolean(wizard.imageRefPhoto) || waitingForRef) && !analyzeDone;
  const analyzeActive = wizard.referenceAnalyzeBusy || analyzePending;

  return (
    <>
      <SetupReferenceSection />
      {waitingForRef && !wizard.imageRefPhoto ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
          <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          {mw.referenceLoadingHint}
        </div>
      ) : null}
      {analyzeActive ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
          <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          {m.wizard.referenceBriefAnalyzing}
        </div>
      ) : null}
      {analyzeDone && !wizard.referenceAnalyzeBusy ? (
        <div className="mt-4 space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-2 ring-emerald-200/80">
          <p className="font-semibold">{mw.referenceAnalyzeReadyTitle}</p>
          <p className="text-xs text-emerald-800">
            {wizard.referenceAnalyzeNote ?? m.wizard.referenceBriefAnalyzed}
          </p>
          <p className="text-xs font-medium text-emerald-700">{mw.referenceAnalyzeTapContinue}</p>
        </div>
      ) : null}
    </>
  );
}

export function referenceAnalyzeReady(wizard: {
  userReferenceBrief: unknown;
  referenceAnalyzeNote: string | null;
  referenceAnalyzeBusy: boolean;
}): boolean {
  return (
    (Boolean(wizard.userReferenceBrief) || Boolean(wizard.referenceAnalyzeNote)) &&
    !wizard.referenceAnalyzeBusy
  );
}
