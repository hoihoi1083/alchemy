"use client";

import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";

export function GetSamplePackShell({
  variant,
  children,
}: {
  variant: "form" | "thanks";
  children: ReactNode;
}) {
  const { m } = useLocale();
  const S = m.landing.samplePack;

  return (
    <main className="landing-sample-pack relative flex min-h-screen flex-col overflow-hidden text-white supports-[min-height:100dvh]:min-h-dvh">
      <style>{`
        .landing-sample-pack {
          /* Same deep navy + brand glows as landing footer */
          background-color: #070b16;
          background-image:
            radial-gradient(ellipse 90% 80% at 8% 100%, rgba(108, 59, 255, 0.55) 0%, transparent 55%),
            radial-gradient(ellipse 70% 65% at 92% 0%, rgba(139, 92, 246, 0.38) 0%, transparent 50%),
            radial-gradient(ellipse 55% 50% at 55% 45%, rgba(76, 37, 212, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse 40% 45% at 30% 15%, rgba(108, 59, 255, 0.14) 0%, transparent 55%);
        }
        .landing-sample-pack::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.16) 1px,
            transparent 1.2px
          );
          background-size: 20px 20px;
          background-position: 0 0;
          opacity: 0.55;
          mask-image: radial-gradient(
            ellipse 95% 90% at 50% 50%,
            #000 35%,
            transparent 100%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 95% 90% at 50% 50%,
            #000 35%,
            transparent 100%
          );
        }
      `}</style>
      <div className="relative z-10 flex min-h-screen flex-1 flex-col supports-[min-height:100dvh]:min-h-dvh">
        <LandingNav />
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:py-14">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {variant === "form" ? S.title : S.thanksTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              {variant === "form" ? S.body : S.thanksBody}
            </p>
          </div>
          <div className="mt-8">{children}</div>
        </div>
        <LandingFooter />
      </div>
    </main>
  );
}
