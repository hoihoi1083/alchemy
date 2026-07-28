"use client";

import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { SiteFooter } from "@/components/SiteFooter";
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

export function LandingPageClient() {
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
