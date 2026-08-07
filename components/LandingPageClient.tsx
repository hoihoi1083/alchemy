"use client";

import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingTemplatesShowcase } from "@/components/landing/LandingTemplatesShowcase";
import { LandingWhyDifferent } from "@/components/landing/LandingWhyDifferent";
import { LandingPricingTeaser } from "@/components/landing/LandingPricingTeaser";
import { LandingTokensAndFaq } from "@/components/landing/LandingTokensAndFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingProductTools } from "@/components/landing/LandingProductTools";
import { LandingStoryWheel } from "@/components/landing/LandingStoryWheel";

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

/* Story wheel — always copy left / visual right (Tailwind arbitrary grids can miss HMR) */
.landing-story-wheel-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 1.25rem !important;
  align-items: center !important;
  width: 100%;
  max-width: 1440px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}
.landing-story-mobile-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 1.25rem !important;
  align-items: center !important;
}
.landing-story-phone-fan {
  height: min(68vh, 600px);
  margin-inline: auto;
}
.landing-story-phone {
  width: min(70%, 340px);
  height: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.landing-story-phone-frame {
  border-radius: 2.25rem;
}
@media (min-width: 640px) {
  .landing-story-mobile-grid {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr) !important;
    gap: 1.5rem !important;
  }
}
@media (min-width: 768px) {
  .landing-story-wheel-grid {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr) !important;
    gap: 2rem !important;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
  .landing-story-phone-fan {
    height: min(72vh, 620px);
  }
  .landing-story-phone {
    width: min(72%, 380px);
  }
}
@media (min-width: 1280px) {
  .landing-story-wheel-grid {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) !important;
    gap: 2.5rem !important;
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
  .landing-story-phone-fan {
    height: min(74vh, 660px);
  }
  .landing-story-phone {
    width: min(70%, 420px);
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
  height: 4rem !important;
  background: linear-gradient(to top, #06040f, transparent) !important;
}

/* Why section — seamless dark extension under hero (pinned: local/prod match) */
.landing-why {
  margin-top: -1px !important; /* kill subpixel seam */
  border-top: 0 !important;
  background-color: #06040f !important;
  background-image:
    radial-gradient(ellipse at 20% 0%, rgba(108, 59, 255, 0.28), transparent 55%),
    radial-gradient(ellipse at 85% 30%, rgba(139, 92, 246, 0.18), transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(76, 29, 149, 0.22), transparent 55%) !important;
  padding: 3.5rem 0 5rem !important;
}
.landing-why-inner {
  max-width: 1440px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}
.landing-why-grid {
  margin-top: 2.5rem !important;
  gap: 2rem 1rem !important;
}
.landing-why h2 {
  color: #fff !important;
}
.landing-why h3 {
  color: #f8fafc !important;
}
.landing-why p {
  color: #94a3b8 !important;
}
@media (min-width: 768px) {
  .landing-why {
    padding: 4rem 0 6rem !important;
  }
  .landing-why-inner {
    padding-left: 2rem !important;
    padding-right: 2rem !important;
  }
  .landing-why-grid {
    margin-top: 3rem !important;
    gap: 2rem 1.25rem !important;
  }
}
@media (min-width: 1024px) {
  .landing-why {
    padding: 5rem 0 7rem !important;
  }
  .landing-why-grid {
    margin-top: 3.5rem !important;
  }
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
    background: #6c3bff !important; /* violet-600 — punchier */
    box-shadow: 0 6px 18px rgba(76, 37, 212, 0.4) !important;
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
  .landing-capacity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
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
    height: 5rem !important;
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
  .landing-capacity-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
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

.landing-how-motion { overflow: hidden; }

/* Templates showcase — sizes + featured pop (explicit CSS; Tailwind HMR can miss utilities) */
.landing-tpl-row {
  overflow: visible;
  margin-block: 0;
}
.landing-tpl-scroller {
  -ms-overflow-style: none;
  scrollbar-width: none;
  align-items: center;
  gap: 8px;
  /* Just enough for scale + purple outline — avoid large empty bands */
  padding: 28px 10px 32px;
  overflow-x: auto;
  overflow-y: visible;
}
.landing-tpl-scroller::-webkit-scrollbar { display: none; }
.landing-tpl-slot {
  position: relative;
  width: 168px;
  flex: 0 0 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.landing-tpl-card {
  display: block;
  width: 100%;
  border-radius: 16px;
  background: #18181b;
  overflow: hidden;
  text-decoration: none;
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    outline-color 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: none;
  z-index: 1;
  /* Idle: invisible ring so layout doesn't jump when featured */
  outline: 4px solid transparent;
  outline-offset: 0;
}
.landing-tpl-card--featured {
  transform: scale(1.1) !important;
  z-index: 8 !important;
  outline-color: #7c3aed !important;
  box-shadow: none !important;
}
.landing-tpl-media {
  aspect-ratio: 9 / 16 !important;
  width: 100% !important;
  overflow: hidden;
}
.landing-tpl-media-wrap {
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}
@keyframes landing-tpl-featured-zoom {
  /* Match card enlarge (~0.55s of ~2.6s featured window) then keep drifting */
  0% { transform: scale(1) translate3d(0, 0, 0); }
  21% { transform: scale(1.07) translate3d(-0.6%, -0.4%, 0); }
  100% { transform: scale(1.12) translate3d(-1.2%, -0.8%, 0); }
}
.landing-tpl-still {
  transform: scale(1);
  transform-origin: center center;
  /* Keep opacity transitions for carousel fades — only animate transform here */
  transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
.landing-tpl-still--zoom {
  animation: landing-tpl-featured-zoom 2.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .landing-tpl-still--zoom {
    animation: none !important;
    transform: none !important;
  }
}
.landing-tpl-badge {
  letter-spacing: 0.04em;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  background: #ffffff;
  color: #18181b;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}
.landing-tpl-meta {
  padding: 0;
}
.landing-tpl-meta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 28px;
  padding: 5px 8px;
  background: rgba(24, 24, 27, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #e4e4e7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.landing-tpl-meta-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.landing-tpl-meta-icon {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
}
.landing-tpl-meta-text {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f4f4f5;
}
.landing-tpl-meta-status {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a1a1aa;
}
.landing-tpl-meta-status--winner {
  padding: 2px 7px;
  border-radius: 999px;
  background: #f59e0b;
  color: #18181b;
}
@media (min-width: 640px) {
  .landing-tpl-slot {
    width: 188px;
    flex-basis: 188px;
  }
  .landing-tpl-scroller {
    gap: 10px;
    padding: 32px 12px 36px;
  }
  .landing-tpl-card--featured {
    transform: scale(1.12) !important;
  }
}
@media (min-width: 768px) {
  .landing-tpl-slot {
    width: 208px;
    flex-basis: 208px;
  }
  .landing-tpl-scroller {
    gap: 12px;
    padding: 36px 16px 40px;
  }
  .landing-tpl-card--featured {
    transform: scale(1.12) !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-tpl-card,
  .landing-tpl-card--featured {
    transform: none !important;
    transition: none !important;
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
				<LandingWhyDifferent />
				<LandingHowItWorks />
				{SHOW_LANDING_BELOW_HOW ? (
					<>
						{/* Sections own their Reveal stagger — avoid wrapping whole blocks twice */}
						<LandingStoryWheel />
						<LandingTemplatesShowcase />
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
