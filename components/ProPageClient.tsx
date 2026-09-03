"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProCanvas } from "@/components/pro/ProCanvas";
import { StudioNav } from "@/components/studio/StudioNav";
import { useLocale } from "@/components/LocaleProvider";

function ProCanvasFromQuery() {
  const searchParams = useSearchParams();
  return <ProCanvas initialTemplate={searchParams.get("template")} />;
}

function UltraCanvasBadge() {
  const { m } = useLocale();
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200 ring-1 ring-violet-400/30">
        {m.ultraCanvas.title}
      </span>
      <Link
        href="/studio"
        className="hidden text-xs font-medium text-slate-400 hover:text-violet-200 sm:inline"
      >
        {m.ultraCanvas.backStudio}
      </Link>
    </div>
  );
}

export function ProPageClient() {
  const { m } = useLocale();
  const [tipsOpen, setTipsOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <StudioNav trailing={<UltraCanvasBadge />} variant="dark" />
      <div className="mx-auto flex w-full max-w-[100vw] flex-1 flex-col px-3 py-3 sm:px-4 md:px-5 md:pb-4">
        <header className="mb-3 shrink-0 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {m.ultraCanvas.title}
              </h1>
              <p className="mt-0.5 max-w-3xl text-xs text-slate-400 sm:text-sm">
                {m.ultraCanvas.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTipsOpen((v) => !v)}
              className="shrink-0 rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
            >
              {tipsOpen ? "−" : "+"} Tips
            </button>
          </div>
          <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-950/40 px-2.5 py-1.5 text-[11px] text-amber-100/90">
            {m.ultraCanvas.costHint}
          </p>
          {tipsOpen ? (
            <ol className="mt-2 grid gap-1.5 text-[11px] text-slate-400 sm:grid-cols-3">
              {m.ultraCanvas.steps.map((step) => (
                <li
                  key={step}
                  className="rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-2"
                >
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
        </header>

        <p className="mb-3 shrink-0 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 md:hidden">
          {m.ultraCanvas.mobileDesktopOnly}
        </p>

        <div className="min-h-0 flex-1">
          <Suspense fallback={<ProCanvas />}>
            <ProCanvasFromQuery />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
