"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const HERO_IMG = "/images/landing/landing-hero-product.png";
const THUMB_A = "/images/landing/landing-canvas-skincare.png";
const THUMB_B = "/images/landing/landing-tpl-sunscreen.png";
const THUMB_C = "/images/landing/landing-result-coffee.png";

export function LandingHero() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="product" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_60%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:pb-20 lg:pt-14">
        <div>
          <span className="inline-flex rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            {L.badge}
          </span>

          <h1 className="mt-5 text-[2.35rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl">
            {L.titleBefore}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              {L.titleHighlight}
            </span>
            {L.titleAfter}
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-600">{L.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"
            >
              {L.ctaPrimary}
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300"
            >
              <span className="text-violet-600">▶</span>
              {L.ctaSecondary}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {L.heroTrust.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[13px] font-medium text-indigo-600">
                <span className="text-violet-500">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-400">
            {L.builtForLabel}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {L.builtFor.map((item) => (
              <li
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* UI mock visual — matches PDF hero composition */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-200/50 via-violet-200/40 to-transparent blur-2xl" />

          <div className="relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-2xl shadow-violet-300/30">
            <div className="flex">
              <aside className="hidden w-16 shrink-0 flex-col items-center gap-4 border-r border-slate-100 bg-slate-50 py-4 sm:flex">
                {L.heroSidebar.map((label) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-[10px] text-violet-700">
                      ◆
                    </span>
                    <span className="max-w-[3.2rem] text-center text-[8px] font-medium leading-tight text-slate-500">
                      {label}
                    </span>
                  </div>
                ))}
              </aside>

              <div className="min-w-0 flex-1 p-3 sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_IMG}
                  alt={L.heroImageAlt}
                  className="aspect-[5/4] w-full rounded-xl object-cover"
                />
                <div className="mt-3 flex gap-2 overflow-hidden">
                  {[THUMB_A, THUMB_B, THUMB_C].map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 top-8 w-[42%] rounded-2xl border border-white/90 bg-white/95 p-3 shadow-xl backdrop-blur sm:right-0 sm:top-10 sm:w-48">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
              {L.heroPanelTitle}
            </p>
            <div className="mt-2 space-y-2">
              {L.heroPanelBars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
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
