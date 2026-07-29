"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

/** Section anchors + product tool routes (via `/` for legal pages). */
const NAV = [
  { href: "/#product", key: "navProduct" as const },
  { href: "/#how", key: "navHow" as const },
  { href: "/#brand-kit", key: "navBrandKit" as const },
  { href: "/#templates", key: "navTemplates" as const },
  { href: "/#pricing", key: "navPricing" as const },
  { href: "/edit-image", key: "navEditImage" as const },
  { href: "/captions", key: "navCaptions" as const },
  { href: "/pro", key: "navPro" as const },
];

/** Full-bleed bar; nav sits next to logo (no bottom rule). */
export function LandingNav() {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 md:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_LOGO_SRC}
            alt={PRODUCT_LOGO_ALT}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
          <span className="hidden whitespace-nowrap text-base font-semibold tracking-tight text-slate-900 sm:inline sm:text-[17px]">
            {PRODUCT_NAME}
          </span>
        </Link>

        <nav className="landing-nav-links hidden min-w-0 items-center gap-2.5 xl:gap-3.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-violet-700 xl:text-[13px]"
            >
              {L[item.key]}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Full language toggle from sm+; mobile uses drawer */}
          <div className="hidden sm:block">
            <LanguageToggle variant="light" />
          </div>
          <AuthNav compact />
          {!isSignedIn ? (
            <Link
              href="/start"
              className="landing-cta-shine landing-try-free hidden rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 sm:inline-flex"
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
          <div className="mb-3 flex justify-center sm:hidden">
            <LanguageToggle variant="light" />
          </div>
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
