"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

export function LandingScenarios() {
  const { m } = useLocale();
  const L = m.landing;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="use-cases" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{L.scenariosTitle}</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">{L.scenariosSubtitle}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {L.scenarios.map((s, i) => {
            const isOpen = open === i;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-violet-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{s.title}</p>
                    {isOpen ? (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                    ) : null}
                  </div>
                  <span className="text-violet-600">{isOpen ? "−" : "+"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
