"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const SCENARIO_IMGS = [
  "/images/landing/landing-tpl-sunscreen.png",
  "/images/landing/landing-canvas-skincare.png",
  "/images/landing/landing-result-coffee.png",
  "/images/landing/landing-hero-product.png",
  "/images/landing/landing-ref-coffee.png",
  "/images/landing/landing-tpl-service.png",
];

export function LandingScenarios() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="use-cases" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          {L.scenariosTitle}
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {L.scenarios.map((s, i) => (
            <Link
              key={s.title}
              href="/start"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SCENARIO_IMGS[i % SCENARIO_IMGS.length]}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {s.title}
                  <span className="text-violet-500">→</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
