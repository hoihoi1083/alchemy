"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const MOCK_BY_LOCALE = {
	zh: "/images/landing/landing-transform-mock.png?v=14",
	"zh-cn": "/images/landing/landing-transform-mock-zh-cn.png?v=14",
	en: "/images/landing/landing-transform-mock-en.png?v=14",
} as const;

export function LandingTransformSection() {
	const { locale, m } = useLocale();
	const L = m.landing;
	const mockSrc = MOCK_BY_LOCALE[locale] ?? MOCK_BY_LOCALE.en;

	return (
		<section
			id="transform"
			className="landing-transform relative w-full overflow-hidden bg-white"
		>
			<div className="landing-transform-grid relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-5 px-5 py-12 md:gap-6 md:px-8 md:py-14 lg:gap-8">
				<Reveal
					distance={48}
					scaleFrom={1.94}
					className="mx-auto w-full min-w-0 max-w-[500px] md:mx-0 lg:max-w-[560px]"
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={mockSrc}
						alt={L.heroImageAlt}
						className="h-auto w-full rounded-xl shadow-lg shadow-violet-200/40"
					/>
				</Reveal>

				<Reveal
					delayMs={120}
					distance={44}
					className="w-full min-w-0 max-w-xl"
				>
					<span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
						{L.transformBadge}
					</span>
					<h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem]">
						{L.transformTitleBefore}
						<span className="text-violet-600">
							{L.transformTitleHighlight}
						</span>
						{L.transformTitleAfter}
					</h2>
					<p className="mt-3 text-base leading-relaxed text-slate-600 md:text-[17px]">
						{L.transformBody}
					</p>

					<ul className="mt-5 space-y-3">
						{L.transformPoints.map((point) => (
							<li key={point.title} className="flex gap-3">
								<span
									className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white"
									aria-hidden
								>
									✓
								</span>
								<div>
									<p className="text-[15px] font-semibold text-slate-900 md:text-base">
										{point.title}
									</p>
									<p className="mt-0.5 text-[13px] leading-snug text-slate-500 md:text-sm">
										{point.body}
									</p>
								</div>
							</li>
						))}
					</ul>

					<div className="mt-6 flex flex-wrap items-center gap-3">
						<Link
							href="/start"
							className="inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-base font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500"
						>
							{L.transformCta}
						</Link>
						<p className="text-sm text-slate-500">
							{L.transformHint}
						</p>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
