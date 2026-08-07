"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const TOOLS = [
	{
		href: "/studio",
		titleKey: "toolBrandTitle" as const,
		descKey: "toolBrandDesc" as const,
		src: "/images/landing/tool-icon-brand.png?v=2",
	},
	{
		href: "/edit-image",
		titleKey: "toolEditTitle" as const,
		descKey: "toolEditDesc" as const,
		src: "/images/landing/tool-icon-edit.png?v=2",
	},
	{
		href: "/captions",
		titleKey: "toolCaptionsTitle" as const,
		descKey: "toolCaptionsDesc" as const,
		src: "/images/landing/tool-icon-captions.png?v=2",
	},
	{
		href: "/pro",
		titleKey: "toolProTitle" as const,
		descKey: "toolProDesc" as const,
		src: "/images/landing/tool-icon-pro.png?v=2",
		badgeKey: "proMasterBadge" as const,
	},
] as const;

/**
 * Tool cards — square art (1:1) + centered copy. Wide enough to read as product tiles.
 */
export function LandingProductTools() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section id="tools" className="w-full bg-white">
			<div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
				<Reveal>
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
							{L.toolsTitle}
						</h2>
						<p className="mt-1.5 text-sm text-slate-500">
							{L.toolsSubtitle}
						</p>
					</div>
				</Reveal>

				<ul className="landing-tools-grid mx-auto mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
					{TOOLS.map((tool, i) => (
						<li key={tool.href} className="min-w-0">
							<Reveal
								delayMs={i * 90}
								distance={40}
								scaleFrom={1.94}
								className="h-full"
							>
								<Link
									href={tool.href}
									className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-center shadow-sm transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/70"
								>
									<div className="relative aspect-square overflow-hidden bg-[#0B1020]">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={tool.src}
											alt=""
											width={400}
											height={400}
											className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
										/>
										{"badgeKey" in tool && tool.badgeKey ? (
											<span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 shadow-sm">
												{L[tool.badgeKey]}
											</span>
										) : null}
									</div>

									<div className="flex flex-1 flex-col items-center px-3.5 pb-4 pt-3 sm:px-4">
										<p className="w-full text-sm font-semibold tracking-tight text-slate-900 group-hover:text-violet-800">
											{L[tool.titleKey]}
										</p>
										<p className="mt-1.5 line-clamp-2 w-full text-xs leading-snug text-slate-500">
											{L[tool.descKey]}
										</p>
										<span className="mt-auto inline-flex items-center justify-center gap-0.5 pt-3 text-xs font-semibold text-violet-700">
											{L.toolsOpenCta}
											<span
												aria-hidden
												className="transition group-hover:translate-x-0.5"
											>
												→
											</span>
										</span>
									</div>
								</Link>
							</Reveal>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
