"use client";

import type { KlingClipDuration } from "@/lib/kling-storyboard-fallback";
import {
  klingStoryboardTokenCost,
  resolveKlingClipDurations,
} from "@/lib/kling-storyboard-fallback";

type SceneMeta = {
  startSec?: number;
  endSec?: number;
};

type Props = {
  sceneCount: number;
  clipSec: KlingClipDuration;
  scenes?: SceneMeta[];
  onClipChange: (clip: KlingClipDuration) => void;
  label: string;
  hint: string;
  totalLabel: string;
  costLabel: string;
  accent?: "violet" | "emerald";
  variant?: "light" | "dark";
};

function pillClass(
  active: boolean,
  dark: boolean,
  accent: "violet" | "emerald",
): string {
  if (active) {
    return accent === "violet" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white";
  }
  return dark
    ? "border border-slate-600 text-slate-200"
    : "border border-slate-300 text-slate-600";
}

export function KlingStoryboardSettings({
  sceneCount,
  clipSec,
  scenes = [],
  onClipChange,
  label,
  hint,
  totalLabel,
  costLabel,
  accent = "violet",
  variant = "light",
}: Props) {
  const dark = variant === "dark";
  const n = Math.max(1, sceneCount);
  const totalSec = n * clipSec;
  const tokens = klingStoryboardTokenCost(
    resolveKlingClipDurations(
      n,
      totalSec,
      scenes.length
        ? scenes
        : Array.from({ length: n }, (_, i) => ({
            startSec: i * clipSec,
            endSec: (i + 1) * clipSec,
          })),
    ),
  );

  return (
    <div className="space-y-3">
      <div>
        <p
          className={
            dark
              ? "mb-2 text-xs font-medium text-slate-400"
              : "mb-2 text-xs font-medium text-slate-600"
          }
        >
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {([5, 10] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onClipChange(d)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${pillClass(
                clipSec === d,
                dark,
                accent,
              )}`}
            >
              {d}s
            </button>
          ))}
        </div>
        <p className={dark ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
          {hint}
        </p>
        <p
          className={
            dark
              ? "mt-1.5 text-xs font-medium text-teal-200/90"
              : "mt-1.5 text-xs font-medium text-violet-700"
          }
        >
          {totalLabel
            .replace("{total}", String(totalSec))
            .replace("{n}", String(n))
            .replace("{clip}", String(clipSec))}
        </p>
      </div>
      <p
        className={
          dark
            ? "rounded-xl border border-violet-800/50 bg-violet-950/40 px-3 py-2.5 text-sm font-semibold text-violet-100"
            : "rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-900"
        }
      >
        {costLabel.replace("{n}", String(tokens))}
      </p>
    </div>
  );
}
