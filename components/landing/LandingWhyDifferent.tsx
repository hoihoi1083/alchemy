"use client";

import { useLocale } from "@/components/LocaleProvider";

export function LandingWhyDifferent() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          {L.whyTitle}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {L.whyItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 h-8 w-8 rounded-lg bg-violet-100 text-center text-lg leading-8 text-violet-700">
                ◆
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
