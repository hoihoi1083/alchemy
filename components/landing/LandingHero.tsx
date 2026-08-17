"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { LandingWatchDemoButton } from "@/components/landing/LandingDemoModal";
import { LandingHeroMascot } from "@/components/landing/LandingHeroMascot";
import { LandingWhyDifferent } from "@/components/landing/LandingWhyDifferent";

export function LandingHero() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section
			id="product"
			className="landing-hero-cyber"
		>
			{/* Full-bleed scene behind the headline band only */}
			<div className="landing-hero-scene">
				<LandingHeroMascot alt={L.heroMascotAlt} />
				<div
					className="landing-hero-scrim-x"
					aria-hidden
				/>
				<div
					className="landing-hero-scrim-y"
					aria-hidden
				/>
			</div>

			<div className="landing-hero-inner">
				{/* Headline / CTAs / chips — sits in the tall scene band */}
				<div className="landing-hero-copy-band">
					<div className="landing-hero-copy w-full min-w-0 max-w-xl">
						<span className="landing-hero-badge inline-flex rounded-full border border-violet-400/40 bg-violet-600/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
							{L.badge}
						</span>

						<h1 className="landing-hero-title mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
							{L.titleBefore}
							<span className="landing-hero-title-hl text-violet-300">
								{L.titleHighlight}
							</span>
							{L.titleAfter}
						</h1>

						<p className="landing-hero-subtitle mt-4 max-w-md text-[14px] leading-relaxed text-slate-300 sm:text-[15px]">
							{L.subtitle}
						</p>

						<ul className="landing-hero-trust mt-5 flex flex-wrap gap-x-4 gap-y-1.5 sm:mt-6">
							{L.heroTrust.map((item) => (
								<li
									key={item}
									className="text-[12px] font-medium text-violet-200 sm:text-[13px]"
								>
									✓ {item}
								</li>
							))}
						</ul>

						<p className="landing-hero-built-label mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:mt-5">
							{L.builtForLabel}
						</p>
						<ul className="landing-hero-built-list mt-2 flex flex-wrap gap-2">
							{L.builtFor.map((item) => (
								<li
									key={item}
									className="landing-hero-chip rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 backdrop-blur-sm"
								>
									{item}
								</li>
							))}
						</ul>

						<div className="landing-hero-ctas mt-6 flex w-full flex-col gap-3 sm:mt-7 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
							<Link
								href="/start"
								className="landing-hero-cta-primary inline-flex w-full items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-400 sm:w-auto sm:px-6 sm:py-3"
							>
								{L.ctaPrimary}
							</Link>
							<LandingWatchDemoButton className="landing-hero-cta-secondary inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:border-violet-300/50 hover:bg-white/10 sm:w-auto sm:px-5 sm:py-3" />
						</div>
					</div>
				</div>

				{/* Why — directly under hero copy, same dark plane */}
				<LandingWhyDifferent />
			</div>
		</section>
	);
}
