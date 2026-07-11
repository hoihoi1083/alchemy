"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageTextMode } from "@/lib/image-text-mode";

type ImageTextModePickerProps = {
  value: ImageTextMode;
  disabled?: boolean;
  onChange: (mode: ImageTextMode) => void;
};

export function ImageTextModePicker({ value, disabled, onChange }: ImageTextModePickerProps) {
  const { m } = useLocale();
  const w = m.wizard;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <p className="text-sm font-semibold text-white">{w.imageTextModeTitle}</p>
      <p className="mt-1 text-xs text-slate-400">{w.imageTextModeHint}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("integrated")}
          className={`rounded-lg px-3 py-2 text-left text-xs ${
            value === "integrated"
              ? "bg-emerald-600 text-white"
              : "border border-slate-600 text-slate-300"
          }`}
        >
          <span className="block font-semibold">{w.imageTextModeIntegrated}</span>
          <span className="mt-0.5 block opacity-80">{w.imageTextModeIntegratedHint}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("textless")}
          className={`rounded-lg px-3 py-2 text-left text-xs ${
            value === "textless"
              ? "bg-emerald-600 text-white"
              : "border border-slate-600 text-slate-300"
          }`}
        >
          <span className="block font-semibold">{w.imageTextModeTextless}</span>
          <span className="mt-0.5 block opacity-80">{w.imageTextModeTextlessHint}</span>
        </button>
      </div>
    </div>
  );
}
