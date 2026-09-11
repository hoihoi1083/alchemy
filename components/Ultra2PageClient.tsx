"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProCanvas } from "@/components/pro/ProCanvas";
import { StudioNav } from "@/components/studio/StudioNav";
import { useLocale } from "@/components/LocaleProvider";

function UltraCanvasFromQuery() {
  const searchParams = useSearchParams();
  return (
    <ProCanvas
      uxVariant="v2"
      initialTemplate={searchParams.get("template")}
    />
  );
}

function UltraCanvasBadge() {
  const { m } = useLocale();
  const u2 = m.ultraCanvas2;
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200 ring-1 ring-violet-400/30">
        {u2.badge}
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

/** Primary Ultra canvas page (start picker + wave board). */
export function Ultra2PageClient() {
  const { m } = useLocale();
  const u2 = m.ultraCanvas2;

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <StudioNav trailing={<UltraCanvasBadge />} variant="dark" />
      <div className="mx-auto flex w-full max-w-[100vw] flex-1 flex-col px-3 py-2 sm:px-4 md:px-5 md:pb-3">
        <header className="mb-2 shrink-0 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              {u2.title}
            </h1>
            <p className="mt-0.5 max-w-3xl text-[11px] text-slate-400 sm:text-xs">
              {u2.subtitle}
            </p>
          </div>
          <p className="mt-1.5 rounded-lg border border-amber-500/25 bg-amber-950/40 px-2.5 py-1 text-[10px] text-amber-100/90 sm:text-[11px]">
            {u2.costHint}
          </p>
        </header>

        <p className="mb-3 shrink-0 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 md:hidden">
          {m.ultraCanvas.mobileDesktopOnly}
        </p>

        <div className="min-h-0 flex-1">
          <Suspense fallback={<ProCanvas uxVariant="v2" />}>
            <UltraCanvasFromQuery />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
