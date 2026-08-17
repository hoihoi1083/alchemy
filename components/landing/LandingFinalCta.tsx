"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { LandingWatchDemoButton } from "@/components/landing/LandingDemoModal";
import { Reveal } from "@/components/landing/Reveal";

const FINAL_CTA_IMAGE = "/images/landing/final-cta-studio.jpg?v=3";
const FINAL_CTA_VIDEO = "/videos/landing/final-cta-studio.mp4?v=3";

function FinalCtaMedia({ alt }: { alt: string }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [active, setActive] = useState(true);
	const [reduce, setReduce] = useState(false);
	const [failed, setFailed] = useState(false);
	const showVideo = !reduce && !failed;

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduce(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => setActive(Boolean(entry?.isIntersecting)),
			{ threshold: 0.15, rootMargin: "80px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		const v = videoRef.current;
		if (!v || !showVideo) return;
		v.defaultMuted = true;
		v.muted = true;
		if (!active) {
			v.pause();
			return;
		}
		const tryPlay = () => {
			void v.play().catch(() => {});
		};
		if (v.readyState >= 2) tryPlay();
		else {
			const onReady = () => tryPlay();
			v.addEventListener("canplay", onReady, { once: true });
			v.load();
			return () => v.removeEventListener("canplay", onReady);
		}
	}, [active, showVideo]);

	return (
		<div
			ref={rootRef}
			className="relative overflow-hidden rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={FINAL_CTA_IMAGE}
				alt={alt}
				className="h-auto w-full object-cover"
				loading="lazy"
				decoding="async"
			/>
			{showVideo ? (
				<video
					ref={videoRef}
					key={FINAL_CTA_VIDEO}
					className="absolute inset-0 h-full w-full object-cover"
					src={FINAL_CTA_VIDEO}
					poster={FINAL_CTA_IMAGE}
					muted
					playsInline
					loop
					autoPlay
					preload="auto"
					aria-label={alt}
					onError={() => setFailed(true)}
				/>
			) : null}
		</div>
	);
}

export function LandingFinalCta() {
	const { m } = useLocale();
	const L = m.landing;

	return (
		<section className="w-full overflow-hidden bg-white px-5 py-1 md:px-8 md:py-1 mb-10">
			<style>{`
        .landing-final-cta {
          background-color: #070b16;
          background-image:
            radial-gradient(ellipse 90% 80% at 8% 100%, rgba(108, 59, 255, 0.55) 0%, transparent 55%),
            radial-gradient(ellipse 70% 65% at 92% 0%, rgba(139, 92, 246, 0.38) 0%, transparent 50%),
            radial-gradient(ellipse 55% 50% at 55% 45%, rgba(76, 37, 212, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse 40% 45% at 30% 15%, rgba(108, 59, 255, 0.14) 0%, transparent 55%);
          color: #ffffff;
          box-shadow: 0 20px 40px -12px rgba(7, 11, 22, 0.45);
        }
        .landing-final-cta::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.16) 1px,
            transparent 1.2px
          );
          background-size: 20px 20px;
          background-position: 0 0;
          opacity: 0.55;
          mask-image: radial-gradient(
            ellipse 95% 90% at 50% 50%,
            #000 35%,
            transparent 100%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 95% 90% at 50% 50%,
            #000 35%,
            transparent 100%
          );
        }
      `}</style>
			<Reveal distance={48} scaleFrom={0.94}>
				<div className="landing-final-cta relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-[1.5rem]">
					<div className="landing-final-cta-grid relative z-10 grid items-center gap-6 px-6 py-8 md:gap-8 md:px-10 md:py-10">
						<div className="min-w-0 max-w-2xl">
							<h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
								{L.finalTitle}
							</h2>
							<p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300/95">
								{L.finalBody}
							</p>
							<div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
								<Link
									href="/start"
									className="landing-cta-shine inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow sm:w-auto"
								>
									{L.ctaPrimary}
								</Link>
								<LandingWatchDemoButton className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/70 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto" />
							</div>
						</div>

						<div className="landing-final-cta-media relative mx-auto w-full max-w-xl md:mx-0 md:justify-self-end">
							<FinalCtaMedia alt={L.finalImageAlt} />
						</div>
					</div>
				</div>
			</Reveal>
		</section>
	);
}
