"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const CONTACT_EMAIL = "support@alchemyailab.com";

const SOCIALS: { label: string; href: string; src: string }[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    src: "/images/footer/Facebook.png",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    src: "/images/footer/Instagram.png",
  },
  {
    label: "Threads",
    href: "https://www.threads.com/",
    src: "/images/footer/Threads.png",
  },
];

const PAYMENTS: { alt: string; src: string }[] = [
  { alt: "Visa", src: "/images/footer/payments/visa.svg" },
  { alt: "Mastercard", src: "/images/footer/payments/mastercard.svg" },
  { alt: "Apple Pay", src: "/images/footer/payments/applepay.svg" },
  { alt: "Google Pay", src: "/images/footer/payments/googlepay.svg" },
];

/**
 * Marketing footer — HarmoniqFengShui FooterV2 layout:
 * logo + links + socials, then copyright + payment logos.
 */
export function SiteFooter() {
  const { m } = useLocale();
  const f = m.footer;
  const year = new Date().getFullYear();

  const navLinks = [
    { label: f.studio, href: "/start" },
    { label: f.pricing, href: "/pricing" },
    { label: f.how, href: "/how" },
    { label: f.library, href: "/library" },
    { label: f.contact, href: `mailto:${CONTACT_EMAIL}`, external: true },
    { label: f.privacy, href: "/privacy" },
    { label: f.terms, href: "/terms" },
    { label: f.refund, href: "/refund" },
  ];

  return (
    <footer
      className="site-footer mt-auto w-full pt-16"
      style={{
        background: "#0B1120",
        color: "#ffffff",
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
            <Link
              href="/"
              className="site-footer-logo flex shrink-0 items-center gap-3.5"
              style={{ color: "#ffffff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/alchemy-logo.png"
                alt=""
                className="h-14 w-14 rounded-2xl object-contain sm:h-16 sm:w-16"
              />
              {/* SVG fill can't be overridden by page text-color CSS */}
              <svg
                className="site-footer-brand h-8 w-auto sm:h-10"
                viewBox="0 0 168 36"
                role="img"
                aria-label="alchemy.ai"
              >
                <text
                  x="0"
                  y="28"
                  fill="#ffffff"
                  fontSize="28"
                  fontWeight="600"
                  fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                >
                  alchemy.ai
                </text>
              </svg>
            </Link>

            <nav
              className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
              style={{ color: "#ffffff" }}
            >
              {navLinks.map((l) =>
                l.external || l.href.startsWith("mailto:") ? (
                  <a
                    key={l.label}
                    href={l.href}
                    className="transition-opacity hover:opacity-80"
                    style={{ color: "#ffffff" }}
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="transition-opacity hover:opacity-80"
                    style={{ color: "#ffffff" }}
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt=""
                  width={36}
                  height={36}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                />
              </a>
            ))}
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-4 pt-6 text-center md:flex-row md:text-left"
          style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
        >
          <p className="text-xs sm:text-sm" style={{ color: "#ffffff" }}>
            © {year} alchemy.ai. {f.rights}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {PAYMENTS.map((p) => (
              <div
                key={p.alt}
                className="flex h-11 items-center justify-center rounded-lg bg-white px-3 py-2 sm:h-[52px] sm:px-4 sm:py-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.alt}
                  width={90}
                  height={56}
                  className="h-full w-auto max-w-[90px] object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
