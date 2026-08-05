"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

type ToggleProps = {
  variant?: "dark" | "light";
  /** Tighter padding for cramped toolbars */
  size?: "default" | "compact";
};

const LOCALES: Locale[] = ["en", "zh", "zh-cn"];

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function LanguageToggle({ variant = "dark", size = "default" }: ToggleProps) {
  const { locale, setLocale, m } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const light = variant === "light";
  const compact = size === "compact";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={m.lang[locale]}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg transition ${
          compact ? "px-1.5 py-1 text-xs" : "px-2 py-1.5 text-sm"
        } ${
          light
            ? "text-slate-800 hover:bg-slate-100"
            : "text-slate-200 hover:bg-slate-800/80"
        }`}
      >
        <GlobeIcon className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
        <span className="font-medium leading-none">{m.lang[locale]}</span>
      </button>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Language"
          className={`absolute right-0 top-full z-50 mt-1 min-w-30 overflow-hidden rounded-xl border py-1 ${
            light
              ? "border-slate-200 bg-white text-slate-800"
              : "border-slate-700 bg-slate-900 text-slate-100"
          }`}
        >
          {LOCALES.map((code) => {
            const active = locale === code;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                    active
                      ? light
                        ? "bg-violet-50 font-semibold text-violet-700"
                        : "bg-violet-600/30 font-semibold text-violet-200"
                      : light
                        ? "hover:bg-slate-50"
                        : "hover:bg-slate-800"
                  }`}
                >
                  {m.lang[code]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
