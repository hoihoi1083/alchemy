"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageTextMode } from "@/lib/image-text-mode";

type ImageTextModePickerProps = {
  value: ImageTextMode;
  disabled?: boolean;
  onChange: (mode: ImageTextMode) => void;
  /** Studio fuse pages — light violet instead of dark emerald. */
  variant?: "dark" | "violet";
};

export function ImageTextModePicker({
  value,
  disabled,
  onChange,
  variant = "dark",
}: ImageTextModePickerProps) {
  const { m } = useLocale();
  const w = m.wizard;
  const violet = variant === "violet";

  return (
    <div
      className={`rounded-xl border p-4 ${
        violet ? "border-violet-200 bg-violet-50/50" : "border-slate-700 bg-slate-900/40"
      }`}
    >
      <p className={`text-sm font-semibold ${violet ? "text-slate-900" : "text-white"}`}>
        {w.imageTextModeTitle}
      </p>
      <p className={`mt-1 text-xs ${violet ? "text-slate-500" : "text-slate-400"}`}>
        {w.imageTextModeHint}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("integrated")}
          className={`rounded-lg px-3 py-2 text-left text-xs ${
            value === "integrated"
              ? violet
                ? "bg-violet-600 text-white"
                : "bg-emerald-600 text-white"
              : violet
                ? "border border-violet-200 bg-white text-slate-700"
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
              ? violet
                ? "bg-violet-600 text-white"
                : "bg-emerald-600 text-white"
              : violet
                ? "border border-violet-200 bg-white text-slate-700"
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
