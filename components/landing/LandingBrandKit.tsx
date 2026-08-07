"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { Reveal } from "@/components/landing/Reveal";

/**
 * Landing brand-kit teaser — left copy + interactive kit card (landing chrome).
 */
export function LandingBrandKit() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section
			id="brand-kit"
			className="relative w-full overflow-hidden bg-slate-50"
		>
			<div className="landing-brand-kit-grid relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-6 px-5 py-12 md:gap-8 md:px-8 md:py-16">
				<Reveal distance={48} className="w-full min-w-0 max-w-xl">
					<span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
						{L.brandKitBadge}
					</span>
					<h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem]">
						{L.brandKitTitle}
					</h2>
					<p className="mt-3 text-base leading-relaxed text-slate-600 md:text-[17px]">
						{L.brandKitBody}
					</p>
					<p className="mt-3 text-sm leading-relaxed text-slate-500">
						{L.brandKitLogoTip}
					</p>

					<div className="mt-7">
						<Link
							href="/brand-kit"
							className="inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-base font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500"
						>
							{L.brandKitLink}
						</Link>
					</div>
				</Reveal>

				<Reveal
					delayMs={140}
					distance={44}
					scaleFrom={1.94}
					className="mx-auto w-full min-w-0 max-w-2xl md:mx-0"
				>
					<BrandKitPanel variant="landing" />
				</Reveal>
			</div>
		</section>
	);
}
