"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { useLocale } from "@/components/LocaleProvider";
import { isTemplateId } from "@/lib/template-pref";
import { studioHref, type PromotionMode } from "@/lib/promotion-mode";

function StartPageBody() {
  const { m } = useLocale();
  const searchParams = useSearchParams();
  const templateRaw = searchParams.get("template");
  const templateId = isTemplateId(templateRaw) ? templateRaw : null;
  const templateCopy = templateId ? m.templates[templateId] : null;

  const cards: Array<{
    mode: PromotionMode;
    title: string;
    description: string;
    examples: string;
    icon: string;
  }> = [
    {
      mode: "physical",
      icon: "📦",
      title: m.start.physicalTitle,
      description: m.start.physicalDesc,
      examples: m.start.physicalExamples,
    },
    {
      mode: "concept",
      icon: "💡",
      title: m.start.conceptTitle,
      description: m.start.conceptDesc,
      examples: m.start.conceptExamples,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/alchemy-logo.png"
              alt="alchemy.ai logo"
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="text-base font-semibold">alchemy.ai</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="light" />
            <AuthNav />
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{m.start.title}</h1>
        <p className="mt-3 text-base text-slate-600">{m.start.subtitle}</p>

        {templateId && templateCopy && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">
              {m.start.templateBanner.replace("{name}", templateCopy.name)}
            </p>
            <p className="mt-1 text-emerald-900/90">{m.start.templateBannerHint}</p>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const href = studioHref(
              card.mode,
              card.mode === "physical" ? (templateId ?? undefined) : undefined,
            );
            const highlighted = templateId && card.mode === "physical";
            return (
              <Link
                key={card.mode}
                href={href}
                className={`group rounded-2xl border bg-slate-50 p-5 text-left transition hover:shadow-md ${
                  highlighted
                    ? "border-emerald-400 ring-2 ring-emerald-200 hover:bg-emerald-50/40"
                    : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40"
                }`}
              >
                <p className="text-2xl">{card.icon}</p>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
                <p className="mt-3 text-xs text-slate-500">{card.examples}</p>
                <p className="mt-4 text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">
                  {highlighted ? m.start.templateContinuePhysical : m.start.continueLabel} →
                </p>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">{m.start.switchLaterHint}</p>
      </section>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface="start" />
    </main>
  );
}

export function StartPageClient() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
          …
        </main>
      }
    >
      <StartPageBody />
    </Suspense>
  );
}
