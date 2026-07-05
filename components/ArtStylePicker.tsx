"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  ART_STYLE_IDS,
  type ArtStyleId,
  getArtStyle,
} from "@/lib/art-style";

type Props = {
  value: ArtStyleId;
  onChange: (id: ArtStyleId) => void;
};

export function ArtStylePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.artStyleLabel}</p>
      <p className="text-xs text-slate-500">{m.wizard.artStyleHint}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ART_STYLE_IDS.map((id) => {
          const def = getArtStyle(id);
          const copy = m.wizard.artStyles[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-400"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-base" aria-hidden>
                {def.icon}
              </span>
              <span className="mt-1 block text-sm font-medium text-slate-800">{copy.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                {copy.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
