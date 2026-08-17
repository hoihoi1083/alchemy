"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";
import {
	estimatePlanApproxCapacity,
	type LandingCapacityPlan,
} from "@/lib/billing/token-costs";
import { estimatePricingCardCapacity } from "@/lib/billing/pricing-card-capacity";

const CAPACITY_PLANS: LandingCapacityPlan[] = [
	"free",
	"standard",
	"pro",
	"master",
];

function IconImages({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<rect
				x="3.5"
				y="5"
				width="17"
				height="14"
				rx="2.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<circle cx="9" cy="10" r="1.6" fill="currentColor" />
			<path
				d="M3.5 15.5 8 12l3.5 2.5L15 11l5.5 4.5"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function IconVideo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<rect
				x="3.5"
				y="6"
				width="17"
				height="12"
				rx="2.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<path d="M10 9.5 16 12l-6 2.5v-5Z" fill="currentColor" />
		</svg>
	);
}

function MetricCell(opts: {
	icon: ReactNode;
	value: string;
	label: string;
}) {
	return (
		<div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-1.5 py-2.5 text-center sm:px-2 sm:py-3">
			<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
				{opts.icon}
			</div>
			<p className="mt-1.5 text-[15px] font-bold leading-tight tracking-tight text-slate-900 sm:text-base">
				{opts.value}
			</p>
			<p className="mt-0.5 text-[10px] leading-snug text-slate-500 sm:text-[11px]">
				{opts.label}
			</p>
		</div>
	);
}

type PlanTokenCapacityGridProps = {
	/** Optional override; defaults to landing copy. */
	title?: string;
	body?: string;
	note?: string;
	className?: string;
};

/** Shared Free / Standard / Pro / Master capacity cards (landing + pricing). */
export function PlanTokenCapacityGrid({
	title,
	body,
	note,
	className = "",
}: PlanTokenCapacityGridProps) {
	const { m } = useLocale();
	const L = m.landing;
	const P = m.pricing;

	const planName = (id: LandingCapacityPlan): string => {
		if (id === "free") return P.plans.free.name;
		if (id === "standard") return P.plans.standard.name;
		if (id === "pro") return P.plans.pro.name;
		return P.plans.master.name;
	};

	const rows = CAPACITY_PLANS.map((plan) => {
		const approx = estimatePlanApproxCapacity(plan);
		const card = estimatePricingCardCapacity(plan);
		return {
			...approx,
			displayImages: card.images,
			displayVideos: card.videos8s,
		};
	});
	const heading = title ?? L.tokensTitle;
	const subtitle = body ?? L.tokensBody;
	const footnote = note ?? L.tokensVideoNote;

	return (
		<div className={`w-full ${className}`.trim()}>
			<div className="mx-auto max-w-xl text-center">
				<Reveal>
					<h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
						{heading}
					</h2>
					<p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
						{subtitle}
					</p>
				</Reveal>
			</div>

			{/* Class + utilities: landing CSS forces columns (Tailwind breakpoints can drop). */}
			<div className="landing-capacity-grid mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
				{rows.map((row, i) => (
					<Reveal
						key={row.plan}
						delayMs={i * 70}
						distance={28}
						scaleFrom={0.96}
						className="h-full min-w-0"
					>
						<article className="flex h-full flex-col items-center rounded-2xl border border-violet-100 bg-white px-3.5 py-4 text-center shadow-sm sm:px-4">
							<p className="text-[15px] font-bold text-slate-900 sm:text-base">
								{planName(row.plan)}
							</p>
							<p className="mt-0.5 text-xs font-semibold text-violet-700">
								{L.tokensPlanGrant.replace(
									"{n}",
									row.tokens.toLocaleString(),
								)}
							</p>

							<div className="mt-3.5 flex w-full flex-row flex-nowrap items-stretch gap-1.5">
								<MetricCell
									icon={<IconImages className="h-4 w-4" />}
									value={row.displayImages.toLocaleString()}
									label={L.tokensCapacityImages}
								/>
								<span
									className="flex shrink-0 items-center px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
									aria-hidden="true"
								>
									{L.tokensCapacityOr}
								</span>
								<MetricCell
									icon={<IconVideo className="h-4 w-4" />}
									value={row.displayVideos.toLocaleString()}
									label={L.tokensCapacityVideos}
								/>
							</div>
						</article>
					</Reveal>
				))}
			</div>
			<p className="mx-auto mt-4 max-w-xl px-2 text-center text-xs leading-relaxed text-slate-500">
				{footnote}
			</p>
		</div>
	);
}
