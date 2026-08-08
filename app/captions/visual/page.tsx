"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { VisualCaptionStudioClient } from "@/components/captions/VisualCaptionStudioClient";
import { LandingNav } from "@/components/landing/LandingNav";
import { StudioGlowShell } from "@/components/studio/StudioGlowShell";
import { useLocale } from "@/components/LocaleProvider";
import { STUDIO_PAGE_GLOW } from "@/lib/studio-glow";

function VisualCaptionsPageContent() {
  const { m } = useLocale();
  const t = m.visualCaptions;

  return (
    <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions}>
      <LandingNav />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-24 sm:px-6">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium tracking-wide text-cyan-300">{t.badge}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-400">
            {t.subtitle}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            <Link href="/captions" className="text-cyan-400 underline hover:text-cyan-300">
              {m.landing.captionsLink}
            </Link>
          </p>
        </header>

        <VisualCaptionStudioClient />
      </div>
    </StudioGlowShell>
  );
}

export default function VisualCaptionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions}>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          …
        </div>
      </StudioGlowShell>
    );
  }

  return (
    <Suspense
      fallback={
        <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions}>
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            …
          </div>
        </StudioGlowShell>
      }
    >
      <VisualCaptionsPageContent />
    </Suspense>
  );
}
