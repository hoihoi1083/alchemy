"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

/** 1:1 with landing.scenarios order (ecom → beauty → food → education → real estate → SaaS). */
const SCENARIO_IMGS = [
  "/images/landing/scenario-ecommerce.png?v=2",
  "/images/landing/scenario-beauty.png?v=2",
  "/images/landing/scenario-food.png?v=2",
  "/images/landing/scenario-education.png?v=2",
  "/images/landing/scenario-realestate.png?v=2",
  "/images/landing/scenario-saas.png?v=2",
] as const;

export function LandingScenarios() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="use-cases" className="w-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {L.scenariosTitle}
          </h2>
        </Reveal>

        <div className="landing-scenarios-grid mt-8 grid grid-cols-2 items-stretch gap-3">
          {L.scenarios.map((s, i) => (
            <Reveal
              key={s.title}
              delayMs={i * 90}
              distance={44}
              scaleFrom={0.94}
              className="h-full"
            >
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SCENARIO_IMGS[i]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-h-[4.25rem] flex-1 flex-col p-2.5">
                  <p className="text-[12px] font-semibold leading-snug text-slate-900">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
