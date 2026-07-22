"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CaptionStudioClient } from "@/components/captions/CaptionStudioClient";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";

function CaptionsPageContent() {
  const { m } = useLocale();
  const t = m.captions;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#111827_45%,#020617_100%)] text-slate-100">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 xl:pb-24">
        <header className="mb-5 rounded-3xl border border-white/10 bg-slate-950/60 px-3 py-5 text-center shadow-sm backdrop-blur sm:mb-8 sm:px-4 sm:py-6">
          <div className="mb-3 flex items-center justify-center gap-2 sm:mb-4">
            <LanguageToggle variant="dark" />
            <AuthNav />
          </div>
          <p className="text-sm font-medium tracking-wide text-violet-300">{t.badge}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{t.title}</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-[15px]">
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

        <CaptionStudioClient />
      </div>
    </main>
  );
}

export default function CaptionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">
        …
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">
          …
        </main>
      }
    >
      <CaptionsPageContent />
    </Suspense>
  );
}
