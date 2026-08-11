"use client";

import { Fragment } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { HowStepMedia } from "@/components/landing/HowStepMedia";
import { Reveal } from "@/components/landing/Reveal";

export function LandingHowItWorks() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section id="how" className="w-full bg-white">
			<div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
				<Reveal>
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
							{L.howTitleBefore}
							<span className="text-violet-600">{L.howTitleHighlight}</span>
						</h2>
						<p className="mt-2 text-sm text-slate-500">
							{L.howSubtitle}
						</p>
					</div>
				</Reveal>

				{/*
          Desktop: card | arrow | card | arrow | card | arrow | card
          (arrows are real columns, not absolute overlays — so they sit between cards)
        */}
				<ol className="landing-how-grid mt-10 grid grid-cols-1 items-stretch gap-4 md:gap-5">
					{L.howSteps.map((step, i) => {
						const stepIndex = (i % 4) as 0 | 1 | 2 | 3;
						return (
							<Fragment key={step.title}>
								<li className="min-w-0">
									<Reveal
										delayMs={i * 110}
										distance={52}
										scaleFrom={1.44}
										className="h-full"
									>
										<div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
											<span className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-sm ring-2 ring-white">
												{i + 1}
											</span>
											<div className="relative aspect-[4/3] w-full overflow-hidden">
												<HowStepMedia
													step={stepIndex}
													alt={step.title}
												/>
											</div>
											<div className="flex flex-1 flex-col px-4 pb-4 pt-3">
												<h3 className="text-sm font-semibold text-slate-900">
													{step.title}
												</h3>
												<p className="mt-1.5 text-xs leading-relaxed text-slate-500">
													{step.body}
												</p>
											</div>
										</div>
									</Reveal>
								</li>

								{i < L.howSteps.length - 1 ? (
									<li
										className="landing-how-arrow items-center justify-center self-center"
										aria-hidden
									>
										<Reveal
											delayMs={i * 110 + 180}
											distance={0}
											scaleFrom={1.44}
											className="flex"
										>
											<span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-lg font-semibold leading-none text-violet-600 shadow-sm ring-2 ring-white">
												<span
													className={`landing-arrow-pulse landing-arrow-pulse--${i}`}
												>
													→
												</span>
											</span>
										</Reveal>
									</li>
								) : null}
							</Fragment>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
