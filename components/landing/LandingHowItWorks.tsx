"use client";

import { useLocale } from "@/components/LocaleProvider";

const ICONS = ["☁↑", "◎", "✎", "✦"];

export function LandingHowItWorks() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{L.howTitle}</h2>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">{L.howSubtitle}</p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {L.howSteps.map((step, i) => (
            <li key={step.title} className="relative">
              {i < L.howSteps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute -right-2 top-12 z-10 hidden text-violet-400 lg:block"
                >
                  →
                </span>
              ) : null}
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-2xl text-violet-500" aria-hidden>
                    {ICONS[i] ?? "◆"}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
