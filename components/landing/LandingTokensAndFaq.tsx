"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";

/** Fixed viewport — page through questions instead of growing the list. */
const FAQ_PAGE_SIZE = 4;

export function LandingTokensAndFaq() {
	const { m } = useLocale();
	const L = m.landing;
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [faqPage, setFaqPage] = useState(0);
	const [pageDir, setPageDir] = useState<"down" | "up">("down");

	const faqItems = L.faq;
	const pageCount = Math.max(1, Math.ceil(faqItems.length / FAQ_PAGE_SIZE));
	const safePage = Math.min(faqPage, pageCount - 1);
	const pageStart = safePage * FAQ_PAGE_SIZE;
	const visibleFaq = faqItems.slice(pageStart, pageStart + FAQ_PAGE_SIZE);
	const canPageFaq = faqItems.length > FAQ_PAGE_SIZE;
	const canPrev = safePage > 0;
	const canNext = safePage < pageCount - 1;

	function goPrev() {
		if (!canPrev) return;
		setOpenFaq(null);
		setPageDir("up");
		setFaqPage((p) => Math.max(0, p - 1));
	}

	function goNext() {
		if (!canNext) return;
		setOpenFaq(null);
		setPageDir("down");
		setFaqPage((p) => Math.min(pageCount - 1, p + 1));
	}

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
									<a
										href={`mailto:${PRODUCT_SUPPORT_EMAIL}?subject=${encodeURIComponent(L.topUpCustomMailSubject)}`}
										className="font-semibold text-violet-700 hover:underline"
									>
										{L.topUpCustomCta}
									</a>
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
							<div className="flex items-end justify-between gap-3">
								<h3 className="text-xl font-bold tracking-tight text-white">
									{L.faqTitle}
								</h3>
								{canPageFaq ? (
									<p className="text-xs font-medium tabular-nums text-white/55">
										{safePage + 1} / {pageCount}
									</p>
								) : null}
							</div>
							<div className="mt-5 overflow-hidden">
								<div
									key={`${safePage}-${pageDir}`}
									className={
										pageDir === "up"
											? "landing-faq-page landing-faq-page--up space-y-2"
											: "landing-faq-page landing-faq-page--down space-y-2"
									}
								>
									{visibleFaq.map((item, i) => {
										const open = openFaq === i;
										return (
											<div
												key={`${safePage}-${item.q}`}
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
							</div>
							{canPageFaq ? (
								<div className="landing-faq-pager mt-4 flex items-center justify-center gap-3">
									<button
										type="button"
										aria-label={L.faqPrev}
										disabled={!canPrev}
										onClick={goPrev}
										className="inline-flex size-10 items-center justify-center rounded-full border-2 border-violet-300/70 bg-violet-500/15 text-violet-100 shadow-[0_0_0_4px_rgba(139,92,246,0.12)] transition-[border-color,background-color,opacity,box-shadow] hover:border-violet-200 hover:bg-violet-500/25 disabled:pointer-events-none disabled:opacity-30"
									>
										<span
											className={
												canPrev
													? "landing-pager-nudge-up"
													: "inline-flex"
											}
											aria-hidden
										>
											<svg
												viewBox="0 0 24 24"
												fill="none"
												className="h-4 w-4"
												stroke="currentColor"
												strokeWidth="2.25"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M6 15l6-6 6 6" />
											</svg>
										</span>
									</button>
									<div
										className="flex items-center gap-1.5"
										aria-hidden
									>
										{Array.from({ length: pageCount }, (_, i) => (
											<span
												key={i}
												className={`h-1.5 rounded-full transition ${
													i === safePage
														? "w-4 bg-white"
														: "w-1.5 bg-white/35"
												}`}
											/>
										))}
									</div>
									<button
										type="button"
										aria-label={L.faqNext}
										disabled={!canNext}
										onClick={goNext}
										className="inline-flex size-10 items-center justify-center rounded-full border-2 border-violet-300/70 bg-violet-500/15 text-violet-100 shadow-[0_0_0_4px_rgba(139,92,246,0.12)] transition-[border-color,background-color,opacity,box-shadow] hover:border-violet-200 hover:bg-violet-500/25 disabled:pointer-events-none disabled:opacity-30"
									>
										<span
											className={
												canNext
													? "landing-pager-nudge-down"
													: "inline-flex"
											}
											aria-hidden
										>
											<svg
												viewBox="0 0 24 24"
												fill="none"
												className="h-4 w-4"
												stroke="currentColor"
												strokeWidth="2.25"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M6 9l6 6 6-6" />
											</svg>
										</span>
									</button>
								</div>
							) : null}
						</div>
					</Reveal>
				</div>
			</div>
		</section>
	);
}
