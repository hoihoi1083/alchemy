"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ToolkitNavMenu, ToolkitNavMobileLinks } from "@/components/nav/ToolkitNavMenu";
import { useLocale } from "@/components/LocaleProvider";
import { AuthBrandLockup } from "@/components/AuthBrandLockup";
import { SignUpPromoBar } from "@/components/SignUpPromoBar";
import { PRODUCT_WORDMARK_ALT } from "@/lib/brand";

type StudioNavProps = {
  /** Optional chips under/ beside brand (e.g. promotion mode). */
  trailing?: ReactNode;
  /** Light = white wizard bar; dark = translucent bar over glow tool pages. */
  variant?: "light" | "dark";
};

/**
 * Focused studio chrome — logo + core tools + tokens/language/user.
 * Spacing/type match LandingNav so headers feel consistent site-wide.
 */
export function StudioNav({ trailing, variant = "light" }: StudioNavProps) {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const dark = variant === "dark";

  const tools = [{ href: "/#templates", label: L.navTemplates }] as const;

  /** Match LandingNav link rhythm — larger type + spacing. */
  const navLinkClass = dark
    ? "whitespace-nowrap text-[14px] font-semibold tracking-tight text-slate-300 hover:text-white xl:text-[15px]"
    : "whitespace-nowrap text-[14px] font-semibold tracking-tight text-slate-600 hover:text-violet-700 xl:text-[15px]";

  const pricingClass = dark
    ? "whitespace-nowrap text-[14px] font-semibold tracking-tight text-violet-300 hover:text-violet-200 xl:text-[15px]"
    : "whitespace-nowrap text-[14px] font-semibold tracking-tight text-violet-700 hover:text-violet-700 xl:text-[15px]";

  const mobileLinkClass = dark
    ? "rounded-lg px-3 py-3 text-[15px] font-semibold text-slate-200 hover:bg-white/10"
    : "rounded-lg px-3 py-3 text-[15px] font-semibold text-slate-700 hover:bg-violet-50";

  return (
    <div className="sticky top-0 z-40 w-full">
      <header
        className={
          dark
            ? "w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md"
            : "w-full bg-white"
        }
      >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4 md:px-10 lg:px-12">
        <AuthBrandLockup
          href="/"
          variant={dark ? "dark" : "light"}
          ariaLabel={PRODUCT_WORDMARK_ALT}
          className="min-w-0 shrink-0 [&_.brand-mark]:h-10 [&_.brand-mark]:w-10 sm:[&_.brand-mark]:h-11 sm:[&_.brand-mark]:w-11 [&_.brand-wordmark]:h-8 sm:[&_.brand-wordmark]:h-9"
        />

        <nav className="landing-nav-links ml-8 hidden min-w-0 flex-nowrap items-center gap-5 lg:ml-10 lg:flex xl:ml-12 xl:gap-7">
          {tools.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
          <ToolkitNavMenu variant={dark ? "dark" : "light"} triggerClassName={navLinkClass} />
          <Link href="/pricing" className={pricingClass}>
            {L.navResources}
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {trailing ? (
            <div className="hidden min-w-0 items-center gap-2 md:flex">{trailing}</div>
          ) : null}
          <div className="hidden sm:block">
            <LanguageToggle variant={dark ? "dark" : "light"} />
          </div>
          <AuthNav compact />
          {!isSignedIn ? (
            <Link
              href="/start"
              className="hidden rounded-full bg-violet-600 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-violet-500 sm:inline-flex"
            >
              {L.tryFree}
            </Link>
          ) : null}
          <button
            type="button"
            className={
              dark
                ? "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-slate-200 lg:hidden"
                : "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            }
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="text-lg leading-none" aria-hidden>
              {open ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          className={
            dark
              ? "border-t border-white/10 bg-slate-950/95 px-4 py-4 lg:hidden"
              : "border-t border-slate-100 bg-white px-4 py-4 lg:hidden"
          }
        >
          <div className="flex flex-col gap-1.5">
            {trailing ? (
              <div className="mb-1 flex flex-wrap items-center gap-2 px-3 py-1 md:hidden">
                {trailing}
              </div>
            ) : null}
            {tools.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileLinkClass}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <ToolkitNavMobileLinks
              variant={dark ? "dark" : "light"}
              onNavigate={() => setOpen(false)}
            />
            <Link
              href="/pricing"
              className={dark ? `${mobileLinkClass} text-violet-300` : `${mobileLinkClass} text-violet-700`}
              onClick={() => setOpen(false)}
            >
              {L.navResources}
            </Link>
            <div
              className={
                dark
                  ? "mt-2 border-t border-white/10 pt-2 sm:hidden"
                  : "mt-2 border-t border-slate-100 pt-2 sm:hidden"
              }
            >
              <LanguageToggle variant={dark ? "dark" : "light"} />
            </div>
          </div>
        </div>
      ) : null}
      </header>
      <SignUpPromoBar />
    </div>
  );
}
