"use client";

import { Suspense } from "react";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UgcStudioClient } from "@/components/ugc/UgcStudioClient";
import { useLocale } from "@/components/LocaleProvider";

function UgcPageContent() {
  const { m } = useLocale();
  const t = m.ugcStudio;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f0a14_0%,#111827_45%,#020617_100%)] text-slate-100">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-5 pb-24 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-5 rounded-3xl border border-white/10 bg-slate-950/60 px-3 py-5 text-center shadow-sm backdrop-blur sm:mb-8 sm:px-4 sm:py-6">
          <div className="mb-3 flex items-center justify-center gap-2 sm:mb-4">
            <LanguageToggle variant="dark" />
            <AuthNav />
          </div>
          <p className="text-sm font-medium tracking-wide text-rose-300">{t.badge}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-[15px]">
            {t.subtitle}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/" className="mr-3 text-slate-400 underline hover:text-slate-300">
              {m.header.homeLink}
            </Link>
            <Link href="/start" className="text-emerald-400 underline hover:text-emerald-300">
              {m.landing.openStudio}
            </Link>
          </p>
        </header>

        <UgcStudioClient />
      </div>
    </main>
  );
}

export default function UgcPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
          …
        </main>
      }
    >
      <UgcPageContent />
    </Suspense>
  );
}
