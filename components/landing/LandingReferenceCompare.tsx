"use client";

import { useLocale } from "@/components/LocaleProvider";

const REF = "/images/landing/landing-ref-coffee.png";
const RESULT = "/images/landing/landing-result-coffee.png";

export function LandingReferenceCompare() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-14">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {L.refTitle}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {L.refBody}
          </p>
        </div>

        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="px-3 pt-3">
              <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                {L.refCardLabel}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={REF} alt={L.refCardAlt} className="mt-2 aspect-[4/3] w-full object-cover" />
          </figure>

          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/30"
            aria-hidden
          >
            →
          </div>

          <figure className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/30 shadow-sm">
            <div className="px-3 pt-3">
              <span className="inline-flex rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white">
                {L.resultCardLabel}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={RESULT}
              alt={L.resultCardAlt}
              className="mt-2 aspect-[4/3] w-full object-cover"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
