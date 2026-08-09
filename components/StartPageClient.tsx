"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";
import { FREE_SIGNUP_GRANT_TOKENS } from "@/lib/billing/plans";
import { isTemplateId } from "@/lib/template-pref";
import { studioHref, type PromotionMode } from "@/lib/promotion-mode";

const PHYSICAL_IMG = "/images/landing/start-card-physical-v3.png?v=1";
const CONCEPT_IMG = "/images/landing/start-card-concept-v3.png?v=1";
const HERO_IMG = "/images/landing/start-hero-ai-studio-v6.png?v=1";

/** Same illustrated icon language as landing How-it-works / Why sections */
const ROADMAP_ICONS = [
  "/images/landing/start-roadmap-bag.png?v=1",
  "/images/landing/token-icon-plan.png",
  "/images/landing/start-roadmap-form.png?v=1",
  "/images/landing/how-icon-generate.png",
  "/images/landing/how-icon-edit.png",
] as const;

/**
 * Spacing system:
 * - Page canvas always white
 * - Desktop: type | type | tip; roadmap 5-col only at lg+
 * - Mobile: single column, tighter vertical rhythm
 * - Short laptop: modest compression (not tiny)
 */
const START_LAYOUT_CSS = `
.start-shell {
  max-width: 1180px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding: 0.85rem 1.1rem 1.35rem !important;
  background: #ffffff !important;
}
.start-page {
  background: #ffffff !important;
  color: #0f172a !important;
}
.start-hero-grid {
  display: none !important;
}
.start-hero-copy {
  position: relative !important;
  min-width: 0 !important;
}
.start-hero-sparks {
  display: flex !important;
  align-items: flex-start !important;
  gap: 0.3rem !important;
  margin-bottom: 0.4rem !important;
}
.start-hero-sparks svg {
  color: #6c3bff !important;
}
.start-hero-title {
  font-weight: 800 !important;
  letter-spacing: -0.035em !important;
  line-height: 1.12 !important;
  color: #0f172a !important;
  font-size: 1.95rem !important;
}
.start-hero-title-hl {
  color: #6c3bff !important;
}
.start-hero-sub {
  margin-top: 0.7rem !important;
  max-width: none !important;
  font-size: 14px !important;
  line-height: 1.55 !important;
  color: #64748b !important;
}
.start-hero-art-wrap {
  position: relative !important;
  width: 100% !important;
  max-width: min(100%, 380px) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
.start-hero-bubbles {
  display: none !important;
}
.start-hero-art {
  position: relative !important;
  z-index: 1 !important;
  width: 100% !important;
}
.start-hero-art img {
  width: 100% !important;
  height: auto !important;
  max-height: min(200px, 34vh) !important;
  object-fit: contain !important;
  object-position: center center !important;
  display: block !important;
  border-radius: 0.85rem !important;
}
.start-select-grid {
  display: grid !important;
  gap: 0.85rem !important;
  align-items: stretch !important;
  margin-top: 1.1rem !important;
}
.start-type-card {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0.85rem !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  padding: 0.9rem !important;
  border-radius: 1.15rem !important;
  border: 2px solid #e2e8f0 !important;
  background: #fff !important;
  text-align: left !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}
.start-type-card:hover {
  border-color: #c4b5fd !important;
  box-shadow: 0 10px 28px -16px rgba(76, 37, 212, 0.35) !important;
}
.start-type-card.is-selected {
  border-color: #6c3bff !important;
  box-shadow: 0 16px 40px -18px rgba(76, 37, 212, 0.45) !important;
}
.start-type-check {
  position: absolute !important;
  top: 0.75rem !important;
  right: 0.75rem !important;
  z-index: 2 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 1.2rem !important;
  height: 1.2rem !important;
  border-radius: 0.3rem !important;
  border: 2px solid #cbd5e1 !important;
  background: #fff !important;
  color: transparent !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
}
.start-type-card.is-selected .start-type-check {
  border-color: #6c3bff !important;
  background: #6c3bff !important;
  color: #fff !important;
}
.start-card-inner {
  display: grid !important;
  gap: 0.75rem !important;
  min-height: 0 !important;
}
.start-card-media {
  position: relative !important;
  width: 100% !important;
  aspect-ratio: 16 / 10 !important;
  overflow: hidden !important;
  border-radius: 0.85rem !important;
  background: #ffffff !important;
}
.start-card-media img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
  display: block !important;
}
.start-card-body {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 0.45rem !important;
  min-width: 0 !important;
  padding-right: 1.25rem !important;
}
.start-card-examples {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 0.35rem 0.4rem !important;
  margin-top: 0 !important;
}
.start-card-examples-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #94a3b8 !important;
  margin-right: 0.1rem !important;
}
.start-tip-card {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
  height: 100% !important;
  border-radius: 1.15rem !important;
  border: 1px solid #e2e8f0 !important;
  background: #ffffff !important;
  padding: 1rem 1rem !important;
}
.start-tip-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 2.35rem !important;
  height: 2.35rem !important;
  border-radius: 9999px !important;
  background: #ede9fe !important;
  color: #5b2fe0 !important;
  flex-shrink: 0 !important;
}
.start-tip-star {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 1.5rem !important;
  height: 1.5rem !important;
  margin-top: 0.1rem !important;
  border-radius: 9999px !important;
  background: #6c3bff !important;
  color: #fff !important;
  flex-shrink: 0 !important;
  line-height: 0 !important;
}
.start-tip-star svg {
  width: 0.75rem !important;
  height: 0.75rem !important;
  display: block !important;
}
.start-roadmap-wrap {
  margin-top: 1.5rem !important;
  padding-top: 1.25rem !important;
  border-top: 1px solid #f1f5f9 !important;
}
.start-continue-row {
  display: flex !important;
  justify-content: flex-end !important;
  margin-top: 1.15rem !important;
  padding-top: 0.15rem !important;
}
.start-roadmap-heading-block {
  text-align: center !important;
}
.start-roadmap-heading-title {
  margin: 0 !important;
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  color: #0f172a !important;
}
.start-roadmap-heading-sub {
  margin: 0.35rem 0 0 !important;
  font-size: 0.9rem !important;
  font-weight: 400 !important;
  line-height: 1.45 !important;
  color: #64748b !important;
}
.start-roadmap {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 1rem !important;
  align-items: start !important;
  margin-top: 1rem !important;
}
.start-roadmap-step {
  display: grid !important;
  grid-template-columns: 4.25rem minmax(0, 1fr) !important;
  gap: 0.75rem !important;
  align-items: center !important;
  min-width: 0 !important;
}
.start-roadmap-cluster {
  display: contents !important;
}
.start-roadmap-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 4.25rem !important;
  height: 4.25rem !important;
  border-radius: 0.9rem !important;
  border: 1.5px solid #e2e8f0 !important;
  background: #ffffff !important;
  padding: 0.7rem !important;
  box-sizing: border-box !important;
}
.start-roadmap-icon img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  display: block !important;
}
.start-roadmap-copy {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 0.2rem !important;
  min-width: 0 !important;
}
.start-roadmap-heading {
  display: flex !important;
  align-items: center !important;
  gap: 0.45rem !important;
  min-width: 0 !important;
}
.start-roadmap-num {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  width: 1.45rem !important;
  height: 1.45rem !important;
  border-radius: 9999px !important;
  background: #6c3bff !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
}
.start-roadmap-title {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
  color: #0f172a !important;
}
.start-roadmap-body {
  margin: 0 !important;
  font-size: 12.5px !important;
  line-height: 1.45 !important;
  color: #64748b !important;
}
.start-roadmap-arrow {
  display: none !important;
}
.start-panel {
  margin-top: 1.1rem !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 1.25rem !important;
  background: #ffffff !important;
  overflow: hidden !important;
}
.start-panel-body {
  padding: 1.15rem 1rem 1.25rem !important;
}
.start-panel-footer {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 0.75rem !important;
  padding: 0.85rem 1rem !important;
  border-top: 1px solid #e2e8f0 !important;
  background: #fff !important;
}
@media (min-width: 640px) {
  .start-panel-footer {
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 1rem !important;
  }
}
.start-continue-btn {
  background: linear-gradient(90deg, #6c3bff 0%, #5b2fe0 55%, #4c25d4 100%) !important;
  box-shadow: 0 10px 28px -8px rgba(109, 40, 217, 0.55) !important;
  border: none !important;
  transition: filter 0.15s ease, transform 0.15s ease !important;
}
.start-continue-btn:hover {
  filter: brightness(1.06) !important;
}
.start-continue-btn:active {
  transform: translateY(1px) !important;
}
.start-phase-rail {
  position: relative !important;
  display: flex !important;
  width: 100% !important;
  max-width: 1180px !important;
  margin: 0 auto !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 0 !important;
  padding: 0.75rem 1.15rem 0.85rem !important;
}
.start-phase-line {
  display: none !important;
  position: absolute !important;
  top: calc(0.75rem + 16px) !important;
  left: calc(1.15rem + 16px) !important;
  right: calc(1.15rem + 16px) !important;
  border-top: 2px dotted #d4d4d8 !important;
  pointer-events: none !important;
  z-index: 0 !important;
}
.start-phase-item {
  position: relative !important;
  z-index: 1 !important;
  display: flex !important;
  min-width: 0 !important;
  flex: 1 1 0 !important;
  flex-direction: column !important;
  align-items: center !important;
}
.start-phase-dot--active {
  background: #6c3bff !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(108, 59, 255, 0.35) !important;
}
.start-phase-dot--idle {
  background: #fff !important;
  color: #a1a1aa !important;
  border: 2px solid #e4e4e7 !important;
}
.start-phase-label {
  display: none !important;
  margin-top: 0.35rem !important;
  max-width: 6.5rem !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  text-align: center !important;
}

/* Tablet+ */
@media (min-width: 640px) {
  .start-shell {
    padding-left: 1.75rem !important;
    padding-right: 1.75rem !important;
    padding-top: 1.15rem !important;
    padding-bottom: 1.75rem !important;
  }
  .start-phase-rail {
    padding-left: 1.75rem !important;
    padding-right: 1.75rem !important;
  }
  .start-phase-line {
    display: block !important;
    left: calc(1.75rem + 16px) !important;
    right: calc(1.75rem + 16px) !important;
  }
  .start-phase-label { display: block !important; }
  .start-hero-title { font-size: 2.2rem !important; max-width: none !important; }
  .start-hero-art-wrap {
    max-width: min(100%, 520px) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  .start-hero-art img {
    max-height: min(240px, 28vh) !important;
    object-fit: contain !important;
  }
  .start-roadmap-heading-title { font-size: 1.125rem !important; }
  .start-select-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 1rem !important;
  }
  .start-card-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 0.85rem !important;
    align-items: stretch !important;
  }
  .start-card-media {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
  }
  .start-tip-card {
    grid-column: 1 / -1 !important;
  }
  .start-panel-body { padding: 1.35rem 1.5rem 1.5rem !important; }
  .start-panel-footer {
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0.9rem 1.5rem !important;
  }
  /* Tablet roadmap: 2 columns, no arrows */
  .start-roadmap {
    grid-template-columns: 1fr 1fr !important;
    gap: 1rem 1.25rem !important;
  }
  .start-roadmap-step {
    grid-template-columns: 4.5rem minmax(0, 1fr) !important;
  }
  .start-roadmap-icon {
    width: 4.5rem !important;
    height: 4.5rem !important;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .start-shell {
    padding-top: 1.25rem !important;
    padding-bottom: 2rem !important;
  }
  .start-hero-grid {
    display: none !important;
  }
  .start-hero-copy {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    max-width: none !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: flex-start !important;
    text-align: left !important;
  }
  .start-hero-title {
    font-size: clamp(2.45rem, 2.5vw + 1.1rem, 3.2rem) !important;
    max-width: none !important;
    width: 100% !important;
    line-height: 1.14 !important;
    text-align: left !important;
  }
  .start-hero-sub {
    font-size: 15px !important;
    margin-top: 0.75rem !important;
    max-width: 36rem !important;
    line-height: 1.55 !important;
    text-align: left !important;
  }
  .start-hero-art-wrap {
    flex: 0 1 480px !important;
    min-width: 0 !important;
    max-width: min(48%, 480px) !important;
    width: auto !important;
    margin: 0 !important;
    margin-left: auto !important;
    display: block !important;
  }
  .start-hero-art {
    width: 100% !important;
  }
  .start-hero-art img {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 280px !important;
    object-fit: contain !important;
    object-position: center right !important;
    margin: 0 !important;
    border-radius: 1.1rem !important;
  }
  .start-panel {
    margin-top: 1.5rem !important;
  }
  .start-panel-body { padding: 1.5rem 1.75rem 1.65rem !important; }
  .start-panel-footer { padding: 0.95rem 1.75rem !important; }
  .start-select-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(230px, 0.82fr) !important;
    gap: 1.15rem !important;
    margin-top: 1.25rem !important;
  }
  .start-tip-card {
    grid-column: auto !important;
    padding: 1.2rem 1.15rem !important;
  }
  .start-type-card {
    padding: 1.05rem !important;
    gap: 0.95rem !important;
  }
  .start-card-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 0.95rem !important;
    align-items: stretch !important;
  }
  .start-card-media {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
    border-radius: 0.95rem !important;
  }
  .start-phase-label { font-size: 12px !important; }
  /* Desktop roadmap: 5 steps + chevrons */
  .start-roadmap {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) !important;
    gap: 0.35rem 0.35rem !important;
    align-items: start !important;
    width: 100% !important;
  }
  .start-roadmap-step {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
    min-width: 0 !important;
    height: auto !important;
  }
  .start-roadmap-cluster {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.7rem !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  .start-roadmap-icon {
    width: 5.25rem !important;
    height: 5.25rem !important;
    margin: 0 !important;
    padding: 0.95rem !important;
    flex-shrink: 0 !important;
  }
  .start-roadmap-copy {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    align-items: flex-start !important;
  }
  .start-roadmap-arrow {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    align-self: start !important;
    width: 1.15rem !important;
    height: 5.25rem !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #6c3bff !important;
    font-size: 1.25rem !important;
    font-weight: 600 !important;
    line-height: 1 !important;
  }
  .start-roadmap-title { font-size: 14.5px !important; }
  .start-roadmap-body { font-size: 12.5px !important; }
}

/* Short laptop (MBA 13" with browser chrome) */
@media (min-width: 1024px) and (max-height: 980px) {
  .start-shell {
    padding-top: 0.7rem !important;
    padding-bottom: 0.9rem !important;
  }
  .start-phase-rail {
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }
  .start-phase-line {
    top: calc(0.5rem + 14px) !important;
  }
  .start-phase-dot {
    height: 1.7rem !important;
    width: 1.7rem !important;
    font-size: 11px !important;
  }
  .start-phase-label {
    margin-top: 0.2rem !important;
    font-size: 10px !important;
  }
  .start-hero-grid {
    display: none !important;
  }
  .start-hero-copy {
    max-width: none !important;
    align-items: flex-start !important;
    text-align: left !important;
  }
  .start-hero-title {
    font-size: clamp(2.2rem, 2.2vw + 0.95rem, 2.75rem) !important;
    max-width: none !important;
    text-align: left !important;
    line-height: 1.12 !important;
  }
  .start-hero-sub {
    margin-top: 0.55rem !important;
    font-size: 14px !important;
    line-height: 1.45 !important;
    max-width: 34rem !important;
    text-align: left !important;
  }
  .start-hero-art-wrap {
    max-width: min(46%, 420px) !important;
    max-height: none !important;
    overflow: visible !important;
    margin-left: auto !important;
  }
  .start-hero-art img {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 240px !important;
    object-fit: contain !important;
    object-position: center right !important;
    margin: 0 !important;
  }
  .start-panel {
    margin-top: 0.85rem !important;
  }
  .start-panel-body {
    padding: 0.95rem 1.25rem 1rem !important;
  }
  .start-panel-footer {
    padding: 0.55rem 1.25rem !important;
  }
  .start-select-grid {
    margin-top: 0.85rem !important;
    gap: 0.85rem !important;
  }
  .start-type-card {
    padding: 0.8rem !important;
    gap: 0.7rem !important;
  }
  .start-card-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 0.75rem !important;
  }
  .start-card-media {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
  }
  .start-tip-card {
    padding: 0.9rem !important;
  }
  .start-roadmap-wrap {
    margin-top: 1rem !important;
    padding-top: 0.85rem !important;
  }
  .start-roadmap-icon {
    width: 4.35rem !important;
    height: 4.35rem !important;
    padding: 0.7rem !important;
    margin: 0 !important;
  }
  .start-roadmap-copy {
    min-width: 0 !important;
  }
  .start-roadmap-arrow {
    width: 1.1rem !important;
    height: 4.35rem !important;
    padding: 0 !important;
    align-self: start !important;
  }
  .start-roadmap-title { font-size: 13px !important; }
  .start-roadmap-body { font-size: 12px !important; }
}
`;

function PhaseStepper({
  phases,
  activeIndex,
}: {
  phases: readonly string[];
  activeIndex: number;
}) {
  return (
    <nav aria-label="Progress" className="bg-white">
      <ol className="start-phase-rail">
        <span className="start-phase-line" aria-hidden />
        {phases.map((label, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <li key={label} className="start-phase-item">
              <span
                className={`start-phase-dot flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active || done
                    ? "start-phase-dot--active"
                    : "start-phase-dot--idle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`start-phase-label ${
                  active ? "font-semibold text-violet-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StartPageBody() {
  const { m } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateRaw = searchParams.get("template");
  const templateId = isTemplateId(templateRaw) ? templateRaw : null;
  const templateCopy = templateId ? m.templates[templateId] : null;
  const isWelcome = searchParams.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(isWelcome);
  const [selected, setSelected] = useState<PromotionMode>("physical");

  useEffect(() => {
    setShowWelcome(isWelcome);
  }, [isWelcome]);

  useEffect(() => {
    if (templateId) setSelected("physical");
  }, [templateId]);

  const cards = useMemo(
    () =>
      [
        {
          mode: "physical" as const,
          title: m.start.physicalTitle,
          short: m.start.physicalShort,
          tags: m.start.physicalTags,
          image: PHYSICAL_IMG,
        },
        {
          mode: "concept" as const,
          title: m.start.conceptTitle,
          short: m.start.conceptShort,
          tags: m.start.conceptTags,
          image: CONCEPT_IMG,
        },
      ] as const,
    [m.start],
  );

  const continueHref = studioHref(
    selected,
    selected === "physical" ? (templateId ?? undefined) : undefined,
  );

  return (
    <main className="start-page min-h-screen bg-white text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: START_LAYOUT_CSS }} />
      <LandingNav />
      <PhaseStepper phases={m.start.phases} activeIndex={0} />

      <section className="start-shell">
        {/* Hero */}
        <div className="start-hero-grid">
          <div className="start-hero-copy">
            <div className="start-hero-sparks" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
              <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 opacity-85" fill="currentColor">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 opacity-65" fill="currentColor">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </div>
            <h1 className="start-hero-title">
              {m.landing.titleBefore}
              <span className="start-hero-title-hl">{m.landing.titleHighlight}</span>
              {m.landing.titleAfter}
            </h1>
            <p className="start-hero-sub">{m.start.heroSubtitle}</p>
          </div>

          <div className="start-hero-art-wrap">
            <div className="start-hero-bubbles" aria-hidden>
              <span className="b1" />
              <span className="b2" />
              <span className="b3" />
            </div>
            <div className="start-hero-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_IMG} alt="" />
            </div>
          </div>
        </div>

        {showWelcome ? (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            <div>
              <p className="font-semibold">{m.start.welcomeTitle}</p>
              <p className="mt-1 text-violet-900/90">
                {m.start.welcomeBody.replace("{n}", String(FREE_SIGNUP_GRANT_TOKENS))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="shrink-0 text-lg leading-none text-violet-800/70 hover:text-violet-950"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ) : null}

        {templateId && templateCopy ? (
          <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            <p className="font-semibold">
              {m.start.templateBanner.replace("{name}", templateCopy.name)}
            </p>
            <p className="mt-1 text-violet-900/90">{m.start.templateBannerHint}</p>
          </div>
        ) : null}

        {/* Step 1 → how-it-works → continue: one bordered panel */}
        <div className="start-panel">
          <div className="start-panel-body">
            <p className="start-step-eyebrow text-[14px] font-bold tracking-[0.12em] text-violet-600 sm:text-[15px]">
              {m.start.stepEyebrow}
            </p>
            <h2 className="start-step-title mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {m.start.stepTitle}
            </h2>
            <p className="start-step-hint mt-1 text-sm text-slate-500">{m.start.stepHint}</p>

            <div className="start-select-grid">
              {cards.map((card) => {
                const isSelected = selected === card.mode;
                return (
                  <button
                    key={card.mode}
                    type="button"
                    onClick={() => setSelected(card.mode)}
                    className={`start-type-card ${isSelected ? "is-selected" : ""}`}
                    aria-pressed={isSelected}
                  >
                    <span className="start-type-check" aria-hidden>
                      ✓
                    </span>

                    <div className="start-card-inner">
                      <div className="start-card-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={card.image} alt="" />
                      </div>
                      <div className="start-card-body">
                        <h3
                          className={`text-[15px] font-bold leading-snug sm:text-[17px] ${
                            isSelected ? "text-violet-700" : "text-slate-900"
                          }`}
                        >
                          {card.title}
                        </h3>
                        <p className="text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">
                          {card.short}
                        </p>
                      </div>
                    </div>

                    <div className="start-card-examples mt-auto">
                      <span className="start-card-examples-label">
                        {m.start.examplesLabel}:
                      </span>
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isSelected
                              ? "bg-violet-50 text-violet-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isSelected ? <span aria-hidden>✓</span> : null}
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              <aside className="start-tip-card">
                <div className="start-tip-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Emitting light rays */}
                    <path d="M12 2v1.4" />
                    <path d="M5.05 5.05l1 1" />
                    <path d="M2 12h1.4" />
                    <path d="M18.95 5.05l-1 1" />
                    <path d="M20.6 12H22" />
                    {/* Bulb */}
                    <path d="M9 18h6" />
                    <path d="M10 21h4" />
                    <path d="M12 4.8a5.4 5.4 0 0 0-3.2 9.7c.55.45.9 1.1 1 1.85V17h4.4v-.65c.1-.75.45-1.4 1-1.85A5.4 5.4 0 0 0 12 4.8Z" />
                  </svg>
                </div>

                <h3 className="mt-2.5 text-[15px] font-bold tracking-tight text-slate-900">
                  {m.start.tipTitle}
                </h3>

                <div className="start-tip-copy mt-3 flex flex-1 flex-col gap-2.5 text-[13px] leading-relaxed text-slate-600">
                  <p>
                    {m.start.tipChoose}{" "}
                    <span className="font-bold text-slate-900">{m.start.physicalTitle}</span>{" "}
                    {m.start.tipPhysical}
                  </p>
                  <p>
                    {m.start.tipChoose}{" "}
                    <span className="font-bold text-slate-900">{m.start.conceptTitle}</span>{" "}
                    {m.start.tipConcept}
                  </p>
                </div>

                <div className="start-tip-note mt-4 border-t border-slate-200 pt-3">
                  <div className="flex items-start gap-2.5">
                    <span className="start-tip-star" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.5l2.6 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.2l-5.9 3.4 1.6-6.7L2.5 9.4l6.9-.6L12 2.5z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{m.start.tipNote}</p>
                      <p className="mt-1 text-[12px] leading-snug text-slate-500">
                        {m.start.tipNoteBody}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* How it works — landing icon language */}
            <div className="start-roadmap-wrap">
              <div className="start-roadmap-heading-block">
                <h3 className="start-roadmap-heading-title">
                  {m.start.roadmapTitle}
                </h3>
                <p className="start-roadmap-heading-sub">
                  {m.start.roadmapSubtitle}
                </p>
              </div>
              <ol className="start-roadmap">
                {m.start.phases.map((label, i) => (
                  <Fragment key={label}>
                    <li className="start-roadmap-step">
                      <div className="start-roadmap-cluster">
                        <div className="start-roadmap-icon">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ROADMAP_ICONS[i]} alt="" />
                        </div>
                        <div className="start-roadmap-copy">
                          <div className="start-roadmap-heading">
                            <span className="start-roadmap-num" aria-hidden>
                              {i + 1}
                            </span>
                            <p className="start-roadmap-title">{label}</p>
                          </div>
                          <p className="start-roadmap-body">{m.start.phaseBodies[i]}</p>
                        </div>
                      </div>
                    </li>
                    {i < m.start.phases.length - 1 ? (
                      <li className="start-roadmap-arrow" aria-hidden>
                        ›
                      </li>
                    ) : null}
                  </Fragment>
                ))}
              </ol>
            </div>
          </div>

          <div className="start-panel-footer">
            <p className="flex min-w-0 items-center gap-2.5 text-[13px] leading-snug text-slate-500 sm:text-[14px]">
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] shrink-0 text-slate-500 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 3 5.5 5.5v5.2c0 4.2 2.8 7.9 6.5 9.3 3.7-1.4 6.5-5.1 6.5-9.3V5.5L12 3Z" />
                <path d="m9.2 11.6 1.9 1.9 3.7-3.8" />
              </svg>
              <span className="min-w-0">{m.start.secureNote}</span>
            </p>
            <button
              type="button"
              onClick={() => router.push(continueHref)}
              className="start-continue-btn inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-8 py-3 text-[14px] font-semibold text-white sm:w-auto"
            >
              {m.start.continueToStep2}
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </button>
          </div>
        </div>
      </section>
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
