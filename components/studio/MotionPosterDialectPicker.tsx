"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  MOTION_POSTER_DIALECT_IDS,
  type MotionPosterDialectPick,
} from "@/lib/motion-poster-dialects";

export function MotionPosterDialectPicker({
  value,
  onChange,
  variant = "light",
}: {
  value: MotionPosterDialectPick;
  onChange: (pick: MotionPosterDialectPick) => void;
  variant?: "light" | "dark";
}) {
  const { m } = useLocale();
  const labels = m.wizard.motionPosterDialects;
  const dark = variant === "dark";
  const chip = dark
    ? "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
    : "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition";
  const idle = dark
    ? "border-amber-400/40 bg-amber-950/30 text-amber-50/90 hover:bg-amber-900/40"
    : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-800";
  const selected = dark
    ? "border-amber-200 bg-amber-100 text-amber-950"
    : "border-violet-500 bg-violet-50 text-violet-900";

  return (
    <div className="space-y-1.5">
      <p className={`text-[11px] leading-snug ${dark ? "text-amber-100/80" : "text-slate-500"}`}>
        {m.wizard.motionPosterDialectHint}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`${chip} ${value === "auto" ? selected : idle}`}
          onClick={() => onChange("auto")}
        >
          {m.wizard.motionPosterDialectAuto}
        </button>
        {MOTION_POSTER_DIALECT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            title={labels[id].desc}
            className={`${chip} ${value === id ? selected : idle}`}
            onClick={() => onChange(id)}
          >
            {labels[id].title}
          </button>
        ))}
      </div>
    </div>
  );
}
