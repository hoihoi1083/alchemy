"use client";

import { useLocale } from "@/components/LocaleProvider";

const REF = "/images/landing/landing-ref-coffee.png";
const RESULT = "/images/landing/landing-result-coffee.png";

export function LandingReferenceCompare() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-[2.75rem] md:leading-tight">
            {L.refTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            {L.refBody}
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-[520px] grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:mt-8 sm:max-w-[560px] sm:gap-3 md:gap-4">
          <figure className="min-w-0">
            <div className="mb-2 flex justify-center">
              <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                {L.refCardLabel}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={REF}
              alt={L.refCardAlt}
              className="aspect-[4/3] w-full rounded-xl object-cover sm:rounded-2xl"
            />
          </figure>

          <div
            className="mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm text-white shadow-md shadow-violet-600/25 sm:mt-7 sm:h-9 sm:w-9"
            aria-hidden
          >
            <span className="landing-arrow-pulse inline-block">→</span>
          </div>

          <figure className="min-w-0">
            <div className="mb-2 flex justify-center">
              <span className="inline-flex rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                {L.resultCardLabel}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={RESULT}
              alt={L.resultCardAlt}
              className="aspect-[4/3] w-full rounded-xl object-cover sm:rounded-2xl"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
