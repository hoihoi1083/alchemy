"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { FaqExpandToggle } from "@/components/landing/FaqExpandToggle";
import { Reveal } from "@/components/landing/Reveal";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";

const FAQ_PREVIEW_COUNT = 4;

export function LandingTokensAndFaq() {
	const { m } = useLocale();
	const L = m.landing;
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [faqExpanded, setFaqExpanded] = useState(false);

	const faqItems = L.faq;
	const visibleFaq = faqExpanded
		? faqItems
		: faqItems.slice(0, FAQ_PREVIEW_COUNT);
	const canToggleFaq = faqItems.length > FAQ_PREVIEW_COUNT;

	return (
		<section id="resources" className="w-full bg-transparent">
			<div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:px-8 md:py-14">
				<div className="grid gap-8 lg:grid-cols-2">
					<Reveal
						distance={48}
						scaleFrom={0.94}
						threshold={0}
						rootMargin="0px 0px -8% 0px"
						className="h-full"
					>
						<div className="h-full rounded-3xl border border-white/15 bg-white/95 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
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
					</Reveal>

					<Reveal
						delayMs={140}
						distance={48}
						scaleFrom={0.94}
						threshold={0}
						rootMargin="0px 0px -8% 0px"
					>
						<div>
							<h3 className="text-xl font-bold tracking-tight text-white">
								{L.faqTitle}
							</h3>
							<div className="mt-5 space-y-2">
								{visibleFaq.map((item, i) => {
									const open = openFaq === i;
									return (
										<div
											key={item.q}
											className="rounded-xl border border-white/15 bg-white/95 backdrop-blur-sm"
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
							{canToggleFaq ? (
								<FaqExpandToggle
									tone="onDark"
									expanded={faqExpanded}
									showMore={L.faqShowMore}
									showLess={L.faqShowLess}
									onToggle={() => {
										setFaqExpanded((v) => !v);
										if (faqExpanded) setOpenFaq(null);
									}}
								/>
							) : null}
						</div>
					</Reveal>
				</div>
			</div>
		</section>
	);
}
