"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import { IMAGE_CREATIVE_MODES } from "@/lib/creative-workflow";

type Props = {
  value: ImageCreativeMode;
  onChange: (mode: ImageCreativeMode) => void;
};

const ICONS: Record<ImageCreativeMode, string> = {
  "promo-ai": "✨",
  "reference-concept": "🎨",
};

export function ImageCreativeModePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.imageCreativeLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMAGE_CREATIVE_MODES.map((id) => {
          const copy = m.wizard.imageCreativeModes[id];
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
              <span className="text-xl">{ICONS[id]}</span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{copy.title}</p>
              <p className="mt-1 text-xs text-slate-600">{copy.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
