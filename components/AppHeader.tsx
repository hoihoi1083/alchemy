"use client";

import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import type { PromotionMode } from "@/lib/promotion-mode";

export function AppHeader(props: {
  theme: "light" | "dark";
  promotionMode: PromotionMode;
  onToggleTheme: () => void;
}) {
  const { m } = useLocale();
  const isConcept = props.promotionMode === "concept";

  return (
    <header className="mb-6 rounded-3xl border border-white/40 bg-white/70 px-3 py-4 text-center shadow-sm backdrop-blur sm:mb-8 sm:px-4 sm:py-6">
      <div className="mb-4 flex items-center justify-center gap-2">
        <LanguageToggle variant="light" />
        <AuthNav />
        <button
          type="button"
          onClick={props.onToggleTheme}
          className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
        >
          {props.theme === "dark" ? m.header.themeToggleLight : m.header.themeToggleDark}
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isConcept ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {isConcept ? m.header.promotionConcept : m.header.promotionPhysical}
        </span>
        <Link
          href="/start"
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {m.header.switchPromotion}
        </Link>
      </div>
      <div className="mb-4 flex items-center justify-center gap-3">
        <img
          src="/alchemy-logo.png"
          alt="alchemy.ai logo"
          className="h-10 w-10 bg-transparent object-contain"
        />
        <p className="text-sm font-semibold tracking-wide text-slate-700">alchemy.ai</p>
      </div>
      <p className="text-sm font-medium tracking-wide text-emerald-600">{m.header.badge}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {m.header.title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
        {isConcept ? m.header.subtitleConcept : m.header.subtitle}
      </p>
      <p className="mt-4 text-xs text-slate-500">
        <Link href="/" className="mr-3 text-slate-600 underline hover:text-slate-500">
          {m.header.homeLink}
        </Link>
        <Link href="/pro" className="text-emerald-600 underline hover:text-emerald-500">
          {m.header.proLink}
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/captions" className="text-violet-600 underline hover:text-violet-500">
          {m.header.captionsLink}
        </Link>
      </p>
    </header>
  );
}
