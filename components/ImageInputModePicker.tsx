"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageInputMode } from "@/lib/image-input-mode";

type Props = {
  value: ImageInputMode;
  onChange: (mode: ImageInputMode) => void;
};

const MODES: { id: ImageInputMode; icon: string }[] = [
  { id: "product-ad", icon: "📦" },
  { id: "product-style", icon: "📦+🎨" },
  { id: "describe", icon: "✍️" },
  { id: "reference", icon: "🖼️" },
];

export function ImageInputModePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-300">{m.wizard.imageInputLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map(({ id, icon }) => {
          const copy = m.wizard.imageInputModes[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border p-3 text-left transition ${
                value === id
                  ? "border-emerald-500/60 bg-emerald-950/40"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <p className="mt-2 text-sm font-semibold text-white">{copy.title}</p>
              <p className="mt-1 text-xs text-slate-400">{copy.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
