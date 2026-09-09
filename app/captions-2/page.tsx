"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { CaptionStudio2Client } from "@/components/captions/CaptionStudio2Client";
import { LandingNav } from "@/components/landing/LandingNav";
import { StudioGlowShell } from "@/components/studio/StudioGlowShell";
import { useLocale } from "@/components/LocaleProvider";
import { STUDIO_PAGE_GLOW } from "@/lib/studio-glow";

function Captions2PageContent() {
  const { m } = useLocale();
  const t = m.captions2;

  return (
    <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions}>
      <LandingNav />
      <div className="mx-auto w-full max-w-[1800px] px-3 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-24 lg:px-8 xl:pb-24">
        <header className="mb-5 text-center sm:mb-6">
          <p className="text-xs font-medium tracking-wide text-cyan-300 sm:text-sm">
            {t.badge}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t.subtitle}
          </p>
          <p className="mt-3 text-xs">
            <Link
              href="/captions"
              className="text-cyan-300/90 underline hover:text-cyan-200"
            >
              {t.openClassic}
            </Link>
          </p>
        </header>

        <CaptionStudio2Client />
      </div>
    </StudioGlowShell>
  );
}

export default function Captions2Page() {
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
      <Captions2PageContent />
    </Suspense>
  );
}
