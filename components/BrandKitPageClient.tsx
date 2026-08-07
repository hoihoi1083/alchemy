"use client";

import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { useLocale } from "@/components/LocaleProvider";

/**
 * Dedicated brand kit page — edit logo/colors before generating video.
 * Kit syncs to localStorage + cloud; studio reads the same kit.
 */
export function BrandKitPageClient() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/40 text-slate-900">
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
          {L.brandKitBadge}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {L.brandKitTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          {L.brandKitBody}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{L.brandKitLogoTip}</p>

        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
          <BrandKitPanel variant="light" />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/start"
            className="inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-violet-500"
          >
            {L.brandKitCta}
          </Link>
          <Link
            href="/studio"
            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 hover:border-violet-200 hover:text-violet-700"
          >
            {L.openStudio}
          </Link>
        </div>
      </main>
    </div>
  );
}
