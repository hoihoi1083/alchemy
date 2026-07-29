"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const REF = "/images/landing/landing-ref-coffee.png";
const RESULT = "/images/landing/landing-result-coffee.png";

/** Display size capped — source PNGs are huge and must not drive layout. */
const IMG_W = 450;
const IMG_H = 338; // ~4:3

export function LandingReferenceCompare() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="reference" className="w-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem] md:leading-snug">
              {L.refTitle}
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-600">
              {L.refBody}
            </p>
          </div>
        </Reveal>

        {/* One Reveal for the whole row — per-item Reveal broke flex centering */}
        <Reveal delayMs={100} distance={36} scaleFrom={0.96}>
          <div className="mx-auto mt-8 flex w-fit max-w-full items-center justify-center gap-6 sm:mt-9 sm:gap-8 md:gap-10">
            <CompareCard
              label={L.refCardLabel}
              labelClassName="bg-slate-900"
              src={REF}
              alt={L.refCardAlt}
            />

            <div
              className="mt-[7px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm text-white shadow-md shadow-violet-600/35"
              aria-hidden
            >
              <span className="landing-arrow-pulse inline-block leading-none">→</span>
            </div>

            <CompareCard
              label={L.resultCardLabel}
              labelClassName="bg-violet-600"
              src={RESULT}
              alt={L.resultCardAlt}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CompareCard({
  label,
  labelClassName,
  src,
  alt,
}: {
  label: string;
  labelClassName: string;
  src: string;
  alt: string;
}) {
  return (
    <figure
      className="relative m-0 w-[min(450px,calc((100vw-8rem)/2))] shrink-0 sm:w-[450px]"
      style={{ maxWidth: IMG_W }}
    >
      <div className="relative pt-3.5">
        <span
          className={`absolute left-1/2 top-3.5 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-md ring-2 ring-white ${labelClassName}`}
        >
          {label}
        </span>
        <div
          className="w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm"
          style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={IMG_W}
            height={IMG_H}
            className="block h-full w-full object-cover"
            decoding="async"
          />
        </div>
      </div>
    </figure>
  );
}
