import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { TryStylePackClient } from "@/components/try/TryStylePackClient";
import { PRODUCT_NAME } from "@/lib/brand";
import { getStylePack, listStylePacks } from "@/lib/style-packs";

export const metadata: Metadata = {
  title: `Try this style · ${PRODUCT_NAME}`,
  description:
    "Upload your product and name — get the same locked editorial look as our social post, without writing prompts.",
  robots: { index: true, follow: true },
};

type Search = { pack?: string | string[] };

export default async function TryStylePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.pack) ? sp.pack[0] : sp.pack;
  const pack = getStylePack(raw) ?? listStylePacks()[0];

  if (!pack) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b16] text-white">
        <p>No style packs configured.</p>
      </main>
    );
  }

  return (
    <main className="try-style-page relative flex min-h-screen flex-col overflow-x-hidden text-white supports-[min-height:100dvh]:min-h-dvh">
      <style>{`
        .try-style-page {
          background-color: #070b16;
          background-image:
            radial-gradient(ellipse 90% 80% at 8% 100%, rgba(108, 59, 255, 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 70% 65% at 92% 0%, rgba(139, 92, 246, 0.32) 0%, transparent 50%),
            radial-gradient(ellipse 55% 50% at 55% 45%, rgba(76, 37, 212, 0.18) 0%, transparent 60%);
        }
      `}</style>
      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <LandingNav />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 md:py-10">
          <Suspense
            fallback={
              <div className="mx-auto h-72 w-full max-w-5xl animate-pulse rounded-2xl bg-white/5" />
            }
          >
            <TryStylePackClient pack={pack} />
          </Suspense>
        </div>
        <LandingFooter />
      </div>
    </main>
  );
}
