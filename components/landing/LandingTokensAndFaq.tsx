"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";
import { Reveal } from "@/components/landing/Reveal";
import { PlanTokenCapacityGrid } from "@/components/landing/PlanTokenCapacityGrid";

export function LandingTokensAndFaq() {
	const { m } = useLocale();
	const L = m.landing;
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	return (
		<section id="resources" className="w-full bg-slate-50">
			<div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:px-8 md:py-14">
				<PlanTokenCapacityGrid />

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
