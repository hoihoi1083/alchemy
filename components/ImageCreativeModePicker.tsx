"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import { IMAGE_CREATIVE_MODES, imageModePreviewSrc } from "@/lib/creative-workflow";

type Props = {
  value: ImageCreativeMode;
  onChange: (mode: ImageCreativeMode) => void;
};

export function ImageCreativeModePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.imageCreativeLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMAGE_CREATIVE_MODES.map((id) => {
          const copy = m.wizard.imageCreativeModes[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`overflow-hidden rounded-xl border bg-white text-left transition ${
                selected
                  ? "border-violet-400 bg-violet-50 ring-1 ring-violet-400"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageModePreviewSrc(id)} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="block p-3">
                <span className="block text-sm font-semibold text-slate-900">{copy.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{copy.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
