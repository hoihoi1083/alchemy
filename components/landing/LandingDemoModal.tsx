"use client";

import Link from "next/link";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
	LANDING_DEMO_IDS,
	LANDING_DEMOS,
	type LandingDemoId,
} from "@/lib/landing-demo";

type LandingDemoContextValue = {
	openLandingDemo: (demo?: LandingDemoId) => void;
	closeLandingDemo: () => void;
};

const LandingDemoContext = createContext<LandingDemoContextValue | null>(null);

function stepIndexForTime(t: number, marks: readonly number[]): number {
	for (let i = marks.length - 1; i >= 0; i--) {
		if (t >= marks[i]! - 0.05) return i;
	}
	return 0;
}

function DemoModalOverlay({
	onClose,
	initialDemo,
}: {
	onClose: () => void;
	initialDemo: LandingDemoId;
}) {
	const { m } = useLocale();
	const D = m.landing.demoModal;
	const videoRef = useRef<HTMLVideoElement>(null);
	const [demoId, setDemoId] = useState<LandingDemoId>(initialDemo);
	const [activeStep, setActiveStep] = useState(0);
	const [reduce, setReduce] = useState(false);
	const [failed, setFailed] = useState(false);

	const asset = LANDING_DEMOS[demoId];
	const copy = D.demos[demoId];
	const marks = asset.stepMarks;

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduce(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [onClose]);

	useEffect(() => {
		setFailed(false);
		setActiveStep(0);
		const v = videoRef.current;
		if (!v || reduce) return;
		v.currentTime = 0;
		void v.play().catch(() => {});
	}, [demoId, reduce, asset.video]);

	const seekToStep = useCallback(
		(index: number) => {
			const v = videoRef.current;
			if (!v) return;
			const t = marks[index] ?? 0;
			v.currentTime = t;
			setActiveStep(index);
			void v.play().catch(() => {});
		},
		[marks],
	);

	const onTimeUpdate = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		setActiveStep(stepIndexForTime(v.currentTime, marks));
	}, [marks]);

	const tabLabel = useMemo(
		() => ({
			image: D.tabs.image,
			storyboard: D.tabs.storyboard,
			video: D.tabs.video,
		}),
		[D.tabs],
	);

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
			role="dialog"
			aria-modal="true"
			aria-label={copy.title}
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#0c0a12] shadow-2xl shadow-violet-950/40"
				onClick={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-lg text-white transition hover:bg-black"
					aria-label={D.close}
				>
					×
				</button>

				<div className="border-b border-white/10 px-5 pb-3 pt-5 pr-14 sm:px-6 sm:pt-6">
					<div
						className="mb-3 flex flex-wrap gap-1.5"
						role="tablist"
						aria-label={D.tabsAria}
					>
						{LANDING_DEMO_IDS.map((id) => {
							const on = id === demoId;
							return (
								<button
									key={id}
									type="button"
									role="tab"
									aria-selected={on}
									onClick={() => setDemoId(id)}
									className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
										on
											? "bg-violet-500 text-white"
											: "bg-white/8 text-slate-300 hover:bg-white/12"
									}`}
								>
									{tabLabel[id]}
								</button>
							);
						})}
					</div>
					<h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
						{copy.title}
					</h2>
					<p className="mt-1 text-sm text-slate-400">{copy.subtitle}</p>
				</div>

				<div className="relative aspect-[16/10] w-full bg-violet-950/30 sm:aspect-video">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={asset.poster}
						alt=""
						className={`absolute inset-0 h-full w-full ${
							demoId === "video" ? "object-contain bg-black" : "object-cover"
						}`}
						aria-hidden
					/>
					{!reduce && !failed ? (
						<video
							key={asset.video}
							ref={videoRef}
							className={`absolute inset-0 h-full w-full ${
								demoId === "video" ? "object-contain bg-black" : "object-cover"
							}`}
							src={asset.video}
							poster={asset.poster}
							controls
							playsInline
							autoPlay
							preload="auto"
							onTimeUpdate={onTimeUpdate}
							onEnded={() => seekToStep(0)}
							onError={() => setFailed(true)}
						/>
					) : null}
				</div>

				<div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
					<ol className="grid gap-2 sm:grid-cols-4">
						{copy.steps.map((step, i) => {
							const isActive = i === activeStep;
							return (
								<li key={step.title}>
									<button
										type="button"
										onClick={() => seekToStep(i)}
										className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
											isActive
												? "border-violet-400/60 bg-violet-500/15 ring-1 ring-violet-400/30"
												: "border-white/10 bg-white/5 hover:border-violet-400/30 hover:bg-white/8"
										}`}
									>
										<span
											className={`text-[10px] font-bold uppercase tracking-wide ${
												isActive ? "text-violet-300" : "text-slate-500"
											}`}
										>
											{String(i + 1).padStart(2, "0")}
										</span>
										<p
											className={`mt-0.5 text-xs font-semibold leading-snug ${
												isActive ? "text-white" : "text-slate-300"
											}`}
										>
											{step.title}
										</p>
									</button>
								</li>
							);
						})}
					</ol>

					<p className="text-sm leading-relaxed text-slate-400">
						{copy.steps[activeStep]?.body}
					</p>

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-xs text-slate-500">{copy.hint}</p>
						<Link
							href="/start"
							onClick={onClose}
							className="inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/25 hover:bg-violet-400"
						>
							{D.tryCta}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

export function LandingDemoProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [initialDemo, setInitialDemo] = useState<LandingDemoId>("storyboard");

	const openLandingDemo = useCallback((demo?: LandingDemoId) => {
		const id =
			demo && LANDING_DEMO_IDS.includes(demo) ? demo : "storyboard";
		setInitialDemo(id);
		setOpen(true);
	}, []);
	const closeLandingDemo = useCallback(() => setOpen(false), []);

	return (
		<LandingDemoContext.Provider value={{ openLandingDemo, closeLandingDemo }}>
			{children}
			{open ? (
				<DemoModalOverlay onClose={closeLandingDemo} initialDemo={initialDemo} />
			) : null}
		</LandingDemoContext.Provider>
	);
}

export function useLandingDemo() {
	const context = useContext(LandingDemoContext);
	if (!context) {
		throw new Error("useLandingDemo must be used within LandingDemoProvider");
	}
	return context;
}

/** Secondary CTA button — opens the demo modal. */
export function LandingWatchDemoButton({
	className,
}: {
	className?: string;
}) {
	const { m } = useLocale();
	const { openLandingDemo } = useLandingDemo();

	return (
		<button type="button" onClick={() => openLandingDemo()} className={className}>
			<span aria-hidden>▶</span>
			{m.landing.ctaSecondary}
		</button>
	);
}
