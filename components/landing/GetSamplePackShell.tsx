"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

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
    <main className="landing-sample-pack min-h-screen text-white">
      <style>{`
        .landing-sample-pack {
          background-color: #070b16;
          background-image:
            radial-gradient(ellipse 90% 80% at 8% 100%, rgba(108, 59, 255, 0.45) 0%, transparent 55%),
            radial-gradient(ellipse 70% 65% at 92% 0%, rgba(139, 92, 246, 0.32) 0%, transparent 50%);
        }
      `}</style>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-14">
        <div className="mb-8 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_LOGO_SRC}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            {PRODUCT_NAME}
          </span>
        </div>
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
    </main>
  );
}
