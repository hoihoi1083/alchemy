"use client";

import type { WorkflowStepKey } from "@/lib/workflow-mode";

type WizardMobileBarProps = {
  stepKey: WorkflowStepKey;
  continueSetupLabel: string;
  setupNextDisabled?: boolean;
  setupNextDisabledReason?: string | null;
  imageFinishLabel: string;
  backLabel: string;
  generateVideoLabel: string;
  phaseVideoLabel: string;
  imageNextDisabled: boolean;
  imageNextDisabledReason?: string | null;
  videoGenerateDisabled: boolean;
  videoGenerateDisabledReason?: string | null;
  videoBusy: boolean;
  onSetupNext: () => void;
  onImageBack: () => void;
  onImageNext: () => void;
  onVideoBack: () => void;
  onGenerateVideo: () => void;
};

export function WizardMobileBar({
  stepKey,
  continueSetupLabel,
  setupNextDisabled = false,
  setupNextDisabledReason,
  imageFinishLabel,
  backLabel,
  generateVideoLabel,
  phaseVideoLabel,
  imageNextDisabled,
  imageNextDisabledReason,
  videoGenerateDisabled,
  videoGenerateDisabledReason,
  videoBusy,
  onSetupNext,
  onImageBack,
  onImageNext,
  onVideoBack,
  onGenerateVideo,
}: WizardMobileBarProps) {
  if (stepKey !== "setup" && stepKey !== "image" && stepKey !== "video") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      {stepKey === "setup" && (
        <>
          {setupNextDisabled && setupNextDisabledReason && (
            <p className="mb-2 text-center text-xs text-amber-200/90">{setupNextDisabledReason}</p>
          )}
          <button
            type="button"
            data-coach-id="coach-continue-setup"
            onClick={onSetupNext}
            disabled={setupNextDisabled}
            title={setupNextDisabledReason ?? undefined}
            className="w-full rounded-xl bg-linear-to-r from-cyan-500 via-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] disabled:opacity-40"
          >
            {continueSetupLabel}
          </button>
        </>
      )}
      {stepKey === "image" && (
        <>
          {imageNextDisabled && imageNextDisabledReason && (
            <p className="mb-2 text-center text-xs text-amber-200/90">{imageNextDisabledReason}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onImageBack}
              className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-200"
            >
              {backLabel}
            </button>
            <button
              type="button"
              data-coach-id="coach-continue-image"
              disabled={imageNextDisabled}
              title={imageNextDisabledReason ?? undefined}
              onClick={onImageNext}
              className="flex-1 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] disabled:opacity-40"
            >
              {imageFinishLabel}
            </button>
          </div>
        </>
      )}
      {stepKey === "video" && (
        <>
          {videoGenerateDisabled && !videoBusy && videoGenerateDisabledReason && (
            <p className="mb-2 text-center text-xs text-amber-200/90">{videoGenerateDisabledReason}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={videoBusy}
              onClick={onVideoBack}
              className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-200 disabled:opacity-50"
            >
              {backLabel}
            </button>
            <button
              type="button"
              data-coach-id="coach-generate-video"
              disabled={videoGenerateDisabled}
              title={videoGenerateDisabledReason ?? undefined}
              onClick={onGenerateVideo}
              className="flex-1 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,0.35)] disabled:opacity-40"
            >
              {videoBusy ? phaseVideoLabel : generateVideoLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
