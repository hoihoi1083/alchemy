"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const CANVAS_IMG = "/images/landing/landing-canvas-edit.png";

const FEATURE_ICONS = [
	"/images/landing/canvas-icon-remove.png",
	"/images/landing/canvas-icon-text.png",
	"/images/landing/canvas-icon-logo.png",
	"/images/landing/canvas-icon-diagram.png",
	"/images/landing/canvas-icon-export.png",
];

export function LandingEditableCanvas() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section
			id="canvas"
			className="w-full bg-white px-5 py-12 md:px-8 md:py-14"
		>
			<div className="mx-auto w-full max-w-[1440px] overflow-hidden rounded-[1.75rem] bg-[#0B1020] text-white shadow-[0_28px_70px_-24px_rgba(91,33,182,0.65)] ring-1 ring-violet-400/35">
				<div className="landing-canvas-grid grid gap-8 px-6 py-10 md:items-center md:gap-10 md:px-10 md:py-12">
					<Reveal distance={56} scaleFrom={0.94} className="min-w-0">
						<div className="landing-story-card overflow-hidden rounded-2xl border border-white/15 bg-white text-slate-900 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
							<div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
								<span>{L.canvasMockTitle}</span>
								<span>100%</span>
							</div>
							<div className="flex min-h-[260px]">
								<aside className="hidden w-[4.25rem] shrink-0 flex-col gap-2.5 border-r border-slate-100 bg-slate-50 p-2 sm:flex">
									{L.canvasSidebar.map((label) => (
										<div
											key={label}
											className="text-center"
										>
											<div
												className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl"
												style={{
													background: "#EDE4FF",
												}}
											>
												<span
													className="block h-2.5 w-2.5 rotate-45 rounded-[1px]"
													style={{
														background: "#7C3AED",
													}}
												/>
											</div>
											<p className="mt-0.5 text-[7px] font-medium leading-tight text-slate-500">
												{label}
											</p>
										</div>
									))}
								</aside>

								<div className="relative min-w-0 flex-1 bg-[#F5F0E8] p-3">
									<div className="relative mx-auto max-w-[240px]">
										<div
											className="relative overflow-hidden rounded-lg ring-2 ring-indigo-500"
											style={{
												boxShadow:
													"0 0 0 1px rgba(99,102,241,0.35)",
											}}
										>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<Reveal
												distance={48}
												scaleFrom={1.94}
												className="mx-auto w-full min-w-0 max-w-[500px] md:mx-0 lg:max-w-[560px]"
											>
												<img
													src={CANVAS_IMG}
													alt={L.canvasImageAlt}
													className="aspect-square w-full object-cover"
												/>
											</Reveal>
											<div className="pointer-events-none absolute inset-x-3 top-3 rounded bg-white/95 px-2 py-1.5 text-center text-[10px] font-bold leading-snug tracking-wide text-slate-900 shadow">
												{L.canvasOverlayText}
											</div>
											{(
												[
													"left-1 top-1",
													"right-1 top-1",
													"left-1 bottom-1",
													"right-1 bottom-1",
												] as const
											).map((pos) => (
												<span
													key={pos}
													className={`absolute h-2.5 w-2.5 rounded-sm bg-white ring-2 ring-indigo-500 ${pos}`}
													aria-hidden
												/>
											))}
										</div>
									</div>
								</div>

								<aside className="hidden w-[5.5rem] shrink-0 flex-col gap-2 border-l border-slate-100 bg-white p-2 lg:flex">
									<p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
										Edit
									</p>
									{["AI Erase", "Expand", "Chart"].map(
										(t) => (
											<div
												key={t}
												className="rounded-md border border-slate-100 bg-slate-50 px-1.5 py-1 text-center text-[8px] font-medium text-slate-600"
											>
												{t}
											</div>
										),
									)}
									<p className="mt-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
										Layers
									</p>
									{["Text", "Image", "BG"].map((t) => (
										<div
											key={t}
											className="rounded-md border border-slate-100 px-1.5 py-1 text-center text-[8px] text-slate-500"
										>
											{t}
										</div>
									))}
								</aside>
							</div>
						</div>
					</Reveal>

					<Reveal delayMs={140} distance={44} className="min-w-0">
						<h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
							{L.canvasTitle}
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-slate-300">
							{L.canvasBody}
						</p>

						<ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
							{L.canvasFeatureItems.map((item, i) => (
								<li key={item.title} className="text-center">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={FEATURE_ICONS[i]}
										alt=""
										className="mx-auto mb-2 h-11 w-11 rounded-full object-cover shadow-sm"
									/>
									<p className="text-[11px] font-semibold text-white">
										{item.title}
									</p>
									<p className="mt-0.5 text-[10px] leading-snug text-slate-400">
										{item.body}
									</p>
								</li>
							))}
						</ul>

						<Link
							href="/edit-image"
							className="landing-cta-shine mt-7 inline-flex rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
						>
							{L.canvasCta}
						</Link>
					</Reveal>
				</div>
			</div>
		</section>
	);
}
