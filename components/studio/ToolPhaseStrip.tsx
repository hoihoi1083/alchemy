"use client";

type PhaseItem = {
  id: string;
  label: string;
};

type Props = {
  phases: PhaseItem[];
  currentId: string;
  /** Phases at or before current count as done (for ✓). */
  onSelect: (id: string) => void;
  /** Step ids that should look disabled and ignore clicks. */
  disabledIds?: string[];
  howTo?: string | null;
  className?: string;
};

/**
 * Dark-theme procedure strip (studio StepIndicator look) for tool pages.
 * Does not gate features — parent decides what’s clickable via disabledIds.
 */
export function ToolPhaseStrip({
  phases,
  currentId,
  onSelect,
  disabledIds = [],
  howTo,
  className = "",
}: Props) {
  const currentIdx = Math.max(
    0,
    phases.findIndex((p) => p.id === currentId),
  );
  const disabled = new Set(disabledIds);

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 sm:px-4 ${className}`}
    >
      <ol className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
        {phases.map((phase, i) => {
          const n = i + 1;
          const done = i < currentIdx;
          const active = i === currentIdx;
          const isDisabled = disabled.has(phase.id);
          return (
            <li key={phase.id} className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onSelect(phase.id);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 ${
                  isDisabled ? "cursor-not-allowed opacity-40" : ""
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm ${
                    active
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                      : done
                        ? "bg-emerald-900/60 text-emerald-200"
                        : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={`text-xs font-medium sm:text-sm ${
                    active
                      ? "text-emerald-100"
                      : isDisabled
                        ? "text-slate-600"
                        : "text-slate-400"
                  }`}
                >
                  {phase.label}
                </span>
              </button>
              {n < phases.length ? (
                <span className="hidden text-slate-500 sm:inline" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {howTo ? (
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-relaxed text-slate-400 sm:text-xs">
          {howTo}
        </p>
      ) : null}
    </div>
  );
}
