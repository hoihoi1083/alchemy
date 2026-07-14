"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { useWizardMicroStep } from "@/hooks/useWizardMicroStep";
import { MicroStepRenderer } from "@/components/studio/micro-wizard/MicroStepRenderer";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { referenceAnalyzeReady } from "@/components/studio/micro-wizard/ReferenceAnalyzeWaitPanel";
import type { PromotionMode } from "@/lib/promotion-mode";

type Props = {
  promotionMode: PromotionMode;
};

export function MicroWizard({ promotionMode }: Props) {
  const wizard = useWizard();
  const micro = useWizardMicroStep(wizard, promotionMode);
  const { m } = useLocale();
  const mw = m.microWizard;

  const {
    currentStep,
    currentId,
    blockReason,
    goNext,
    goBack,
    skipStep,
    goClassic,
    isSkippable,
    canGoBack,
  } = micro;

  const analyzeReady =
    (currentId === "wait.reference_analyze" || currentId === "wait.research_apply") &&
    referenceAnalyzeReady(wizard);

  const continueLabel =
    currentId === "shortcut.ship_it"
      ? m.wizard.shipItRunBtn
      : currentId === "video.generate"
        ? m.wizard.generateVideoBtn
        : currentId === "image.generate"
          ? m.wizard.generateImageBtn
          : mw.continue;

  const blockMessage = blockReason
    ? (mw.blockReasons[blockReason as keyof typeof mw.blockReasons] ?? blockReason)
    : null;

  const readyHint = analyzeReady ? mw.referenceAnalyzeTapContinue : null;

  const navButtons = (
    <>
      <button
        type="button"
        onClick={goBack}
        disabled={!canGoBack}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
      >
        {m.wizard.back}
      </button>
      <div className="flex flex-wrap gap-2">
        {isSkippable ? (
          <button
            type="button"
            onClick={skipStep}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
          >
            {mw.skip}
          </button>
        ) : null}
        <button
          type="button"
          onClick={goNext}
          disabled={Boolean(blockReason)}
          className={`rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 ${
            analyzeReady
              ? "bg-emerald-600 ring-4 ring-emerald-300/50 animate-pulse"
              : "bg-emerald-600"
          }`}
        >
          {continueLabel}
        </button>
      </div>
    </>
  );

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      {currentStep ? (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {mw.progress
              .replace("{current}", String(currentStep.index))
              .replace("{total}", String(currentStep.estimatedTotal))}
          </span>
          <button
            type="button"
            onClick={goClassic}
            className="text-cyan-700 underline-offset-2 hover:underline"
          >
            {mw.classicLink}
          </button>
        </div>
      ) : null}

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 transition-all"
          style={{
            width: currentStep
              ? `${(currentStep.index / Math.max(currentStep.estimatedTotal, 1)) * 100}%`
              : "0%",
          }}
        />
      </div>

      {currentId ? <MicroStepRenderer micro={micro} stepId={currentId} /> : null}

      {wizard.error ? (
        <WizardErrorBanner
          message={wizard.error}
          variant="light"
          onDismiss={() => wizard.setError(null)}
        />
      ) : null}

      {readyHint ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-900">
          {readyHint}
        </p>
      ) : null}

      {blockMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {blockMessage}
        </p>
      ) : null}

      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">{navButtons}</div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">{navButtons}</div>
      </div>

      <p className="hidden text-center text-[11px] text-slate-400 md:block">
        {mw.footerHint}{" "}
        <Link href="/studio?wizard=classic" className="text-cyan-700 hover:underline">
          {mw.classicLink}
        </Link>
      </p>
    </div>
  );
}
