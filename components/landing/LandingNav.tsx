"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

/** Home-section anchors — always route via `/` so they work from /privacy etc. */
const NAV = [
  { href: "/#product", key: "navProduct" as const },
  { href: "/#templates", key: "navTemplates" as const },
  { href: "/#how", key: "navHow" as const },
  { href: "/#use-cases", key: "navUseCases" as const },
  { href: "/#pricing", key: "navPricing" as const },
  { href: "/#resources", key: "navResources" as const },
];

/** Full-bleed bar; nav sits next to logo (no bottom rule). */
export function LandingNav() {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PRODUCT_LOGO_SRC} alt={PRODUCT_LOGO_ALT} className="h-8 w-8 rounded-lg object-contain" />
          <span className="whitespace-nowrap text-sm font-semibold text-slate-900">{PRODUCT_NAME}</span>
        </Link>

        <nav className="landing-nav-links hidden min-w-0 items-center gap-3 lg:flex lg:gap-4">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="whitespace-nowrap text-[13px] font-medium text-slate-600 hover:text-violet-700"
            >
              {L[item.key]}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageToggle variant="light" />
          <AuthNav />
          {!isSignedIn ? (
            <Link
              href="/start"
              className="landing-try-free hidden rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 sm:inline-flex"
            >
              {L.tryFree}
            </Link>
          ) : null}
          <button
            type="button"
            className="landing-nav-menu-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="landing-nav-mobile border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => setOpen(false)}
              >
                {L[item.key]}
              </Link>
            ))}
            {!isSignedIn ? (
              <Link
                href="/start"
                className="mt-1 rounded-full bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                {L.tryFree}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
