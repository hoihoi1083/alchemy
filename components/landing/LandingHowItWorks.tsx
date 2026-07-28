"use client";

import { useLocale } from "@/components/LocaleProvider";

export function LandingHowItWorks() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="how" className="border-t border-slate-100 bg-slate-50/80">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{L.howTitle}</h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">{L.howSubtitle}</p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {L.howSteps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {i + 1}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
