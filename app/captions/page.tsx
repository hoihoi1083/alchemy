"use client";

import { Suspense, useEffect, useState } from "react";
import { CaptionStudioClient } from "@/components/captions/CaptionStudioClient";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";

function CaptionsPageContent() {
  const { m } = useLocale();
  const t = m.captions;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#111827_45%,#020617_100%)] text-slate-100">
      <LandingNav />
      <div className="mx-auto w-full max-w-[1800px] px-3 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-24 lg:px-8 xl:pb-24">
        <header className="mb-5 text-center sm:mb-6">
          <p className="text-xs font-medium tracking-wide text-violet-300 sm:text-sm">
            {t.badge}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t.subtitle}
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
