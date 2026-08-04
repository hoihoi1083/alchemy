"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const BRAND = "#6C3BFF";
const BRAND_SOFT = "#8B5CF6";

function WhyIcon({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/** 1 — Guided wizard: one decision at a time */
function IconGuided() {
  return (
    <WhyIcon label="Guided wizard">
      <rect x="10" y="8" width="44" height="48" rx="10" fill={BRAND} />
      <circle cx="20" cy="22" r="5" fill="#fff" />
      <path d="M17.8 22l1.5 1.5 3-3" fill="none" stroke={BRAND} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="28" y="19" width="18" height="6" rx="3" fill="#fff" opacity="0.95" />
      <circle cx="20" cy="36" r="5" fill="#fff" opacity="0.35" />
      <rect x="28" y="33" width="18" height="6" rx="3" fill="#fff" opacity="0.45" />
      <circle cx="20" cy="50" r="5" fill="#fff" opacity="0.2" />
      <rect x="28" y="47" width="14" height="6" rx="3" fill="#fff" opacity="0.25" />
    </WhyIcon>
  );
}

/** 2 — Reference style, keep your product */
function IconReference() {
  return (
    <WhyIcon label="Reference style">
      <rect x="8" y="14" width="28" height="36" rx="6" fill={BRAND_SOFT} />
      <rect x="14" y="22" width="16" height="12" rx="2" fill="#fff" opacity="0.9" />
      <rect x="14" y="38" width="12" height="3" rx="1.5" fill="#fff" opacity="0.55" />
      <rect x="28" y="14" width="28" height="36" rx="6" fill={BRAND} />
      <circle cx="42" cy="28" r="7" fill="#fff" opacity="0.95" />
      <rect x="34" y="40" width="16" height="3" rx="1.5" fill="#fff" opacity="0.7" />
    </WhyIcon>
  );
}

/** 3 — Storyboard frames before video */
function IconStoryboard() {
  return (
    <WhyIcon label="Storyboard">
      <rect x="6" y="18" width="16" height="28" rx="4" fill={BRAND_SOFT} />
      <rect x="24" y="14" width="16" height="36" rx="4" fill={BRAND} />
      <rect x="42" y="18" width="16" height="28" rx="4" fill={BRAND_SOFT} />
      <circle cx="32" cy="32" r="5" fill="#fff" opacity="0.95" />
      <path d="M30.5 32l3 2v-4l-3 2z" fill={BRAND} />
      <rect x="10" y="24" width="8" height="5" rx="1" fill="#fff" opacity="0.5" />
      <rect x="46" y="24" width="8" height="5" rx="1" fill="#fff" opacity="0.5" />
    </WhyIcon>
  );
}

/** 4 — Editable output on canvas */
function IconEditable() {
  return (
    <WhyIcon label="Editable canvas">
      <rect x="8" y="10" width="38" height="38" rx="8" fill={BRAND} />
      <rect x="14" y="16" width="26" height="14" rx="3" fill="#fff" opacity="0.92" />
      <rect x="14" y="34" width="16" height="3" rx="1.5" fill="#fff" opacity="0.55" />
      <rect x="14" y="40" width="10" height="3" rx="1.5" fill="#fff" opacity="0.35" />
      <circle cx="46" cy="46" r="12" fill={BRAND_SOFT} />
      <path
        d="M41 47.5l8.5-8.5 3 3L44 50.5h-3v-3z"
        fill="#fff"
      />
      <path d="M48.2 40.2l2.6 2.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </WhyIcon>
  );
}

/** 5 — Physical product + concept paths */
function IconProducts() {
  return (
    <WhyIcon label="Products and concepts">
      <rect x="8" y="22" width="22" height="26" rx="5" fill={BRAND} />
      <rect x="13" y="16" width="12" height="8" rx="2" fill={BRAND_SOFT} />
      <rect x="13" y="30" width="12" height="3" rx="1.5" fill="#fff" opacity="0.7" />
      <rect x="13" y="36" width="8" height="3" rx="1.5" fill="#fff" opacity="0.45" />
      <circle cx="44" cy="28" r="14" fill={BRAND_SOFT} />
      <path
        d="M44 18v4M44 34v4M34 28h4M50 28h4M37 21l2.5 2.5M48.5 32.5L51 35M37 35l2.5-2.5M48.5 23.5L51 21"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="44" cy="28" r="3.5" fill="#fff" />
    </WhyIcon>
  );
}

/** 6 — Token billing */
function IconTokens() {
  return (
    <WhyIcon label="Token billing">
      <circle cx="28" cy="34" r="16" fill={BRAND_SOFT} />
      <circle cx="28" cy="34" r="11" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.85" />
      <text
        x="28"
        y="38"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        T
      </text>
      <circle cx="42" cy="24" r="14" fill={BRAND} />
      <circle cx="42" cy="24" r="9.5" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.9" />
      <text
        x="42"
        y="28"
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        T
      </text>
    </WhyIcon>
  );
}

const WHY_ICONS = [
  IconGuided,
  IconReference,
  IconStoryboard,
  IconEditable,
  IconProducts,
  IconTokens,
] as const;

export function LandingWhyDifferent() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="why" className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            {L.whyTitle}
          </h2>
        </Reveal>
        <div className="landing-why-grid mt-10 grid grid-cols-2 gap-x-4 gap-y-8">
          {L.whyItems.map((item, i) => {
            const Icon = WHY_ICONS[i];
            return (
              <Reveal key={item.title} delayMs={i * 95} distance={44} scaleFrom={0.94}>
                <div className="text-center">
                  <Icon />
                  <h3 className="text-[13px] font-semibold leading-snug text-slate-900 md:text-sm">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 md:text-xs">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
