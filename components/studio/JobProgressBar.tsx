"use client";

import type { ProgressInfo } from "@/hooks/useWizardProgress";

type JobProgressBarProps = {
  info: ProgressInfo;
  busyLabel: string;
};

export function JobProgressBar({ info, busyLabel }: JobProgressBarProps) {
  return (
    <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/30 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-cyan-100">{info.label ?? busyLabel}</span>
        <span className="text-cyan-200/80">{info.eta}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 transition-all duration-1000"
          style={{ width: `${info.pct}%` }}
        />
      </div>
    </div>
  );
}
