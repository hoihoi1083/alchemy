"use client";

import { useLocale } from "@/components/LocaleProvider";

export function ResearchStoryboardModeSummary({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { m } = useLocale();
  const dark = variant === "dark";
  const copy = m.wizard.researchStoryboardMode;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        dark
          ? "border-teal-700/60 bg-teal-950/30 text-teal-50"
          : "border-violet-200 bg-violet-50/80 text-violet-950"
      }`}
    >
      <p className="text-sm font-semibold">{copy.title}</p>
      <p
        className={`mt-1 text-[11px] leading-snug ${
          dark ? "text-teal-200/85" : "text-violet-800/90"
        }`}
      >
        {copy.body}
      </p>
    </div>
  );
}
