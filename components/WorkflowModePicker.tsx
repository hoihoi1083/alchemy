"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { WorkflowMode } from "@/lib/workflow-mode";

type Props = {
  value: WorkflowMode;
  onChange: (mode: WorkflowMode) => void;
};

const MODES: { id: WorkflowMode; icon: string }[] = [
  { id: "image-only", icon: "📷" },
  { id: "video-only", icon: "🎬" },
  { id: "combined", icon: "📷→🎬" },
];

export function WorkflowModePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.workflowLabel}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map(({ id, icon }) => {
          const copy = m.wizard.workflowModes[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border p-4 text-left transition ${
                value === id
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{copy.title}</p>
              <p className="mt-1 text-xs text-slate-600">{copy.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
