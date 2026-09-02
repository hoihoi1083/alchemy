"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProCanvas } from "@/components/pro/ProCanvas";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

export function ProPageClient() {
  const { m } = useLocale();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#000_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/15 bg-slate-900/40 px-4 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90">
            <img src={PRODUCT_LOGO_SRC} alt={PRODUCT_LOGO_ALT} className="h-8 w-8 rounded-lg object-contain ring-1 ring-violet-500/30" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/80">{PRODUCT_NAME}</p>
              <h1 className="bg-gradient-to-r from-violet-200 to-cyan-200 bg-clip-text text-lg font-semibold text-transparent">
                {m.ultraCanvas.title}
              </h1>
              <p className="text-xs text-slate-400">{m.ultraCanvas.subtitle}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="dark" />
            <Link
              href="/start"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              {m.ultraCanvas.backStudio}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              {m.ultraCanvas.back}
            </Link>
          </div>
        </div>

        <p className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100/90 md:hidden">
          {m.ultraCanvas.mobileDesktopOnly}
        </p>

        <p className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-100/90">
          {m.ultraCanvas.costHint}
        </p>

        <ol className="mb-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
          {m.ultraCanvas.steps.map((step) => (
            <li key={step} className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 backdrop-blur">
              {step}
            </li>
          ))}
        </ol>

        <ProCanvas />
      </div>
    </main>
  );
}
