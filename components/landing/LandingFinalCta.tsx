"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const FINAL_CTA_IMAGE = "/images/landing/final-cta-studio.jpg?v=1";

export function LandingFinalCta() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section className="w-full overflow-hidden bg-white px-5 py-1 md:px-8 md:py-1 mb-10">
			<Reveal distance={48} scaleFrom={0.94}>
				<div
					className="relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-[1.5rem] shadow-xl"
					style={{
						background:
							"linear-gradient(90deg, #8b5cf6 0%, #6c3bff 45%, #5b2fe0 100%)",
						color: "#ffffff",
						boxShadow: "0 20px 40px -12px rgba(108, 59, 255, 0.35)",
					}}
				>
					<div className="landing-final-cta-grid relative grid items-center gap-6 px-6 py-8 md:gap-8 md:px-10 md:py-10">
						<div className="min-w-0 max-w-2xl">
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
							<div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
								<Link
									href="/start"
									className="landing-cta-shine inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow sm:w-auto"
									style={{
										background: "#ffffff",
										color: "#5b2fe0",
									}}
								>
									{L.ctaPrimary}
								</Link>
								<a
									href="#how"
									className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold sm:w-auto"
									style={{
										border: "1px solid rgba(255,255,255,0.7)",
										color: "#ffffff",
									}}
								>
									<span>▶</span>
									{L.ctaSecondary}
								</a>
							</div>
						</div>

						<div className="landing-final-cta-media relative mx-auto w-full max-w-xl md:mx-0 md:justify-self-end">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={FINAL_CTA_IMAGE}
								alt={L.finalImageAlt}
								className="h-auto w-full rounded-2xl object-cover shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
								loading="lazy"
								decoding="async"
							/>
						</div>
					</div>
				</div>
			</Reveal>
		</section>
	);
}
