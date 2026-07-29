"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const BOTTLE = "/images/landing/landing-cta-bottle.png?v=2";
const SCENE = "/images/landing/landing-hero-after.png?v=2";

export function LandingFinalCta() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="w-full overflow-hidden bg-white px-5 py-6 md:px-8 md:py-8">
      <div
        className="relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-[1.5rem] shadow-xl"
        style={{
          background: "linear-gradient(90deg, #6366f1 0%, #7c3aed 45%, #2563eb 100%)",
          color: "#ffffff",
          boxShadow: "0 20px 40px -12px rgba(124, 58, 237, 0.35)",
        }}
      >
        <div className="landing-cta-grid relative grid items-center gap-4 px-6 py-5 md:gap-6 md:px-10 md:py-6">
          <div className="min-w-0 py-1">
            <h2
              className="text-2xl font-bold tracking-tight md:text-3xl"
              style={{ color: "#ffffff" }}
            >
              {L.finalTitle}
            </h2>
            <p
              className="mt-2 max-w-md text-sm leading-relaxed"
              style={{ color: "rgba(237, 233, 254, 0.95)" }}
            >
              {L.finalBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/start"
                className="rounded-full px-5 py-2.5 text-sm font-semibold shadow"
                style={{ background: "#ffffff", color: "#6d28d9" }}
              >
                {L.ctaPrimary}
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ border: "1px solid rgba(255,255,255,0.7)", color: "#ffffff" }}
              >
                <span>▶</span>
                {L.ctaSecondary}
              </a>
            </div>
          </div>

          {/* Product peeks out of frame, but stays clipped inside the purple card */}
          <div className="relative mx-auto h-[170px] w-full max-w-[300px] overflow-hidden md:h-[190px] md:max-w-[340px] md:justify-self-end">
            <div
              className="absolute inset-x-5 bottom-2 top-7 overflow-hidden rounded-xl shadow-lg md:inset-x-6 md:top-8"
              style={{
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.14)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SCENE}
                alt=""
                className="h-full w-full object-cover object-center opacity-90"
              />
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BOTTLE}
              alt=""
              className="pointer-events-none absolute bottom-0 right-2 z-10 h-[165px] w-auto max-w-[45%] object-contain md:right-3 md:h-[185px]"
              style={{
                filter: "drop-shadow(0 14px 22px rgba(15, 23, 42, 0.35))",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
