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
];

export function LandingNav() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <header className="sticky top-0 z-40 border-b border-violet-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_LOGO_SRC}
            alt={PRODUCT_LOGO_ALT}
            className="h-9 w-9 rounded-xl object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            {PRODUCT_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition hover:text-violet-700"
            >
              {L[item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <LanguageToggle variant="light" />
          <AuthNav />
          <Link
            href="/start"
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
          >
            {L.tryFree}
          </Link>
        </div>
      </div>
    </header>
  );
}
