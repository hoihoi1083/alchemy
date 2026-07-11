"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProCanvas } from "@/components/pro/ProCanvas";
import { useLocale } from "@/components/LocaleProvider";

export function ProPageClient() {
  const { m } = useLocale();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#000_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/alchemy-logo.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-semibold">{m.pro.title}</h1>
              <p className="text-xs text-slate-400">{m.pro.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="dark" />
            <Link
              href="/start"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              {m.pro.backStudio}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              {m.pro.back}
            </Link>
          </div>
        </div>

        <p className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100/90 md:hidden">
          {m.pro.mobileDesktopOnly}
        </p>

        <p className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100/90">
          {m.pro.costHint}
        </p>

        <ol className="mb-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
          {m.pro.steps.map((step) => (
            <li key={step} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
              {step}
            </li>
          ))}
        </ol>

        <ProCanvas />
      </div>
    </main>
  );
}
