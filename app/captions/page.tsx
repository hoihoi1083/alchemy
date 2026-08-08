"use client";

import { Suspense, useEffect, useState } from "react";
import { CaptionStudioClient } from "@/components/captions/CaptionStudioClient";
import { StudioGlowShell } from "@/components/studio/StudioGlowShell";
import { StudioNav } from "@/components/studio/StudioNav";
import { useLocale } from "@/components/LocaleProvider";
import { STUDIO_PAGE_GLOW } from "@/lib/studio-glow";

function CaptionsPageContent() {
  const { m } = useLocale();
  const t = m.captions;

  return (
    <StudioGlowShell theme={STUDIO_PAGE_GLOW.captions}>
      <StudioNav variant="dark" />
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
        </header>

        <CaptionStudioClient />
      </div>
    </StudioGlowShell>
  );
}

export default function CaptionsPage() {
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
      <CaptionsPageContent />
    </Suspense>
  );
}
