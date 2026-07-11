"use client";

import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { TemplateGallery } from "@/components/TemplateGallery";
import { useLocale } from "@/components/LocaleProvider";

export function LandingPageClient() {
  const { m } = useLocale();
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/alchemy-logo.png"
              alt="alchemy.ai logo"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <p className="text-lg font-semibold tracking-tight">alchemy.ai</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LanguageToggle variant="light" />
            <AuthNav />
            <Link
              href="/start"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
            >
              {m.landing.openStudio}
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {m.landing.badge}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{m.landing.title}</h1>
            <p className="mt-5 max-w-xl text-base text-slate-600">{m.landing.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/start"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white"
              >
                {m.landing.startCreating}
              </Link>
              <a
                href="#how"
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700"
              >
                {m.landing.howItWorks}
              </a>
              <Link
                href="/captions"
                className="rounded-full border border-violet-300 px-6 py-3 text-sm font-medium text-violet-800"
              >
                {m.landing.captionsLink}
              </Link>
              <Link
                href="/edit-image"
                className="rounded-full border border-cyan-300 px-6 py-3 text-sm font-medium text-cyan-900"
              >
                {m.landing.imageCanvasLink}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {m.landing.demoItems.map((x) => (
                <div
                  key={x}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                >
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TemplateGallery />

      <section id="how" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <p className="text-sm text-slate-600">{m.landing.howInlineIntro}</p>
            <Link
              href="/how"
              className="text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              {m.landing.howReadMore}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
          {m.landing.steps.map((s) => (
            <div key={s.no} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-400">{s.no}</p>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
          </div>
        </div>
      </section>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface="landing" />
    </main>
  );
}
