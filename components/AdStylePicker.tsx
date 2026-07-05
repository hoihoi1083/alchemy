"use client";

import { useLocale } from "@/components/LocaleProvider";
import { AD_STYLES, type AdStyleId } from "@/lib/ad-styles";

type Props = {
  value: AdStyleId;
  onChange: (id: AdStyleId) => void;
};

export function AdStylePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-300">{m.wizard.adStyleLabel}</p>
      <p className="text-xs text-slate-500">{m.wizard.adStyleHint}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {AD_STYLES.map((style) => {
          const labels = m.wizard.adStyles[style.id];
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              className={`rounded-xl border p-4 text-left transition ${
                value === style.id
                  ? "border-emerald-500/60 bg-emerald-950/40"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{style.icon}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-300">
                  ~{style.qualityHint}%
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{labels.title}</p>
              <p className="mt-1 text-xs text-slate-400">{labels.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
