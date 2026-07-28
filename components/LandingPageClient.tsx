"use client";

import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingReferenceCompare } from "@/components/landing/LandingReferenceCompare";
import { LandingEditableCanvas } from "@/components/landing/LandingEditableCanvas";
import { LandingTemplatesShowcase } from "@/components/landing/LandingTemplatesShowcase";
import { LandingWhyDifferent } from "@/components/landing/LandingWhyDifferent";
import { LandingScenarios } from "@/components/landing/LandingScenarios";
import { LandingPricingTeaser } from "@/components/landing/LandingPricingTeaser";
import { LandingTokensAndFaq } from "@/components/landing/LandingTokensAndFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";

export function LandingPageClient() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <>
      <main className="flex min-h-screen flex-col bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
        <LandingNav />
        <LandingHero />
        <LandingHowItWorks />
        <LandingReferenceCompare />
        <LandingEditableCanvas />
        <LandingTemplatesShowcase />
        <LandingWhyDifferent />
        <LandingScenarios />

        <section id="brand-kit" className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {L.brandKitBadge}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {L.brandKitTitle}
              </h2>
              <p className="mt-3 max-w-lg text-sm text-slate-600">{L.brandKitBody}</p>
              <p className="mt-3 max-w-lg text-sm text-slate-500">{L.brandKitLogoTip}</p>
              <Link
                href="/start"
                className="mt-6 inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                {L.brandKitCta}
              </Link>
            </div>
            <BrandKitPanel variant="light" />
          </div>
        </section>

        <LandingPricingTeaser />
        <LandingTokensAndFaq />
        <LandingFinalCta />
        <SiteFooter />
      </main>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface="landing" />
    </>
  );
}
