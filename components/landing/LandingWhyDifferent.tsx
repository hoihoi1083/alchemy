"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const WHY_ICONS = [
  "/images/landing/why-icon-guided.png?v=2",
  "/images/landing/why-icon-reference.png?v=2",
  "/images/landing/why-icon-storyboard.png?v=2",
  "/images/landing/why-icon-editable.png?v=2",
  "/images/landing/why-icon-products.png?v=2",
  "/images/landing/why-icon-tokens.png?v=2",
] as const;

export function LandingWhyDifferent() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="why" className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            {L.whyTitle}
          </h2>
        </Reveal>
        <div className="landing-why-grid mt-10 grid grid-cols-2 gap-x-4 gap-y-8">
          {L.whyItems.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 95} distance={44} scaleFrom={0.94}>
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={WHY_ICONS[i]}
                  alt=""
                  className="mx-auto mb-3 aspect-square h-14 w-14 object-contain object-center sm:h-16 sm:w-16"
                />
                <h3 className="text-[13px] font-semibold leading-snug text-slate-900 md:text-sm">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 md:text-xs">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
