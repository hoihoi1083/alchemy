"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Syne } from "next/font/google";
import { useLocale } from "@/components/LocaleProvider";
import {
	PRODUCT_LOGO_ALT,
	PRODUCT_LOGO_SRC,
	PRODUCT_NAME_SHORT,
} from "@/lib/brand";

const brandDisplay = Syne({
	subsets: ["latin"],
	weight: ["600", "700", "800"],
	display: "swap",
});

/**
 * Fixed bottom dock — Advoo-style compact pill.
 * Brand: flask mark + split lockup (Alchemy / AI Lab). No custom wordmark image needed.
 */
export function LandingFloatingCta() {
	const { m } = useLocale();
	const label = m.landing.floatingCta;
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const dock = (
		<div
			className="pointer-events-none fixed inset-x-0 flex justify-center px-4"
			data-landing-floating-cta
			style={{
				zIndex: 90,
				bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
			}}
		>
			<style>{`
        .landing-float-pill {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          max-width: calc(100vw - 2rem);
          padding: 0.4rem 0.4rem 0.4rem 0.55rem;
          border-radius: 9999px;
          background: rgb(8 6 14 / 0.92);
          border: 1px solid rgb(255 255 255 / 0.14);
          box-shadow:
            0 16px 40px -12px rgb(0 0 0 / 0.55),
            inset 0 1px 0 rgb(255 255 255 / 0.06);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        @media (min-width: 640px) {
          .landing-float-pill {
            gap: 0.95rem;
            padding: 0.45rem 0.45rem 0.45rem 0.6rem;
          }
        }
        .landing-float-mark {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
        }
        .landing-float-mark img {
          height: 1.7rem;
          width: 1.7rem;
          flex-shrink: 0;
          border-radius: 0.45rem;
          object-fit: contain;
        }
        @media (min-width: 640px) {
          .landing-float-mark img {
            height: 1.85rem;
            width: 1.85rem;
          }
        }
        .landing-float-lockup {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.12rem;
          min-width: 0;
          line-height: 1;
        }
        .landing-float-name {
          font-size: 0.92rem;
          font-weight: 800;
          letter-spacing: -0.035em;
          white-space: nowrap;
          background: linear-gradient(
            105deg,
            #ffffff 0%,
            #f5f3ff 38%,
            #c4b5fd 72%,
            #ffffff 100%
          );
          background-size: 160% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
        @media (min-width: 640px) {
          .landing-float-name {
            font-size: 1.02rem;
          }
        }
        .landing-float-sub {
          font-size: 0.58rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgb(196 181 253 / 0.78);
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .landing-float-sub {
            font-size: 0.62rem;
            letter-spacing: 0.2em;
          }
        }
        .landing-float-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 9999px;
          padding: 0.55rem 1.05rem;
          font-size: 0.8125rem;
          font-weight: 600;
          line-height: 1;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(
            135deg,
            #8b5cf6 0%,
            #6c3bff 48%,
            #5b2fe0 100%
          );
          border: 1px solid rgb(255 255 255 / 0.32);
          box-shadow:
            0 6px 18px -4px rgb(108 59 255 / 0.55),
            inset 0 1px 0 rgb(255 255 255 / 0.28);
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        @media (min-width: 640px) {
          .landing-float-cta {
            padding: 0.65rem 1.25rem;
            font-size: 0.875rem;
          }
        }
        .landing-float-cta:hover {
          filter: brightness(1.08);
          transform: translateY(-0.5px);
        }
      `}</style>
			<div className="landing-float-pill">
				<span className="landing-float-mark">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={PRODUCT_LOGO_SRC} alt={PRODUCT_LOGO_ALT} />
					<span className={`${brandDisplay.className} landing-float-lockup`}>
						<span className="landing-float-name">{PRODUCT_NAME_SHORT}</span>
						<span className="landing-float-sub">AI Lab</span>
					</span>
				</span>
				<Link href="/start" className="landing-float-cta">
					{label}
				</Link>
			</div>
		</div>
	);

	if (!mounted) return null;
	return createPortal(dock, document.body);
}
