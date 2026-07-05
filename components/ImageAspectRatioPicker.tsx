"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  IMAGE_ASPECT_RATIOS,
  type ImageAspectRatio,
} from "@/lib/image-aspect-ratio";

type Props = {
  value: ImageAspectRatio;
  onChange: (ratio: ImageAspectRatio) => void;
  variant?: "light" | "dark";
};

export function ImageAspectRatioPicker({ value, onChange, variant = "dark" }: Props) {
  const { m } = useLocale();
  const isDark = variant === "dark";

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
        {m.wizard.imageAspectRatioLabel}
      </p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {m.wizard.imageAspectRatioHint}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {IMAGE_ASPECT_RATIOS.map((ratio) => {
          const copy = m.wizard.imageAspectRatios[ratio];
          const selected = value === ratio;
          return (
            <button
              key={ratio}
              type="button"
              onClick={() => onChange(ratio)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? isDark
                    ? "border-emerald-500 bg-emerald-950/40"
                    : "border-emerald-400 bg-emerald-50"
                  : isDark
                    ? "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p
                className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {copy.title}
              </p>
              <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {copy.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
