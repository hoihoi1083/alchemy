"use client";

import { Fragment } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const STEP_ICONS = [
  "/images/landing/how-icon-upload.png",
  "/images/landing/how-icon-analyze.png",
  "/images/landing/how-icon-edit.png",
  "/images/landing/how-icon-generate.png",
];

export function LandingHowItWorks() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="how" className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{L.howTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{L.howSubtitle}</p>
          </div>
        </Reveal>

        {/*
          Desktop: card | arrow | card | arrow | card | arrow | card
          (arrows are real columns, not absolute overlays — so they sit between cards)
        */}
        <ol className="landing-how-grid mt-10 grid grid-cols-1 items-stretch gap-4 md:gap-5">
          {L.howSteps.map((step, i) => (
            <Fragment key={step.title}>
              <li className="min-w-0">
                <Reveal delayMs={i * 110} distance={52} scaleFrom={0.9} className="h-full">
                  <div className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 pt-5 shadow-sm">
                    <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={STEP_ICONS[i]}
                      alt=""
                      className="mx-auto mb-3 aspect-square h-20 w-20 object-contain object-center sm:h-24 sm:w-24"
                    />
                    <h3 className="text-center text-sm font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-500">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              </li>

              {i < L.howSteps.length - 1 ? (
                <li
                  className="landing-how-arrow items-center justify-center self-center"
                  aria-hidden
                >
                  <Reveal delayMs={i * 110 + 180} distance={0} scaleFrom={0.65} className="flex">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-lg font-semibold leading-none text-violet-600 shadow-sm ring-2 ring-white">
                      <span className={`landing-arrow-pulse landing-arrow-pulse--${i}`}>
                        →
                      </span>
                    </span>
                  </Reveal>
                </li>
              ) : null}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
