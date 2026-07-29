"use client";

import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingTransformSection } from "@/components/landing/LandingTransformSection";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingReferenceCompare } from "@/components/landing/LandingReferenceCompare";
import { LandingEditableCanvas } from "@/components/landing/LandingEditableCanvas";
import { LandingTemplatesShowcase } from "@/components/landing/LandingTemplatesShowcase";
import { LandingWhyDifferent } from "@/components/landing/LandingWhyDifferent";
import { LandingScenarios } from "@/components/landing/LandingScenarios";
import { LandingPricingTeaser } from "@/components/landing/LandingPricingTeaser";
import { LandingTokensAndFaq } from "@/components/landing/LandingTokensAndFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingBrandKit } from "@/components/landing/LandingBrandKit";
import { LandingProductTools } from "@/components/landing/LandingProductTools";

/**
 * Explicit breakpoints so layouts stay correct even when Tailwind HMR misses utilities.
 * Mobile-first → tablet → MBA 13" (~1280) → desktop.
 */
const LANDING_LAYOUT_CSS = `
/* —— Mobile defaults —— */
.landing-nav-menu-btn { display: inline-flex !important; }
.landing-how-arrow { display: none !important; }

/* Cyber hero — responsive height, crop, scrims */
.landing-hero-cyber {
  min-height: min(70vh, 640px) !important;
}
.landing-hero-inner {
  min-height: min(70vh, 640px) !important;
}
.landing-hero-video {
  object-position: 72% 42% !important;
}
.landing-hero-scrim-x {
  background: linear-gradient(
    90deg,
    #06040f 0%,
    rgba(6, 4, 15, 0.92) 38%,
    rgba(6, 4, 15, 0.55) 62%,
    rgba(6, 4, 15, 0.15) 100%
  ) !important;
}
.landing-hero-scrim-y {
  height: 7rem !important;
  background: linear-gradient(to top, #06040f, transparent) !important;
}

@media (min-width: 640px) {
  .landing-try-free { display: inline-flex !important; }
  .landing-why-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .landing-scenarios-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .landing-pricing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .landing-tokens-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  .landing-how-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .landing-hero-cyber,
  .landing-hero-inner { min-height: min(74vh, 680px) !important; }
  .landing-hero-video { object-position: 70% 45% !important; }
}

/* Tablet / small laptop */
@media (min-width: 768px) {
  .landing-hero-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
  .landing-transform-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr) !important; }
  .landing-brand-kit-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
  .landing-canvas-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
  .landing-cta-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
  .landing-why-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  .landing-scenarios-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  .landing-pricing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  .landing-hero-cyber,
  .landing-hero-inner { min-height: min(78vh, 720px) !important; }
  .landing-hero-video { object-position: 62% 48% !important; }
  .landing-hero-scrim-x {
    background: linear-gradient(
      90deg,
      #06040f 0%,
      rgba(6, 4, 15, 0.88) 32%,
      rgba(6, 4, 15, 0.45) 55%,
      transparent 78%
    ) !important;
  }
}

/* Desktop (~1024+) — full horizontal rows; how-it-works arrows between cards */
@media (min-width: 1024px) {
  .landing-nav-links { display: flex !important; }
  .landing-nav-menu-btn { display: none !important; }
  .landing-nav-mobile { display: none !important; }
  .landing-how-grid {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) !important;
    gap: 0.75rem !important;
  }
  .landing-how-arrow { display: flex !important; }
  .landing-why-grid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
  .landing-scenarios-grid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
  .landing-tokens-grid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
  .landing-hero-cyber,
  .landing-hero-inner { min-height: min(82vh, 780px) !important; }
  .landing-hero-video { object-position: 58% 50% !important; }
}

/* Wide desktop — pricing can fit all 5 plans in one row */
@media (min-width: 1280px) {
  .landing-pricing-grid { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
}

@media (min-width: 1440px) {
  .landing-hero-cyber,
  .landing-hero-inner { min-height: min(84vh, 860px) !important; }
  .landing-hero-video { object-position: center 50% !important; }
}

/* —— Motion: flow arrows nudge right (how + reference) —— */
@keyframes landing-arrow-nudge {
  /* → travels left → right inside the circle, then resets */
  0% { transform: translate3d(-6px, 0, 0); opacity: 0.35; }
  12% { opacity: 1; }
  45% { transform: translate3d(6px, 0, 0); opacity: 1; }
  55%, 100% { transform: translate3d(6px, 0, 0); opacity: 0.2; }
}
.landing-arrow-pulse {
  display: inline-block;
  animation: landing-arrow-nudge 1.8s ease-in-out infinite;
  will-change: transform, opacity;
}
/* Wave: leftmost circle first, then middle, then right */
.landing-arrow-pulse--0 { animation-delay: 0s; }
.landing-arrow-pulse--1 { animation-delay: 0.45s; }
.landing-arrow-pulse--2 { animation-delay: 0.9s; }
@keyframes landing-hero-in {
  from {
    opacity: 0;
    transform: translate3d(0, 28px, 0);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }
}
.landing-hero-copy {
  animation: landing-hero-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .landing-arrow-pulse,
  .landing-hero-copy {
    animation: none !important;
  }
  .landing-arrow-pulse {
    opacity: 1 !important;
    transform: none !important;
  }
}
`;


/** Mid-landing sections (transform → final CTA). Keep true for full landing. */
const SHOW_LANDING_BELOW_HOW = true;

export function LandingPageClient() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_LAYOUT_CSS }} />
      <main className="flex min-h-screen flex-col overflow-x-clip bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
        <LandingNav />
        <LandingHero />
        <LandingHowItWorks />
        {SHOW_LANDING_BELOW_HOW ? (
          <>
            {/* Sections own their Reveal stagger — avoid wrapping whole blocks twice */}
            <LandingBrandKit />
            <LandingTransformSection />
            <LandingReferenceCompare />
            <LandingEditableCanvas />
            <LandingTemplatesShowcase />
            <LandingWhyDifferent />
            <LandingScenarios />
            <LandingPricingTeaser />
            <LandingTokensAndFaq />
            <LandingProductTools />
            <LandingFinalCta />
          </>
        ) : null}
        <LandingFooter />
      </main>
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface="landing" />
    </>
  );
}
