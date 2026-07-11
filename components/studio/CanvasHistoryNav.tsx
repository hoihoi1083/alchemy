"use client";

type CanvasHistoryNavProps = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  versionLabel?: string;
  recoverLabel?: string;
  onRecover?: () => void;
  canRecover?: boolean;
  disabled?: boolean;
};

export function CanvasHistoryNav({
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  versionLabel,
  recoverLabel,
  onRecover,
  canRecover,
  disabled,
}: CanvasHistoryNavProps) {
  const showNav = canPrev || canNext || versionLabel;
  if (!showNav && !canRecover) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 border-slate-700 bg-slate-900/90 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || !canPrev}
          onClick={onPrev}
          className="rounded border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← {prevLabel}
        </button>
        <button
          type="button"
          disabled={disabled || !canNext}
          onClick={onNext}
          className="rounded border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {nextLabel} →
        </button>
        {versionLabel && (
          <span className="text-[10px] text-slate-500">{versionLabel}</span>
        )}
      </div>
      {canRecover && recoverLabel && onRecover && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRecover}
          className="text-[10px] text-amber-300 underline hover:text-amber-200 disabled:opacity-40"
        >
          {recoverLabel}
        </button>
      )}
    </div>
  );
}
