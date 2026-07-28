"use client";

import { useLocale } from "@/components/LocaleProvider";

const REF = "/images/landing/landing-ref-coffee.png";
const RESULT = "/images/landing/landing-result-coffee.png";

export function LandingReferenceCompare() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{L.refTitle}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {L.refBody}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={REF} alt={L.refCardAlt} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
              {L.refCardLabel}
            </figcaption>
          </figure>
          <div className="hidden text-center text-2xl text-violet-500 sm:block" aria-hidden>
            →
          </div>
          <figure className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={RESULT} alt={L.resultCardAlt} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="px-3 py-2 text-center text-xs font-semibold text-violet-700">
              {L.resultCardLabel}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
