"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PRODUCT_LOGO_SRC, PRODUCT_NAME, PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";

const PAYMENTS: { alt: string; src: string }[] = [
  { alt: "Visa", src: "/images/footer/payments/visa.svg" },
  { alt: "Mastercard", src: "/images/footer/payments/mastercard.svg" },
  { alt: "Apple Pay", src: "/images/footer/payments/applepay.svg" },
  { alt: "Google Pay", src: "/images/footer/payments/googlepay.svg" },
];

/** Slim landing footer — brand + essential links, left-aligned (no subscribe). */
export function LandingFooter() {
  const { m } = useLocale();
  const f = m.footer;
  const year = new Date().getFullYear();

  const productLinks = [
    { label: f.studio, href: "/start" },
    { label: f.how, href: "/#how" },
    { label: f.pricing, href: "/#pricing" },
    { label: f.library, href: "/library" },
  ];

  const legalLinks = [
    { label: f.privacy, href: "/privacy" },
    { label: f.terms, href: "/terms" },
    { label: f.refund, href: "/refund" },
    { label: f.contact, href: `mailto:${PRODUCT_SUPPORT_EMAIL}` },
  ];

  return (
    <footer
      className="relative w-full shrink-0 overflow-hidden"
      style={{ background: "#0B1120", color: "#ffffff" }}
    >
      <style>{`
        .landing-footer-top {
          display: grid;
          gap: 2rem;
          align-items: start;
          justify-items: start;
          text-align: left;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .landing-footer-top {
            grid-template-columns: 1fr 1fr;
            gap: 2.5rem;
          }
          .landing-footer-brand { grid-column: 1 / -1; }
        }
        @media (min-width: 768px) {
          .landing-footer-top {
            grid-template-columns: minmax(16rem, 1.6fr) minmax(8rem, 0.7fr) minmax(8rem, 0.7fr);
            column-gap: 3rem;
            max-width: 56rem;
          }
          .landing-footer-brand { grid-column: auto; }
        }
        .landing-footer-payments {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      `}</style>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PRODUCT_LOGO_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 opacity-10"
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:px-8 md:py-12">
        <div className="landing-footer-top">
          <div className="landing-footer-brand min-w-0 max-w-md">
            <Link href="/" className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PRODUCT_LOGO_SRC}
                alt=""
                className="h-9 w-9 rounded-xl object-contain"
              />
              <span className="text-base font-semibold">{PRODUCT_NAME}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.tagline}</p>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {f.productTitle}
            </p>
            <ul className="mt-3 space-y-2">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-slate-200 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {f.legalTitle}
            </p>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((l) =>
                l.href.startsWith("mailto:") ? (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-slate-200 hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ) : (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-slate-200 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">
            © {year} {PRODUCT_NAME}. {f.rights}
          </p>
          <div className="landing-footer-payments grid w-full max-w-md items-center gap-2 sm:w-auto sm:max-w-none sm:gap-2.5">
            {PAYMENTS.map((p) => (
              <div
                key={p.alt}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-white px-2 shadow-sm sm:h-[52px] sm:min-w-[100px] sm:px-3"
                title={p.alt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.alt}
                  className="h-6 w-auto max-w-full object-contain sm:h-8"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
