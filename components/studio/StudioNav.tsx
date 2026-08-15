"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProNavLink } from "@/components/nav/ProNavLink";
import { useLocale } from "@/components/LocaleProvider";
import {
  PRODUCT_LOGO_ALT,
  PRODUCT_LOGO_SRC,
  PRODUCT_WORDMARK_ALT,
  PRODUCT_WORDMARK_BLACK_SRC,
  PRODUCT_WORDMARK_WHITE_SRC,
} from "@/lib/brand";

type StudioNavProps = {
  /** Optional chips under/ beside brand (e.g. promotion mode). */
  trailing?: ReactNode;
  /** Light = white wizard bar; dark = translucent bar over glow tool pages. */
  variant?: "light" | "dark";
};

/**
 * Focused studio chrome — logo + core tools + tokens/language/user.
 * Avoids full marketing LandingNav links that pull attention off the wizard.
 * Canvas + Pro match landing: plain Canvas link (no flyout), ProNavLink copy.
 */
export function StudioNav({ trailing, variant = "light" }: StudioNavProps) {
  const { m } = useLocale();
  const L = m.landing;
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const dark = variant === "dark";

  const tools = [{ href: "/#templates", label: L.navTemplates }] as const;

  const linkClass = dark
    ? "whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-300 hover:bg-white/10 hover:text-white xl:text-[13px]"
    : "whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 xl:text-[13px]";

  const pricingClass = dark
    ? "whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-violet-300 hover:bg-white/10 hover:text-violet-200 xl:text-[13px]"
    : "whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium text-violet-700 hover:bg-violet-50 xl:text-[13px]";

  return (
    <header
      className={
        dark
          ? "sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md"
          : "sticky top-0 z-40 w-full bg-white"
      }
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-3.5 md:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"
          aria-label={PRODUCT_WORDMARK_ALT}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_LOGO_SRC}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl object-contain sm:h-11 sm:w-11"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${dark ? PRODUCT_WORDMARK_WHITE_SRC : PRODUCT_WORDMARK_BLACK_SRC}?v=2`}
            alt={PRODUCT_LOGO_ALT}
            className="hidden h-8 w-auto max-w-[12rem] object-contain object-left sm:inline sm:h-9 sm:max-w-[14rem]"
          />
        </Link>

        {trailing ? (
          <div className="hidden min-w-0 items-center gap-2 md:flex">{trailing}</div>
        ) : null}

        <nav className="ml-2 hidden min-w-0 items-center gap-1 lg:flex xl:gap-2">
          {tools.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
          <Link href="/#tools" className={linkClass}>
            {L.navCanva}
          </Link>
          <Link href="/pricing" className={pricingClass}>
            {L.navResources}
          </Link>
          <ProNavLink className={linkClass} />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {trailing ? (
            <div className="flex items-center gap-1.5 md:hidden">{trailing}</div>
          ) : null}
          <div className="hidden sm:block">
            <LanguageToggle variant={dark ? "dark" : "light"} />
          </div>
          <AuthNav compact />
          {!isSignedIn ? (
            <Link
              href="/start"
              className="hidden rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 sm:inline-flex"
            >
              {L.tryFree}
            </Link>
          ) : null}
          <button
            type="button"
            className={
              dark
                ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-slate-200 lg:hidden"
                : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
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
              ? "border-t border-white/10 bg-slate-950/95 px-3 py-3 lg:hidden"
              : "border-t border-slate-100 bg-white px-3 py-3 lg:hidden"
          }
        >
          <div className="flex flex-col gap-1">
            {tools.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  dark
                    ? "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                    : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50"
                }
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/#tools"
              className={
                dark
                  ? "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50"
              }
              onClick={() => setOpen(false)}
            >
              {L.navCanva}
            </Link>
            <Link
              href="/pricing"
              className={
                dark
                  ? "rounded-lg px-3 py-2 text-sm font-medium text-violet-300 hover:bg-white/10"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
              }
              onClick={() => setOpen(false)}
            >
              {L.navResources}
            </Link>
            <ProNavLink
              className={
                dark
                  ? "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50"
              }
              onClick={() => setOpen(false)}
            />
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
  );
}
