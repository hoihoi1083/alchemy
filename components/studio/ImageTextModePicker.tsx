"use client";

import { useLocale } from "@/components/LocaleProvider";
import { imageTextPreviewSrc, type ImageTextMode } from "@/lib/image-text-mode";

type ImageTextModePickerProps = {
  value: ImageTextMode;
  disabled?: boolean;
  onChange: (mode: ImageTextMode) => void;
  /** Studio fuse pages — light violet instead of dark emerald. */
  variant?: "dark" | "violet";
  hint?: string;
};

export function ImageTextModePicker({
  value,
  disabled,
  onChange,
  variant = "dark",
  hint,
}: ImageTextModePickerProps) {
  const { m } = useLocale();
  const w = m.wizard;
  const violet = variant === "violet";

  const modes: Array<{ id: ImageTextMode; title: string; hint: string }> = [
    { id: "integrated", title: w.imageTextModeIntegrated, hint: w.imageTextModeIntegratedHint },
    { id: "textless", title: w.imageTextModeTextless, hint: w.imageTextModeTextlessHint },
  ];

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
        {hint ?? w.imageTextModeHint}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {modes.map((mode) => {
          const selected = value === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              className={`overflow-hidden rounded-lg text-left transition ${
                selected
                  ? violet
                    ? "ring-2 ring-violet-500"
                    : "ring-2 ring-emerald-500"
                  : violet
                    ? "border border-violet-200 bg-white"
                    : "border border-slate-600"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageTextPreviewSrc(mode.id)}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
              <span
                className={`block px-3 py-2 text-xs ${
                  selected
                    ? violet
                      ? "bg-violet-600 text-white"
                      : "bg-emerald-600 text-white"
                    : violet
                      ? "bg-white text-slate-700"
                      : "text-slate-300"
                }`}
              >
                <span className="block font-semibold">{mode.title}</span>
                <span className="mt-0.5 block opacity-80">{mode.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
