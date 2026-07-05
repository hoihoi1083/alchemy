"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { VisualCaptionStudioClient } from "@/components/captions/VisualCaptionStudioClient";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";

function VisualCaptionsPageContent() {
  const { m } = useLocale();
  const t = m.visualCaptions;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0c4a6e_0%,#0f172a_45%,#020617_100%)] text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 pb-24 sm:px-6">
        <header className="mb-8 rounded-3xl border border-cyan-500/20 bg-slate-950/60 px-4 py-6 text-center shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-center gap-2">
            <LanguageToggle variant="dark" />
            <AuthNav />
          </div>
          <p className="text-sm font-medium tracking-wide text-cyan-300">{t.badge}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-400">
            {t.subtitle}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/" className="mr-3 text-slate-400 underline hover:text-slate-300">
              {m.header.homeLink}
            </Link>
            <Link href="/captions" className="text-violet-400 underline hover:text-violet-300">
              {m.landing.captionsLink}
            </Link>
          </p>
        </header>

        <VisualCaptionStudioClient />
      </div>
    </main>
  );
}

export default function VisualCaptionsPage() {
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
      <VisualCaptionsPageContent />
    </Suspense>
  );
}
