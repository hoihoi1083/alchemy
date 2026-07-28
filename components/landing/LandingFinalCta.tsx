"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const CTA_VISUAL = "/images/landing/landing-hero-product.png";

export function LandingFinalCta() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-white px-4 py-10 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-500 via-violet-600 to-purple-700 text-white shadow-2xl">
        <div className="relative grid items-center gap-8 px-8 py-12 lg:grid-cols-2 lg:px-12 lg:py-14">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{L.finalTitle}</h2>
            <p className="mt-4 max-w-md text-sm text-violet-100 sm:text-base">{L.finalBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/start"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow hover:bg-violet-50"
              >
                {L.ctaPrimary}
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <span>▶</span>
                {L.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/25 bg-white/15 p-2 shadow-2xl backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CTA_VISUAL}
              alt=""
              className="aspect-[16/10] w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
