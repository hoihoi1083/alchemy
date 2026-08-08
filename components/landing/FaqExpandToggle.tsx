"use client";

type Tone = "onDark" | "onLight";

export function FaqExpandToggle({
	expanded,
	showMore,
	showLess,
	onToggle,
	tone = "onLight",
}: {
	expanded: boolean;
	showMore: string;
	showLess: string;
	onToggle: () => void;
	tone?: Tone;
}) {
	const onDark = tone === "onDark";

	return (
		<div className="mt-4 flex justify-center">
			<button
				type="button"
				className={`group inline-flex flex-col items-center gap-2 rounded-2xl px-4 py-2 transition ${
					onDark
						? "text-violet-200 hover:bg-white/5 hover:text-white"
						: "text-violet-700 hover:bg-violet-50 hover:text-violet-800"
				}`}
				aria-expanded={expanded}
				onClick={onToggle}
			>
				<span className="text-xs font-semibold tracking-wide">
					{expanded ? showLess : showMore}
				</span>
				<span
					className={`faq-expand-arrow inline-flex size-9 items-center justify-center rounded-full border-2 transition duration-300 ${
						expanded ? "rotate-180" : ""
					} ${
						onDark
							? "border-violet-300/70 bg-violet-500/15 text-violet-100 shadow-[0_0_0_4px_rgba(139,92,246,0.12)] group-hover:border-violet-200 group-hover:bg-violet-500/25"
							: "border-violet-500 bg-violet-50 text-violet-700 shadow-[0_0_0_4px_rgba(108,59,255,0.08)] group-hover:border-violet-600 group-hover:bg-violet-100"
					}`}
					aria-hidden
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						className={`h-4 w-4 ${expanded ? "" : "faq-expand-arrow-bounce"}`}
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
	);
}
