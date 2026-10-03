"use client";

import Link from "next/link";
import { ProCanvas } from "@/components/pro/ProCanvas";
import { StudioNav } from "@/components/studio/StudioNav";
import { useLocale } from "@/components/LocaleProvider";
import { ULTRA_CANVAS_PATH } from "@/lib/ultra-canvas-path";

function UltraDescribeBadge() {
  const { m } = useLocale();
  const d = m.ultraCanvas2.describe;
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-400/30">
        {d.badge}
      </span>
      <Link
        href={ULTRA_CANVAS_PATH}
        className="hidden text-xs font-medium text-slate-400 hover:text-cyan-200 sm:inline"
      >
        {d.backUltra}
      </Link>
    </div>
  );
}

/** /ultra-2 describe-first lab page. */
export function UltraDescribePageClient() {
  const { m } = useLocale();
  const d = m.ultraCanvas2.describe;

  return (
    <main className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      <StudioNav trailing={<UltraDescribeBadge />} variant="dark" />
      <div className="mx-auto flex min-h-0 w-full max-w-[100vw] flex-1 flex-col px-2 py-1.5 sm:px-3 md:px-4">
        <header className="mb-1.5 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1.5 sm:px-3">
          <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
            {d.pageTitle}
          </h1>
          <p className="min-w-0 flex-1 truncate text-[10px] text-slate-400 sm:text-[11px]">
            {d.pageSubtitle}
          </p>
          <p className="rounded border border-amber-500/25 bg-amber-950/40 px-2 py-0.5 text-[9px] text-amber-100/90 sm:text-[10px]">
            {d.costHint}
          </p>
        </header>

        <p className="mb-1.5 shrink-0 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-400 md:hidden">
          {m.ultraCanvas.mobileDesktopOnly}
        </p>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ProCanvas uxVariant="v2" startMode="describe" />
        </div>
      </div>
    </main>
  );
}
