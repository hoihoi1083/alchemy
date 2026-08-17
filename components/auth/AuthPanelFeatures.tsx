"use client";

import { useLocale } from "@/components/LocaleProvider";

type AuthPanelFeaturesProps = {
	compact?: boolean;
	modal?: boolean;
};

export function AuthPanelFeatures({ compact = false, modal = false }: AuthPanelFeaturesProps) {
	const { m } = useLocale();
	const A = m.auth;

	return (
		<aside
			className={`relative bg-black text-white ${
				modal
					? "overflow-hidden px-4 py-6"
					: "hidden md:flex md:w-[34%] md:max-w-[320px] flex-col justify-center px-6 py-10 lg:px-8 lg:py-12"
			}`}
			style={
				modal
					? {
							minWidth: 0,
							overflow: "hidden",
							wordBreak: "break-word",
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							borderTopLeftRadius: "16px",
							borderBottomLeftRadius: "16px",
						}
					: undefined
			}
		>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(108,59,255,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.2),transparent_40%)]" />
			<div className="relative">
				<p
					className={`inline-block rounded-lg border border-violet-400/60 bg-violet-500/10 font-bold uppercase tracking-[0.14em] text-violet-200 ${
						compact
							? "px-2.5 py-1 text-[10px] leading-snug"
							: "px-3 py-1.5 text-[11px]"
					}`}
				>
					{A.panelTagline}
				</p>
				<ul className={compact ? "mt-4 space-y-3.5" : "mt-8 space-y-6"}>
					{A.panelFeatures.map((feature) => (
						<li key={feature.title} className="flex gap-2.5">
							<span
								className={`mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-violet-500/20 ${
									compact ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-sm"
								}`}
								aria-hidden
							>
								{feature.icon}
							</span>
							<div>
								<p className={compact ? "text-xs font-semibold text-white" : "text-sm font-semibold text-white"}>
									{feature.title}
								</p>
								<p
									className={`mt-1 leading-relaxed text-slate-300 ${
										compact ? "text-[11px] leading-snug" : "text-sm"
									}`}
								>
									{feature.body}
								</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</aside>
	);
}
