"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { estimatePlanApproxCapacity } from "@/lib/billing/token-costs";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import {
  trackCheckoutFailed,
  trackCheckoutRedirected,
  trackCheckoutStarted,
  trackSubscribeSuccess,
} from "@/lib/analytics";
import { Reveal } from "@/components/landing/Reveal";

type Interval = "monthly" | "yearly";
type PaidPlan = "standard" | "pro" | "master";

function capacityFor(
	plan: "free" | "standard" | "pro" | "master",
	p: {
		capacityImagesFeature: string;
		capacityStoryboardsFeature: string;
	},
) {
	const c = estimatePlanApproxCapacity(plan);
	return [
		{
			kind: "images" as const,
			label: p.capacityImagesFeature.replace("{n}", String(c.approxImages)),
		},
		{
			kind: "storyboard" as const,
			label: p.capacityStoryboardsFeature
				.replace("{n}", String(c.approxStoryboards))
				.replace("{sec}", String(c.storyboardSec)),
		},
	];
}

/**
 * Landing pricing — same plans/prices as /pricing, Subscribe → Stripe Checkout.
 */
export function LandingPricingTeaser() {
	const { m } = useLocale();
	const P = m.pricing;
	const { isSignedIn, isLoaded } = useAuth();
	const [interval, setInterval] = useState<Interval>("monthly");
	const [busy, setBusy] = useState<string | null>(null);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	/** Which card gets the purple border + solid CTA; defaults to Pro when not hovering. */
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	async function startCheckout(plan: PaidPlan) {
		setCheckoutError(null);
		if (!isLoaded) return;
		if (!isSignedIn) {
			const returnTo = `/pricing?plan=${plan}&interval=${interval}&checkout=1`;
			window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
			return;
		}
		const key = `${plan}-${interval}`;
		setBusy(key);
		trackCheckoutStarted({
			kind: "subscription",
			plan,
			interval,
			source: "landing",
		});
		try {
			const res = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ kind: "subscription", plan, interval }),
			});
			const raw = await res.text();
			let data: {
				url?: string;
				error?: string;
				updated?: boolean;
				deferred?: boolean;
				pendingPlan?: string | null;
				pendingEffectiveAt?: string | null;
			} = {};
			try {
				data = raw
					? (JSON.parse(raw) as {
							url?: string;
							error?: string;
							updated?: boolean;
							deferred?: boolean;
							pendingPlan?: string | null;
							pendingEffectiveAt?: string | null;
						})
					: {};
			} catch {
				throw new Error(raw?.slice(0, 200) || P.checkoutError);
			}
			if (res.ok && data.updated) {
				trackSubscribeSuccess({
					plan,
					interval,
					updated_in_place: true,
					source: "landing",
				});
				setCheckoutError(null);
				if (data.deferred && data.pendingPlan) {
					const qs = new URLSearchParams({
						checkout: "success",
						updated: "1",
						deferred: "1",
						pendingPlan: data.pendingPlan,
					});
					if (data.pendingEffectiveAt) qs.set("pendingAt", data.pendingEffectiveAt);
					window.location.href = `/pricing?${qs.toString()}`;
				} else {
					window.location.href = "/pricing?checkout=success&updated=1";
				}
				return;
			}
			if (!res.ok || !data.url) {
				throw new Error(data.error ?? P.checkoutError);
			}
			trackCheckoutRedirected({
				kind: "subscription",
				plan,
				interval,
				source: "landing",
			});
			window.location.href = data.url;
		} catch (e) {
			trackCheckoutFailed({
				kind: "subscription",
				plan,
				source: "landing",
			});
			setCheckoutError(e instanceof Error ? e.message : P.checkoutError);
			setBusy(null);
		}
	}

	const cards = [
		{
			id: "free" as const,
			name: P.plans.free.name,
			blurb: P.plans.free.description,
			priceLabel: P.freeForever,
			tokensLabel: `${PLAN_DEFINITIONS.free.monthlyTokens.toLocaleString()} ${P.tokensPerMonth}`,
			capacity: capacityFor("free", P),
			features: P.plans.free.features.slice(1),
			cta: P.getStarted,
			popular: false,
		},
		{
			id: "standard" as const,
			name: P.plans.standard.name,
			blurb: P.plans.standard.description,
			priceLabel:
				interval === "monthly"
					? P.plans.standard.monthlyPrice
					: P.plans.standard.yearlyPrice,
			listPrice: P.plans.standard.listPrice,
			saveLabel:
				interval === "monthly"
					? P.plans.standard.monthlySave
					: P.plans.standard.yearlySave,
			tokensLabel: `${P.plans.standard.tokens} ${P.tokensPerMonth}`,
			capacity: capacityFor("standard", P),
			features: P.plans.standard.features.slice(1),
			cta: P.subscribe,
			popular: false,
		},
		{
			id: "pro" as const,
			name: P.plans.pro.name,
			blurb: P.plans.pro.description,
			priceLabel:
				interval === "monthly"
					? P.plans.pro.monthlyPrice
					: P.plans.pro.yearlyPrice,
			listPrice: P.plans.pro.listPrice,
			saveLabel:
				interval === "monthly"
					? P.plans.pro.monthlySave
					: P.plans.pro.yearlySave,
			tokensLabel: `${P.plans.pro.tokens} ${P.tokensPerMonth}`,
			capacity: capacityFor("pro", P),
			features: P.plans.pro.features.slice(1),
			cta: P.subscribe,
			popular: true,
		},
		{
			id: "master" as const,
			name: P.plans.master.name,
			blurb: P.plans.master.description,
			priceLabel:
				interval === "monthly"
					? P.plans.master.monthlyPrice
					: P.plans.master.yearlyPrice,
			listPrice: P.plans.master.listPrice,
			saveLabel:
				interval === "monthly"
					? P.plans.master.monthlySave
					: P.plans.master.yearlySave,
			tokensLabel: `${P.plans.master.tokens} ${P.tokensPerMonth}`,
			capacity: capacityFor("master", P),
			features: P.plans.master.features.slice(1),
			cta: P.subscribe,
			popular: false,
		},
		{
			id: "custom" as const,
			name: P.plans.custom.name,
			blurb: P.plans.custom.description,
			priceLabel: P.contactSales,
			tokensLabel: null as string | null,
			capacity: null as ReturnType<typeof capacityFor> | null,
			features: P.plans.custom.features,
			cta: P.contactSales,
			popular: false,
		},
	];

	return (
		<section id="pricing" className="w-full bg-white">
			<div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<Reveal>
						<div className="max-w-xl">
							<h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
								{P.title}
							</h2>
							<p className="mt-2 text-sm text-slate-600">
								{P.subtitle}
							</p>
						</div>
					</Reveal>

					<div className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-full border border-slate-200 bg-slate-50 p-1">
						<button
							type="button"
							onClick={() => setInterval("monthly")}
							className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
								interval === "monthly"
									? "bg-violet-600 text-white"
									: "text-slate-600"
							}`}
						>
							{P.monthly}
						</button>
						<button
							type="button"
							onClick={() => setInterval("yearly")}
							className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
								interval === "yearly"
									? "bg-violet-600 text-white"
									: "text-slate-600"
							}`}
						>
							{P.yearly}
						</button>
						<span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
							{interval === "monthly" ? P.monthlyBadge : P.yearlyBadge}
						</span>
					</div>
				</div>

				{checkoutError ? (
					<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
						{checkoutError}
					</div>
				) : null}

				<div
					className="landing-pricing-grid mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4"
					onMouseLeave={() => setHoveredId(null)}
				>
					{cards.map((card, i) => {
						const busyKey =
							card.id === "standard" ||
							card.id === "pro" ||
							card.id === "master"
								? `${card.id}-${interval}`
								: null;
						const isBusy = busyKey != null && busy === busyKey;
						const ctaLabel = isBusy
							? P.checkoutRedirecting
							: card.cta;
						const isActive =
							hoveredId === card.id ||
							(hoveredId === null && card.popular);

						return (
							<Reveal
								key={card.id}
								delayMs={i * 90}
								distance={44}
								scaleFrom={1.94}
								className="h-full"
							>
								<div
									onMouseEnter={() => setHoveredId(card.id)}
									className={`flex h-full min-h-[320px] min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm transition duration-200 ${
										isActive
											? "border-violet-400 ring-2 ring-violet-200"
											: "border-slate-200 ring-0"
									}`}
								>
									<div className="flex h-5 shrink-0 items-center">
										{card.popular ? (
											<p className="inline-flex rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
												{P.mostPopular}
											</p>
										) : null}
									</div>
									<h3 className="mt-2 text-base font-semibold leading-tight text-slate-900">
										{card.name}
									</h3>
									<p className="mt-1 min-h-[2.5rem] text-[11px] leading-snug text-slate-500 line-clamp-2">
										{card.blurb}
									</p>

									<div className="mt-4 flex min-h-[4.75rem] flex-col justify-start">
										<p
											className={`h-4 text-[11px] leading-4 ${
												"listPrice" in card &&
												card.listPrice
													? "text-slate-400 line-through"
													: "invisible"
											}`}
										>
											{"listPrice" in card && card.listPrice
												? card.listPrice
												: "—"}
										</p>
										<p className="text-2xl font-bold leading-none text-slate-900">
											{card.priceLabel}
											{card.id !== "free" &&
											card.id !== "custom" ? (
												<span className="text-xs font-medium text-slate-500">
													{P.perMonth}
												</span>
											) : null}
										</p>
										<p
											className={`mt-0.5 flex h-5 items-center ${
												"saveLabel" in card && card.saveLabel
													? ""
													: "invisible"
											}`}
										>
											{"saveLabel" in card && card.saveLabel ? (
												<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
													{card.saveLabel}
												</span>
											) : (
												"—"
											)}
										</p>
										<p
											className={`h-4 text-[10px] leading-4 ${
												interval === "yearly" &&
												card.id !== "free" &&
												card.id !== "custom"
													? "text-slate-400"
													: "invisible"
											}`}
										>
											{P.billedYearly}
										</p>
									</div>

									<p
										className={`mt-2 min-h-[1.25rem] text-xs font-medium leading-5 ${
											card.tokensLabel
												? "text-violet-700"
												: "invisible"
										}`}
									>
										{card.tokensLabel ?? "—"}
									</p>

									<ul className="mt-3 min-h-[5.5rem] space-y-2 border-b border-dashed border-slate-200 pb-3">
										{card.capacity && card.capacity.length > 0 ? (
											card.capacity.map((item) => (
												<li
													key={item.kind}
													className="flex items-start gap-2 text-[11px] leading-snug text-slate-700"
												>
													<span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-violet-600">
														{item.kind === "images" ? (
															<svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
																<rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
																<circle cx="9" cy="10" r="1.4" fill="currentColor" />
																<path d="M3.5 15.5 8 12l3.5 2.5L15 11l5.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														) : (
															<svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
																<rect x="2.5" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
																<rect x="9.25" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
																<rect x="16" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
															</svg>
														)}
													</span>
													{item.label}
												</li>
											))
										) : (
											<>
												<li className="invisible flex items-start gap-2 text-[11px] leading-snug">
													<span className="h-4 w-4 shrink-0" />
													—
												</li>
												<li className="invisible flex items-start gap-2 text-[11px] leading-snug">
													<span className="h-4 w-4 shrink-0" />
													—
												</li>
											</>
										)}
									</ul>

									<ul className="mt-3 flex-1 space-y-2">
										{card.features.map((f) => (
											<li
												key={f}
												className="flex gap-1.5 text-[11px] leading-snug text-slate-600"
											>
												<span className="shrink-0 text-violet-600">
													✓
												</span>
												{f}
											</li>
										))}
									</ul>

									<div className="mt-5 shrink-0">
									{card.id === "free" ? (
										<Link
											href="/start"
											className={`block rounded-full px-3 py-2.5 text-center text-xs font-semibold transition ${
												isActive
													? "bg-violet-600 text-white hover:bg-violet-500"
													: "border border-violet-300 text-violet-700 hover:bg-violet-50"
											}`}
										>
											{ctaLabel}
										</Link>
									) : card.id === "custom" ? (
										<a
											href={`mailto:${PRODUCT_SUPPORT_EMAIL}?subject=Custom%20plan`}
											className={`block rounded-full px-3 py-2.5 text-center text-xs font-semibold transition ${
												isActive
													? "bg-violet-600 text-white hover:bg-violet-500"
													: "border border-violet-300 text-violet-700 hover:bg-violet-50"
											}`}
										>
											{ctaLabel}
										</a>
									) : (
										<button
											type="button"
											disabled={busy != null}
											onClick={() =>
												void startCheckout(card.id)
											}
											className={`block w-full rounded-full px-3 py-2.5 text-center text-xs font-semibold transition disabled:opacity-60 ${
												isActive
													? "bg-violet-600 text-white hover:bg-violet-500"
													: "border border-violet-300 text-violet-700 hover:bg-violet-50"
											}`}
										>
											{ctaLabel}
										</button>
									)}
									</div>
								</div>
							</Reveal>
						);
					})}
				</div>
			</div>
		</section>
	);
}
