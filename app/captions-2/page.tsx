"use client";

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
    <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions} fillViewport>
      <LandingNav />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-2 pb-2 pt-1 sm:px-3">
        <header className="mb-1 flex shrink-0 flex-wrap items-baseline justify-between gap-2 px-1">
          <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
            {t.title}
          </h1>
          <p className="max-w-lg text-right text-[10px] leading-snug text-slate-500">
            {t.subtitle}
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <CaptionStudio2Client />
        </div>
      </div>
    </StudioGlowShell>
  );
}

export default function Captions2Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions} fillViewport>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          …
        </div>
      </StudioGlowShell>
    );
  }

  return (
    <Suspense
      fallback={
        <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions} fillViewport>
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
