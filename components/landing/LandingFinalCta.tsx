"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const CTA_BG = "/images/landing/landing-cta-gradient.png";
const CTA_VISUAL = "/images/landing/landing-hero-product.png";

export function LandingFinalCta() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CTA_BG}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-violet-900/55" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 py-16 lg:grid-cols-2">
        <div className="text-white">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{L.finalTitle}</h2>
          <p className="mt-4 max-w-md text-sm text-violet-100 sm:text-base">{L.finalBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow hover:bg-violet-50"
            >
              {L.tryFree}
            </Link>
            <a
              href="#how"
              className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              {L.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CTA_VISUAL}
            alt=""
            className="aspect-[16/10] w-full rounded-2xl object-cover"
          />
        </div>
      </div>
    </section>
  );
}
