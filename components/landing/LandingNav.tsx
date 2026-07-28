"use client";

import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

const NAV = [
  { href: "#product", key: "navProduct" as const },
  { href: "#templates", key: "navTemplates" as const },
  { href: "#how", key: "navHow" as const },
  { href: "#use-cases", key: "navUseCases" as const },
  { href: "/pricing", key: "navPricing" as const },
  { href: "#resources", key: "navResources" as const },
];

export function LandingNav() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_LOGO_SRC}
            alt={PRODUCT_LOGO_ALT}
            className="h-9 w-9 rounded-xl object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-[15px]">
            {PRODUCT_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-[13px] font-medium text-slate-600 transition hover:text-violet-700"
            >
              {L[item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <LanguageToggle variant="light" />
          <div className="hidden sm:block">
            <AuthNav />
          </div>
          <Link
            href="/start"
            className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition hover:from-indigo-400 hover:to-violet-500"
          >
            {L.tryFree}
          </Link>
        </div>
      </div>
    </header>
  );
}
