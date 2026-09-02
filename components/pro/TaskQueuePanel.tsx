"use client";

import type { TaskQueueItem } from "@/lib/pro-canvas-types";

type Props = {
  items: TaskQueueItem[];
  running: boolean;
  labels: {
    title: string;
    runAll: string;
    running: string;
    stopRun: string;
    empty: string;
  };
  onRunAll: () => void;
  onStopRun: () => void;
  runAllDisabled?: boolean;
};

export function TaskQueuePanel({
  items,
  running,
  labels,
  onRunAll,
  onStopRun,
  runAllDisabled = false,
}: Props) {
  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {labels.title}
        </p>
        {running ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-amber-400">{labels.running}</span>
            <button
              type="button"
              onClick={onStopRun}
              className="rounded-lg bg-red-600/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
            >
              {labels.stopRun}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRunAll}
            disabled={runAllDisabled}
            className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
          >
            {labels.runAll}
          </button>
        )}
      </div>
      <ul
        className="mt-2 max-h-48 space-y-1 overflow-y-auto"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {items.length === 0 && (
          <li className="text-[10px] text-slate-500">{labels.empty}</li>
        )}
        {items.map((item) => (
          <li
            key={item.nodeId}
            className="flex items-start gap-2 rounded-lg bg-slate-950/60 px-2 py-1 text-[10px]"
          >
            <span
              className={
                item.status === "done"
                  ? "text-emerald-400"
                  : item.status === "running"
                    ? "text-amber-400"
                    : item.status === "error"
                      ? "text-red-400"
                      : "text-slate-500"
              }
            >
              {item.status === "done"
                ? "✓"
                : item.status === "running"
                  ? "…"
                  : item.status === "error"
                    ? "!"
                    : "○"}
            </span>
            <span className="min-w-0 flex-1 text-slate-300">
              {item.label}
              {item.error && <span className="mt-0.5 block text-red-400">{item.error}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
