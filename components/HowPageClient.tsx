"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";

export function HowPageClient() {
  const { m } = useLocale();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/alchemy-logo.png" alt="alchemy.ai logo" className="h-10 w-10 object-contain" />
            <p className="text-lg font-semibold tracking-tight">alchemy.ai</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="light" />
            <Link
              href="/start"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
            >
              {m.landing.openStudio}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {m.landing.badge}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{m.landing.howItWorks}</h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600">{m.landing.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              {m.landing.quickStart.quickAd}
            </Link>
            <Link
              href="/start"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700"
            >
              {m.landing.quickStart.storyboard}
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {m.landing.steps.map((s) => (
            <div key={s.no} className="relative rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-400">{s.no}</p>
              <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              <div className="mt-4 h-1 w-full rounded-full bg-linear-to-r from-cyan-400/60 via-indigo-400/60 to-emerald-400/60" />
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{m.landing.highlightsTitle}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {m.landing.highlights.map((h) => (
              <div key={h.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-slate-900">{h.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{h.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-900">{m.landing.sampleTitle}</h2>
            <ol className="mt-4 space-y-3">
              {m.landing.sampleTimeline.map((line, idx) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700">{line}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-900">{m.landing.faqTitle}</h2>
            <div className="mt-4 space-y-3">
              {m.landing.faq.map((item) => (
                <details key={item.q} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">{item.q}</summary>
                  <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white"
            >
            {m.landing.startCreating}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700"
          >
            {m.header.homeLink}
          </Link>
        </div>
      </section>
    </main>
  );
}
