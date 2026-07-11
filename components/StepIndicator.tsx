"use client";

import { useLocale } from "@/components/LocaleProvider";
import { stepsForMode, type WorkflowMode, type WorkflowStepKey } from "@/lib/workflow-mode";

type Props = {
  mode: WorkflowMode;
  currentKey: WorkflowStepKey;
  storyboardKeyframes?: boolean;
  theme?: "light" | "dark";
};

export function StepIndicator({ mode, currentKey, storyboardKeyframes, theme = "light" }: Props) {
  const { m } = useLocale();
  const keys = stepsForMode(mode, { storyboardKeyframes });
  const current = keys.indexOf(currentKey) + 1;

  const labelFor = (key: WorkflowStepKey) => {
    switch (key) {
      case "setup":
        return m.steps.setup;
      case "image":
        return m.steps.image;
      case "video":
        return m.steps.video;
      case "done":
        return m.steps.done;
    }
  };

  const isDark = theme === "dark";
  const inactiveCircle = isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-500";
  const doneCircle = isDark ? "bg-emerald-900/60 text-emerald-200" : "bg-emerald-100 text-emerald-700";
  const labelActive = isDark ? "text-emerald-100" : "text-slate-900";
  const labelMuted = isDark ? "text-slate-400" : "text-slate-500";
  const arrowColor = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <ol className="mb-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
      {keys.map((key, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const label = labelFor(key);
        return (
          <li key={key} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                  : done
                    ? doneCircle
                    : inactiveCircle
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span
              className={`text-xs font-medium sm:text-sm ${active ? labelActive : labelMuted}`}
            >
              {label}
            </span>
            {n < keys.length && <span className={`hidden sm:inline ${arrowColor}`}>→</span>}
          </li>
        );
      })}
    </ol>
  );
}
