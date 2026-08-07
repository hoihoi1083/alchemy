"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const BRAND = "#6C3BFF";
const BRAND_SOFT = "#8B5CF6";

function WhyIcon({ children, label }: { children: ReactNode; label: string }) {
	return (
		<svg
			viewBox="0 0 64 64"
			className="mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16"
			role="img"
			aria-label={label}
		>
			{children}
		</svg>
	);
}

/** Prompt-free — wizard path, no chat/prompt typing. */
function IconPromptFree() {
	return (
		<WhyIcon label="Prompt-free">
			<rect x="10" y="10" width="44" height="44" rx="12" fill={BRAND} />
			{/* crossed-out prompt box */}
			<rect x="18" y="18" width="28" height="16" rx="4" fill="#fff" opacity="0.22" />
			<path
				d="M20 22h18M20 28h12"
				stroke="#fff"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.35"
			/>
			<path
				d="M20 20l24 20"
				stroke="#fff"
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			{/* three guided steps */}
			<circle cx="22" cy="44" r="4" fill="#fff" />
			<circle cx="32" cy="44" r="4" fill="#fff" opacity="0.75" />
			<circle cx="42" cy="44" r="4" fill="#fff" opacity="0.5" />
			<path
				d="M26 44h2M36 44h2"
				stroke="#fff"
				strokeWidth="2"
				strokeLinecap="round"
				opacity="0.7"
			/>
		</WhyIcon>
	);
}

/** Intelligent market research — trend chart + search. */
function IconResearch() {
	return (
		<WhyIcon label="Intelligent market research">
			<rect x="8" y="12" width="36" height="40" rx="8" fill={BRAND} />
			<path
				d="M16 40v-6M23 40V28M30 40V24M37 40V20"
				stroke="#fff"
				strokeWidth="3"
				strokeLinecap="round"
				opacity="0.95"
			/>
			<path
				d="M16 34l7-6 7 4 7-8"
				fill="none"
				stroke={BRAND_SOFT}
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="46" cy="44" r="12" fill={BRAND_SOFT} />
			<circle
				cx="44"
				cy="42"
				r="5.5"
				fill="none"
				stroke="#fff"
				strokeWidth="2.5"
			/>
			<path
				d="M48 46.5l4.5 4.5"
				stroke="#fff"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</WhyIcon>
	);
}

/** Storyboard first — locked scene frames. */
function IconStoryboard() {
	return (
		<WhyIcon label="Storyboard first">
			<rect x="6" y="18" width="15" height="28" rx="4" fill={BRAND_SOFT} />
			<rect x="24" y="12" width="16" height="36" rx="4" fill={BRAND} />
			<rect x="43" y="18" width="15" height="28" rx="4" fill={BRAND_SOFT} />
			<rect x="28" y="20" width="8" height="6" rx="1.5" fill="#fff" opacity="0.85" />
			<rect x="28" y="30" width="8" height="6" rx="1.5" fill="#fff" opacity="0.55" />
			{/* lock on middle frame */}
			<rect x="29" y="40" width="6" height="5" rx="1" fill="#fff" />
			<path
				d="M30.5 40v-2a1.5 1.5 0 0 1 3 0v2"
				fill="none"
				stroke="#fff"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</WhyIcon>
	);
}

/** Editable output — canvas + instant tweak pencil. */
function IconEditable() {
	return (
		<WhyIcon label="Editable output">
			<rect x="8" y="10" width="38" height="38" rx="8" fill={BRAND} />
			<rect x="14" y="16" width="26" height="12" rx="3" fill="#fff" opacity="0.92" />
			<rect x="14" y="32" width="18" height="3" rx="1.5" fill="#fff" opacity="0.55" />
			<rect x="14" y="38" width="12" height="3" rx="1.5" fill="#fff" opacity="0.35" />
			<circle cx="46" cy="46" r="13" fill={BRAND_SOFT} />
			<path d="M40.5 48l9-9 3.2 3.2-9 9H40.5v-3.2z" fill="#fff" />
			<path
				d="M48 40.5l2.8 2.8"
				stroke="#fff"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
			{/* spark = instant fix */}
			<path
				d="M52 34v3M52 40v1M49 37h3M54 37h1"
				stroke="#fff"
				strokeWidth="1.6"
				strokeLinecap="round"
				opacity="0.9"
			/>
		</WhyIcon>
	);
}

/** Products & Concepts — bottle + idea spark. */
function IconProducts() {
	return (
		<WhyIcon label="Products and concepts">
			{/* product bottle */}
			<path
				d="M16 20h10v4c4 1 6 4 6 9v13a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V33c0-5 2-8 6-9v-4z"
				fill={BRAND}
			/>
			<rect x="17" y="14" width="8" height="7" rx="2" fill={BRAND_SOFT} />
			<rect x="16" y="30" width="10" height="3" rx="1.5" fill="#fff" opacity="0.75" />
			<rect x="16" y="36" width="7" height="3" rx="1.5" fill="#fff" opacity="0.45" />
			{/* concept / idea */}
			<circle cx="46" cy="30" r="13" fill={BRAND_SOFT} />
			<path
				d="M46 22c-3.5 0-6 2.6-6 6 0 2.2 1.2 3.9 3 5v3h6v-3c1.8-1.1 3-2.8 3-5 0-3.4-2.5-6-6-6z"
				fill="#fff"
			/>
			<path
				d="M43 39h6M43.5 42h5"
				stroke="#fff"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</WhyIcon>
	);
}

/** Subscription + Token — plan card + token coin. */
function IconSubscription() {
	return (
		<WhyIcon label="Subscription and token">
			{/* subscription card */}
			<rect x="8" y="14" width="30" height="36" rx="8" fill={BRAND} />
			<rect x="14" y="22" width="18" height="4" rx="2" fill="#fff" opacity="0.9" />
			<rect x="14" y="30" width="12" height="3" rx="1.5" fill="#fff" opacity="0.45" />
			<rect x="14" y="36" width="16" height="3" rx="1.5" fill="#fff" opacity="0.3" />
			{/* token */}
			<circle cx="44" cy="40" r="14" fill={BRAND_SOFT} />
			<circle
				cx="44"
				cy="40"
				r="9.5"
				fill="none"
				stroke="#fff"
				strokeWidth="2.4"
			/>
			<text
				x="44"
				y="44.5"
				textAnchor="middle"
				fill="#fff"
				fontSize="13"
				fontWeight="700"
				fontFamily="ui-sans-serif, system-ui, sans-serif"
			>
				T
			</text>
		</WhyIcon>
	);
}

const WHY_ICONS = [
	IconPromptFree,
	IconResearch,
	IconStoryboard,
	IconEditable,
	IconProducts,
	IconSubscription,
] as const;

export function LandingWhyDifferent() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section id="why" className="landing-why relative w-full overflow-hidden">
			<div className="landing-why-inner relative">
				<Reveal>
					<h2 className="max-w-3xl text-left text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
						{L.whyTitle}
					</h2>
				</Reveal>
				<div className="landing-why-grid grid grid-cols-2">
					{L.whyItems.map((item, i) => {
						const Icon = WHY_ICONS[i];
						return (
							<Reveal
								key={item.title}
								delayMs={i * 95}
								distance={44}
								scaleFrom={0.94}
							>
								<div className="text-center">
									<div className="mx-auto mb-1 inline-flex rounded-2xl border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-md">
										<Icon />
									</div>
									<h3 className="text-[13px] font-semibold leading-snug text-white md:text-sm">
										{item.title}
									</h3>
									<p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 md:text-xs">
										{item.body}
									</p>
								</div>
							</Reveal>
						);
					})}
				</div>
			</div>
		</section>
	);
}
