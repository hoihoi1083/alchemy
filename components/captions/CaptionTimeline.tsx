"use client";

import type { CaptionLine } from "@/lib/ad-pack-types";

type CaptionTimelineProps = {
  durationSec: number;
  lines: CaptionLine[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onUpdate: (index: number, patch: Partial<CaptionLine>) => void;
  labels: {
    title: string;
    hint: string;
    trimIn: string;
    trimOut: string;
  };
};

export function CaptionTimeline({
  durationSec,
  lines,
  selectedIndex,
  onSelect,
  onUpdate,
  labels,
}: CaptionTimelineProps) {
  const safeDuration = Math.max(1, durationSec);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <p className="text-sm font-semibold text-white">{labels.title}</p>
      <p className="mt-1 text-xs text-slate-400">{labels.hint}</p>
      <div className="relative mt-4 h-16 rounded-lg bg-slate-950">
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700" />
        {lines.map((line, index) => {
          const left = (line.startSec / safeDuration) * 100;
          const width = Math.max(4, ((line.endSec - line.startSec) / safeDuration) * 100);
          return (
            <button
              key={`${line.startSec}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={`absolute top-2 h-12 rounded-md border px-1 text-[10px] ${
                selectedIndex === index
                  ? "border-emerald-400 bg-emerald-900/50 text-emerald-100"
                  : "border-slate-600 bg-slate-800 text-slate-200"
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={line.text}
            >
              <span className="line-clamp-3">{line.text || `#${index + 1}`}</span>
            </button>
          );
        })}
      </div>
      {lines[selectedIndex] && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            {labels.trimIn}
            <input
              type="number"
              min={0}
              max={safeDuration}
              step={0.1}
              value={lines[selectedIndex].startSec}
              onChange={(e) =>
                onUpdate(selectedIndex, { startSec: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            {labels.trimOut}
            <input
              type="number"
              min={0}
              max={safeDuration}
              step={0.1}
              value={lines[selectedIndex].endSec}
              onChange={(e) =>
                onUpdate(selectedIndex, { endSec: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white"
            />
          </label>
        </div>
      )}
    </div>
  );
}
