"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import {
	PRODUCT_LOGO_ALT,
	PRODUCT_LOGO_SRC,
	PRODUCT_WORDMARK_ALT,
	PRODUCT_WORDMARK_WHITE_SRC,
} from "@/lib/brand";

/**
 * Fixed bottom dock — compact pill.
 * Brand: flask mark + stacked Alchemy / AI Lab wordmark.
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
          gap: 0.85rem;
          max-width: calc(100vw - 2rem);
          padding: 0.45rem 0.45rem 0.45rem 0.65rem;
          border-radius: 9999px;
          background:
            radial-gradient(
              120% 140% at 12% 50%,
              rgb(139 92 246 / 0.38) 0%,
              rgb(108 59 255 / 0.16) 32%,
              transparent 62%
            ),
            radial-gradient(
              90% 120% at 78% 50%,
              rgb(91 47 224 / 0.22) 0%,
              transparent 55%
            ),
            linear-gradient(
              105deg,
              rgb(18 10 36 / 0.96) 0%,
              rgb(10 7 22 / 0.94) 48%,
              rgb(16 10 34 / 0.96) 100%
            );
          border: 1px solid rgb(167 139 250 / 0.42);
          box-shadow:
            0 16px 40px -12px rgb(0 0 0 / 0.55),
            0 0 0 1px rgb(108 59 255 / 0.12),
            inset 0 1px 0 rgb(255 255 255 / 0.1),
            inset 0 0 28px rgb(108 59 255 / 0.14);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        @media (min-width: 640px) {
          .landing-float-pill {
            gap: 1rem;
            padding: 0.5rem 0.5rem 0.5rem 0.75rem;
          }
        }
        .landing-float-mark {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
        }
        .landing-float-logo {
          height: 1.7rem;
          width: 1.7rem;
          flex-shrink: 0;
          border-radius: 0.45rem;
          object-fit: contain;
        }
        @media (min-width: 640px) {
          .landing-float-logo {
            height: 1.85rem;
            width: 1.85rem;
          }
        }
        .landing-float-wordmark-wrap {
          display: inline-block;
          height: 1.45rem;
          max-width: min(8.5rem, 36vw);
          background: linear-gradient(
            105deg,
            #ffffff 0%,
            #f5f3ff 34%,
            #c4b5fd 68%,
            #e9d5ff 86%,
            #ffffff 100%
          );
          background-size: 160% 100%;
          -webkit-mask-image: url(${PRODUCT_WORDMARK_WHITE_SRC}?v=2);
          mask-image: url(${PRODUCT_WORDMARK_WHITE_SRC}?v=2);
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: left center;
          mask-position: left center;
        }
        @media (min-width: 640px) {
          .landing-float-wordmark-wrap {
            height: 1.65rem;
            max-width: 10rem;
          }
        }
        .landing-float-wordmark-wrap img {
          display: block;
          height: 100%;
          width: auto;
          max-width: 100%;
          opacity: 0;
        }
        .landing-float-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 9999px;
          padding: 0.5rem 0.95rem;
          font-size: 0.72rem;
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
            padding: 0.55rem 1.1rem;
            font-size: 0.78rem;
          }
        }
        .landing-float-cta:hover {
          filter: brightness(1.08);
          transform: translateY(-0.5px);
        }
      `}</style>
			<div className="landing-float-pill">
				<span className="landing-float-mark" aria-label={PRODUCT_WORDMARK_ALT}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						className="landing-float-logo"
						src={PRODUCT_LOGO_SRC}
						alt=""
					/>
					<span className="landing-float-wordmark-wrap">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={`${PRODUCT_WORDMARK_WHITE_SRC}?v=2`}
							alt={PRODUCT_LOGO_ALT}
						/>
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
