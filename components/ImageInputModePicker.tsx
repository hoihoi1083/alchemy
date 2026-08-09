"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageInputMode } from "@/lib/image-input-mode";
import { IMAGE_INPUT_MODES, imageInputPreviewSrc } from "@/lib/image-input-mode";

type Props = {
  value: ImageInputMode;
  onChange: (mode: ImageInputMode) => void;
};

export function ImageInputModePicker({ value, onChange }: Props) {
  const { m } = useLocale();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-300">{m.wizard.imageInputLabel}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMAGE_INPUT_MODES.map((id) => {
          const copy = m.wizard.imageInputModes[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                selected
                  ? "border-violet-500/60 bg-violet-950/40 ring-1 ring-violet-400/50"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageInputPreviewSrc(id)}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
              <span className="block p-3">
                <span className="block text-sm font-semibold text-white">{copy.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{copy.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
