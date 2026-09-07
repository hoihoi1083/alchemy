"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
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
      <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
        Loading layer editor…
      </p>
    ),
  },
);

/**
 * Do NOT gate on a local `mounted` flag — that remounts the editor on Fast Refresh
 * and wipes in-progress layers. Client state is restored from sessionStorage.
 *
 * Height must be inline (same as Ultra / ProCanvas): Tailwind v4 may not emit `h-dvh`.
 */
export default function EditImage2Page() {
  return (
    <Suspense
      fallback={
        <StudioGlowShell theme={STUDIO_PAGE_GLOW.editImage} fillViewport>
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">…</div>
        </StudioGlowShell>
      }
    >
      <StudioGlowShell theme={STUDIO_PAGE_GLOW.editImage} fillViewport>
        <LandingNav />
        <div
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          style={{ minHeight: 0, flex: "1 1 0%" }}
        >
          <EditImage2Client />
        </div>
      </StudioGlowShell>
    </Suspense>
  );
}
