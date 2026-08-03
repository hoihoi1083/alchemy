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
/* Page canvas — always pure white (no lavender wash) */
.landing-page {
  background: #ffffff !important;
  color: #0f172a !important;
}
/* —— Mobile defaults —— */
.landing-nav-menu-btn { display: inline-flex !important; }
.landing-how-arrow { display: none !important; }

/* Product tools — mobile 1-col, sm 2-col, lg 4-col */
.landing-tools-grid {
  max-width: 1120px !important;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 1rem !important;
}
@media (min-width: 640px) {
  .landing-tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 1.25rem !important;
  }
}
@media (min-width: 1024px) {
  .landing-tools-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4rem !important;
  }
}

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
/* Mid-strength on mobile — readable copy, scene still visible; stronger from md+ */
.landing-hero-scrim-x {
  background: linear-gradient(
    90deg,
    rgba(6, 4, 15, 0.78) 0%,
    rgba(6, 4, 15, 0.58) 34%,
    rgba(6, 4, 15, 0.28) 58%,
    rgba(6, 4, 15, 0.08) 82%,
    transparent 100%
  ) !important;
}
.landing-hero-scrim-y {
  height: 6rem !important;
  background: linear-gradient(to top, rgba(6, 4, 15, 0.85), transparent) !important;
}

/* Transform mock — fill left column (bigger look); pinned so local/prod match */
.landing-transform-mock {
  max-width: none !important;
  width: 100% !important;
}

/* Mobile hero type/CTAs — clearer over bright scene; desktop keeps Tailwind classes */
@media (max-width: 639px) {
  /* Copy on the right over darker laptop/desk; mascot flipped onto the left */
  .landing-hero-inner {
    align-items: flex-start !important;
    justify-content: flex-end !important;
    padding-top: 1.25rem !important;
    padding-bottom: 1.75rem !important;
  }
  .landing-hero-copy {
    margin-left: auto !important;
    text-align: right !important;
  }
  /* Flip scene: mascot → left, face looks left; crop keeps face in frame */
  .landing-hero-video {
    object-position: 78% 28% !important;
    transform: scaleX(-1) scale(1.16) !important;
    transform-origin: center center !important;
  }
  /* Darken from the right so right-aligned copy stays readable */
  .landing-hero-scrim-x {
    background: linear-gradient(
      270deg,
      rgba(6, 4, 15, 0.9) 0%,
      rgba(6, 4, 15, 0.72) 28%,
      rgba(6, 4, 15, 0.4) 52%,
      rgba(6, 4, 15, 0.12) 74%,
      transparent 100%
    ) !important;
  }
  .landing-hero-badge {
    font-size: 11px !important;
    padding: 0.35rem 0.85rem !important;
  }
  .landing-hero-title {
    font-size: 1.85rem !important;
    line-height: 1.15 !important;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.75) !important;
  }
  .landing-hero-title-hl {
    color: #e9d5ff !important; /* violet-200 */
  }
  .landing-hero-subtitle {
    color: #f8fafc !important; /* slate-50 */
    font-size: 14px !important;
    line-height: 1.5 !important;
    margin-left: auto !important;
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.65) !important;
  }
  .landing-hero-ctas {
    gap: 0.5rem !important;
    margin-top: 1rem !important;
    align-items: flex-end !important;
  }
  .landing-hero-cta-primary,
  .landing-hero-cta-secondary {
    width: auto !important;
    max-width: 100% !important;
    padding: 0.5rem 0.95rem !important;
    font-size: 0.8125rem !important;
    line-height: 1.25 !important;
  }
  .landing-hero-cta-primary {
    background: #7c3aed !important; /* violet-600 — punchier */
    box-shadow: 0 6px 18px rgba(91, 33, 182, 0.4) !important;
  }
  .landing-hero-cta-secondary {
    border-color: rgba(255, 255, 255, 0.55) !important;
    background: rgba(6, 4, 15, 0.55) !important;
    color: #fff !important;
  }
  .landing-hero-trust {
    margin-top: 0.85rem !important;
    justify-content: flex-end !important;
  }
  .landing-hero-trust li {
    font-size: 12px !important;
    color: #f5f3ff !important;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45) !important;
  }
  .landing-hero-built-label {
    color: #cbd5e1 !important; /* slate-300 */
    font-size: 11px !important;
    margin-top: 0.75rem !important;
  }
  .landing-hero-built-list {
    justify-content: flex-end !important;
  }
  .landing-hero-chip {
    font-size: 11px !important;
    color: #f1f5f9 !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
    background: rgba(6, 4, 15, 0.55) !important;
  }
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
  .landing-transform-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) !important;
    column-gap: 1.5rem !important;
  }
  .landing-brand-kit-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) !important;
    column-gap: 1.5rem !important;
  }
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
  .landing-hero-scrim-y {
    height: 7rem !important;
    background: linear-gradient(to top, #06040f, transparent) !important;
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

/* Wide desktop — pricing 5-up + taller hero */
@media (min-width: 1440px) {
  .landing-pricing-grid { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
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

/* Primary CTA shine sweep */
.landing-cta-shine {
  position: relative;
  overflow: hidden;
}
.landing-cta-shine::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-120%) skewX(-18deg);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.28),
    transparent
  );
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.landing-cta-shine:hover::after {
  transform: translateX(120%) skewX(-18deg);
}

/* Story cards — gentle lift + glow (canvas mock) */
.landing-story-card {
  transition:
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
.landing-story-card:hover {
  transform: translate3d(0, -4px, 0);
  box-shadow: 0 22px 40px -18px rgba(15, 23, 42, 0.35);
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
  .landing-cta-shine::after,
  .landing-story-card {
    transition: none !important;
  }
  .landing-story-card:hover {
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
			<main className="landing-page flex min-h-screen flex-col overflow-x-clip bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
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
