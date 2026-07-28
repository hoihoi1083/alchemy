"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const HERO_IMG = "/images/landing/landing-hero-product.png";

export function LandingHero() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="product" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-40 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-20 lg:pt-16">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            {L.badge}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
            {L.titleBefore}
            <span className="relative mx-1 inline-block text-violet-600">
              {L.titleHighlight}
              <span
                aria-hidden
                className="absolute -inset-x-1 -bottom-1 -top-0.5 -z-10 rounded-full border-2 border-violet-400/70"
              />
            </span>
            {L.titleAfter}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">{L.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-500"
            >
              {L.ctaPrimary}
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] text-violet-700">
                ▶
              </span>
              {L.ctaSecondary}
            </a>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {L.heroTrust.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-sky-50 p-3 shadow-xl shadow-violet-200/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMG}
              alt={L.heroImageAlt}
              className="aspect-[16/10] w-full rounded-2xl object-cover"
            />
          </div>

          <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-lg backdrop-blur sm:left-auto sm:right-6 sm:w-64">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              {L.heroPanelTitle}
            </p>
            <div className="mt-3 space-y-2">
              {L.heroPanelBars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>{bar.label}</span>
                    <span>{bar.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
