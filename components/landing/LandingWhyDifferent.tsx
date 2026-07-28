"use client";

import { useLocale } from "@/components/LocaleProvider";

export function LandingWhyDifferent() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          {L.whyTitle}
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {L.whyItems.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl text-violet-600">
                ◆
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
