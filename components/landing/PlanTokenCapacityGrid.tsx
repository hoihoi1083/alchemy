"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";
import {
	estimatePlanApproxCapacity,
	type LandingCapacityPlan,
} from "@/lib/billing/token-costs";

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

function IconStoryboard({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<rect
				x="2.5"
				y="5"
				width="5.5"
				height="14"
				rx="1.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<rect
				x="9.25"
				y="5"
				width="5.5"
				height="14"
				rx="1.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<rect
				x="16"
				y="5"
				width="5.5"
				height="14"
				rx="1.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<path
				d="M11.2 11.2 14.2 13l-3 1.8v-3.6Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function MetricCell(opts: {
	icon: ReactNode;
	value: string;
	label: string;
}) {
	return (
		<div className="plan-capacity-metric">
			<div className="plan-capacity-metric-icon">{opts.icon}</div>
			<p className="plan-capacity-metric-value">{opts.value}</p>
			<p className="plan-capacity-metric-label">{opts.label}</p>
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

	const rows = CAPACITY_PLANS.map((plan) => estimatePlanApproxCapacity(plan));
	const heading = title ?? L.tokensTitle;
	const subtitle = body ?? L.tokensBody;
	const footnote = note ?? L.tokensVideoNote;

	return (
		<div className={`plan-capacity ${className}`.trim()}>
			<div className="plan-capacity-header">
				<Reveal>
					<h2 className="plan-capacity-title">{heading}</h2>
					<p className="plan-capacity-body">{subtitle}</p>
				</Reveal>
			</div>

			<div className="plan-capacity-grid">
				{rows.map((row, i) => (
					<Reveal
						key={row.plan}
						delayMs={i * 70}
						distance={28}
						scaleFrom={0.96}
						className="plan-capacity-reveal"
					>
						<article className="plan-capacity-card">
							<p className="plan-capacity-plan">{planName(row.plan)}</p>
							<p className="plan-capacity-tokens">
								{L.tokensPlanGrant.replace(
									"{n}",
									row.tokens.toLocaleString(),
								)}
							</p>

							<div className="plan-capacity-metrics">
								<MetricCell
									icon={<IconImages className="h-4 w-4" />}
									value={`~${row.approxImages.toLocaleString()}`}
									label={L.tokensCapacityImages}
								/>
								<span className="plan-capacity-or" aria-hidden="true">
									{L.tokensCapacityOr}
								</span>
								<MetricCell
									icon={<IconStoryboard className="h-4 w-4" />}
									value={`~${row.approxStoryboards.toLocaleString()}`}
									label={L.tokensCapacityStoryboards.replace(
										"{sec}",
										String(row.storyboardSec),
									)}
								/>
							</div>
						</article>
					</Reveal>
				))}
			</div>
			<p className="plan-capacity-note">{footnote}</p>
		</div>
	);
}
