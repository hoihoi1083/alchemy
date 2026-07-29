"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { TOKEN_COST, estimateVideoTokens } from "@/lib/billing/token-costs";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";
import { Reveal } from "@/components/landing/Reveal";

/** Icons aligned 1:1 with real TOKEN_COST / estimateVideoTokens rows below. */
const TOKEN_ICONS = [
	"/images/landing/token-icon-plan.png?v=3",
	"/images/landing/token-icon-image.png?v=3",
	"/images/landing/token-icon-storyboard.png?v=3",
	"/images/landing/token-icon-music.png?v=3",
	"/images/landing/token-icon-video.png?v=3",
	"/images/landing/token-icon-voice.png?v=3",
] as const;

export function LandingTokensAndFaq() {
	const { m } = useLocale();
	const L = m.landing;
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	// Same billing math as studio video step: 8s Seedance 480p.
	const video8s = estimateVideoTokens({
		duration: 8,
		resolution: "480p",
		fast: true,
	});

	const costs = [
		{
			label: L.tokenCostPlan,
			value: TOKEN_COST.plan,
			icon: TOKEN_ICONS[0],
		},
		{
			label: L.tokenCostImage,
			value: TOKEN_COST.image,
			icon: TOKEN_ICONS[1],
		},
		{
			label: L.tokenCostStoryboard,
			value: TOKEN_COST.storyboard_batch,
			icon: TOKEN_ICONS[2],
		},
		{
			label: L.tokenCostMusic,
			value: TOKEN_COST.music,
			icon: TOKEN_ICONS[3],
		},
		{ label: L.tokenCostVideoDraft, value: video8s, icon: TOKEN_ICONS[4] },
		{
			label: L.tokenCostVoice,
			value: TOKEN_COST.voiceover,
			icon: TOKEN_ICONS[5],
		},
	];

	return (
		<section id="resources" className="w-full bg-slate-50">
			<div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
				<div className="mx-auto max-w-2xl text-center">
					<Reveal>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
							{L.tokensTitle}
						</h2>
						<p className="mt-3 text-sm text-slate-600 md:text-base">
							{L.tokensBody}
						</p>
					</Reveal>
				</div>

				<div className="landing-tokens-grid mt-8 grid grid-cols-2 gap-3">
					{costs.map((c, i) => (
						<Reveal
							key={c.label}
							delayMs={i * 90}
							distance={44}
							scaleFrom={1.94}
						>
							<div className="rounded-2xl border border-violet-100 bg-white p-4 text-center shadow-sm">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={c.icon}
									alt=""
									className="mx-auto mb-2 aspect-square h-12 w-12 object-contain object-center sm:h-14 sm:w-14"
								/>
								<p className="text-xs font-medium text-slate-700 md:text-[13px]">
									{c.label}
								</p>
								<p className="mt-2 text-sm font-bold text-violet-700">
									{c.value} {L.tokensUnit}
								</p>
							</div>
						</Reveal>
					))}
				</div>
				<p className="mt-4 text-center text-xs text-slate-500">
					{L.tokensVideoNote}
				</p>

				<div className="mt-12 grid gap-8 lg:grid-cols-2">
					<div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
						<h3 className="text-xl font-bold text-violet-700">
							{L.topUpTitle}
						</h3>
						<p className="mt-1 text-sm text-slate-600">
							{L.topUpBody}
						</p>
						<ul className="mt-5 space-y-3">
							<li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
								<span className="font-medium text-slate-800">
									{TOP_UP_TOKENS.toLocaleString()}{" "}
									{L.tokensUnit}
								</span>
								<span className="font-semibold text-violet-700">
									${TOP_UP_PRICE_USD}
								</span>
							</li>
							<li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
								<span className="font-medium text-slate-800">
									{L.topUpCustom}
								</span>
								<Link
									href="/pricing"
									className="font-semibold text-violet-700 hover:underline"
								>
									{L.pricingCustom}
								</Link>
							</li>
						</ul>
						<Link
							href="/pricing"
							className="mt-5 inline-flex text-sm font-semibold text-violet-700 hover:underline"
						>
							{L.tokensSeePricing}
						</Link>
					</div>

					<div>
						<h3 className="text-xl font-bold tracking-tight text-slate-900">
							{L.faqTitle}
						</h3>
						<div className="mt-5 space-y-2">
							{L.faq.map((item, i) => {
								const open = openFaq === i;
								return (
									<div
										key={item.q}
										className="rounded-xl border border-slate-200 bg-white"
									>
										<button
											type="button"
											className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900"
											onClick={() =>
												setOpenFaq(open ? null : i)
											}
										>
											{item.q}
											<span className="text-violet-600">
												{open ? "−" : "+"}
											</span>
										</button>
										{open ? (
											<p className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600">
												{item.a}
											</p>
										) : null}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
