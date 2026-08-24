"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { StudioGlowShell } from "@/components/studio/StudioGlowShell";
import { STUDIO_PAGE_GLOW } from "@/lib/studio-glow";

const EditImage2Client = dynamic(
  () =>
    import("@/components/edit-image-2/EditImage2Client").then((m) => ({
      default: m.EditImage2Client,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="py-20 text-center text-sm text-slate-500">Loading layer editor…</p>
    ),
  },
);

export default function EditImage2Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <StudioGlowShell theme={STUDIO_PAGE_GLOW.editImage}>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">…</div>
      </StudioGlowShell>
    );
  }

  return (
    <Suspense
      fallback={
        <StudioGlowShell theme={STUDIO_PAGE_GLOW.editImage}>
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">…</div>
        </StudioGlowShell>
      }
    >
      <StudioGlowShell theme={STUDIO_PAGE_GLOW.editImage}>
        <LandingNav />
        <EditImage2Client />
      </StudioGlowShell>
    </Suspense>
  );
}
