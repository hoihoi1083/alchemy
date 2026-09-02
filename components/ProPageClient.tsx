"use client";

import Link from "next/link";
import { Suspense } from "react";
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
      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
        {m.ultraCanvas.title}
      </span>
      <Link
        href="/studio"
        className="hidden text-xs font-medium text-slate-600 hover:text-violet-700 sm:inline"
      >
        {m.ultraCanvas.backStudio}
      </Link>
    </div>
  );
}

export function ProPageClient() {
  const { m } = useLocale();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <StudioNav trailing={<UltraCanvasBadge />} />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:pb-8">
        <header className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50/90 via-white to-white p-4 sm:p-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {m.ultraCanvas.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{m.ultraCanvas.subtitle}</p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {m.ultraCanvas.costHint}
          </p>
        </header>

        <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 md:hidden">
          {m.ultraCanvas.mobileDesktopOnly}
        </p>

        <ol className="mb-4 hidden gap-2 text-xs text-slate-600 sm:grid sm:grid-cols-3">
          {m.ultraCanvas.steps.map((step) => (
            <li
              key={step}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              {step}
            </li>
          ))}
        </ol>

        <Suspense fallback={<ProCanvas />}>
          <ProCanvasFromQuery />
        </Suspense>
      </div>
    </main>
  );
}
