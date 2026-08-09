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
  /** Selected accent; violet for studio fuse pages. */
  accent?: "emerald" | "violet";
};

export function ImageAspectRatioPicker({
  value,
  onChange,
  variant = "dark",
  accent = "emerald",
}: Props) {
  const { m } = useLocale();
  const isDark = variant === "dark";
  const violet = accent === "violet";

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
                    ? violet
                      ? "border-violet-500 bg-violet-950/40"
                      : "border-emerald-500 bg-emerald-950/40"
                    : violet
                      ? "border-violet-400 bg-violet-50"
                      : "border-violet-400 bg-violet-50"
                  : isDark
                    ? "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`mx-auto mb-2 block rounded-[4px] border-2 ${
                  selected
                    ? isDark
                      ? "border-current opacity-90"
                      : "border-violet-500"
                    : isDark
                      ? "border-slate-500"
                      : "border-slate-300"
                }`}
                style={
                  ratio === "9:16"
                    ? { width: 18, height: 32 }
                    : ratio === "4:5"
                      ? { width: 22, height: 28 }
                      : { width: 26, height: 26 }
                }
                aria-hidden
              />
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
