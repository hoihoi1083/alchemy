"use client";

type Props = {
  shipItMode: boolean;
  onShipItModeChange: (next: boolean) => void;
  eligible: boolean;
  busy: boolean;
  onRun: () => void;
  showRunButton: boolean;
  labels: {
    modeOn: string;
    modeOff: string;
    modeHint: string;
    showExpert: string;
    runBtn: string;
    running: string;
    unsupported: string;
    runHint: string;
  };
};

export function ShipItPanel({
  shipItMode,
  onShipItModeChange,
  eligible,
  busy,
  onRun,
  showRunButton,
  labels,
}: Props) {
  return (
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/25 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-violet-100">
            {shipItMode ? labels.modeOn : labels.modeOff}
          </p>
          <p className="mt-1 text-xs text-violet-200/80">{labels.modeHint}</p>
        </div>
        <button
          type="button"
          onClick={() => onShipItModeChange(!shipItMode)}
          className="rounded-lg border border-violet-600 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-900/40"
        >
          {shipItMode ? labels.showExpert : labels.modeOn}
        </button>
      </div>
      {showRunButton && (
        <div className="mt-3 border-t border-violet-800/40 pt-3">
          <p className="text-xs text-violet-200/80">
            {eligible ? labels.runHint : labels.unsupported}
          </p>
          <button
            type="button"
            disabled={!eligible || busy}
            onClick={onRun}
            className="mt-2 w-full rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] disabled:opacity-40"
          >
            {busy ? labels.running : labels.runBtn}
          </button>
        </div>
      )}
    </div>
  );
}
