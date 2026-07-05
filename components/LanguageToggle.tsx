"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

type ToggleProps = {
  variant?: "dark" | "light";
};

export function LanguageToggle({ variant = "dark" }: ToggleProps) {
  const { locale, setLocale, m } = useLocale();

  function pick(next: Locale) {
    setLocale(next);
  }

  return (
    <div
      className={`inline-flex rounded-full p-0.5 text-xs font-medium ${
        variant === "light"
          ? "border border-slate-300 bg-white/90"
          : "border border-slate-700 bg-slate-900/80"
      }`}
      role="group"
      aria-label="Language"
    >
      {(["en", "zh", "zh-cn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          className={`rounded-full px-3 py-1.5 transition ${
            locale === code
              ? "bg-emerald-600 text-white"
              : variant === "light"
                ? "text-slate-500 hover:text-slate-800"
                : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {m.lang[code]}
        </button>
      ))}
    </div>
  );
}
