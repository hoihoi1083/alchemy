"use client";

import { useLocale } from "@/components/LocaleProvider";
import { SUBJECT_FRAMINGS, subjectFramingPreviewSrc, type SubjectFraming } from "@/lib/prompt-variables";

type Props = {
  value: SubjectFraming;
  onChange: (value: SubjectFraming) => void;
  variant?: "light" | "dark";
};

export function SubjectFramingPicker({ value, onChange, variant = "dark" }: Props) {
  const { m } = useLocale();
  const isDark = variant === "dark";
  const framings = m.wizard.promptFramings;

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
        {m.wizard.framingLabel}
      </p>
      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {m.wizard.framingPickerHint}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SUBJECT_FRAMINGS.map((id) => {
          const copy = framings[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                selected
                  ? isDark
                    ? "border-cyan-500 ring-1 ring-cyan-500/50"
                    : "border-cyan-600 ring-1 ring-cyan-500/30"
                  : isDark
                    ? "border-slate-700 bg-slate-900/60 hover:border-slate-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={subjectFramingPreviewSrc(id)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <span className="block px-2.5 py-2">
                <span
                  className={`block text-sm font-medium ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {copy.label}
                </span>
                <span className={`mt-0.5 block text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {copy.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
