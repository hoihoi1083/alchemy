"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ArtStyleId } from "@/lib/art-style";
import {
  COMPOSITION_PRESET_IDS,
  compositionPresetAppliesToArtStyle,
  compositionPresetPreviewSrc,
  type CompositionPresetId,
} from "@/lib/composition-presets";

export function CompositionPresetPicker({
  artStyleId,
  value,
  onChange,
  variant = "light",
}: {
  artStyleId: ArtStyleId;
  value: CompositionPresetId;
  onChange: (id: CompositionPresetId) => void;
  variant?: "light" | "dark";
}) {
  const { m } = useLocale();
  if (!compositionPresetAppliesToArtStyle(artStyleId)) return null;

  const dark = variant === "dark";
  const labels = m.wizard.compositionPresets;

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${dark ? "text-teal-100" : "text-slate-700"}`}>
        {m.wizard.compositionPresetLabel}
      </p>
      <p className={`text-xs ${dark ? "text-teal-200/80" : "text-slate-500"}`}>
        {m.wizard.compositionPresetHint}
      </p>
      <div
        className="grid grid-cols-2 gap-2"
        role="listbox"
        aria-label={m.wizard.compositionPresetLabel}
      >
        {COMPOSITION_PRESET_IDS.map((id) => {
          const selected = value === id;
          const copy = labels[id];
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                dark
                  ? selected
                    ? "border-amber-300 bg-amber-950/40 ring-1 ring-amber-300/40"
                    : "border-teal-800/60 bg-slate-950/40 hover:border-teal-600"
                  : selected
                    ? "border-violet-500 bg-violet-50 ring-1 ring-violet-300"
                    : "border-slate-200 bg-white hover:border-violet-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compositionPresetPreviewSrc(id)}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="block px-3 py-2">
                <span
                  className={`block text-xs font-semibold ${
                    dark ? "text-amber-50" : "text-slate-900"
                  }`}
                >
                  {copy.title}
                </span>
                <span
                  className={`mt-0.5 block text-[10px] leading-snug ${
                    dark ? "text-teal-200/75" : "text-slate-500"
                  }`}
                >
                  {copy.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
