"use client";

import { useEffect, useRef, useState } from "react";

const POSTER = "/images/assistant/mascot-launcher.jpg?v=1";
const VIDEO = "/videos/assistant/mascot-launcher.mp4?v=1";

type Props = {
	alt: string;
	className?: string;
	size?: "lg" | "md";
	animated?: boolean;
};

/**
 * Ask AI floating launcher — brand flask mascot with idle motion loop.
 * Landing (`lg`): soft chat-cloud — circle + small natural tip at bottom-right.
 * Panel header stays rounded square.
 */
export function AssistantMascotLauncher({
	alt,
	className = "",
	size = "lg",
	animated = true,
}: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [reduce, setReduce] = useState(false);
	const [failed, setFailed] = useState(false);
	const showVideo = animated && !reduce && !failed;
	const chatBubble = size === "lg";

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduce(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const v = videoRef.current;
		if (!v || !showVideo) return;
		v.defaultMuted = true;
		v.muted = true;
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
	}, [showVideo]);

	const media = (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={POSTER}
				alt={alt}
				className="absolute inset-0 h-full w-full object-cover object-center"
				decoding="async"
			/>
			{showVideo ? (
				// eslint-disable-next-line jsx-a11y/media-has-caption
				<video
					ref={videoRef}
					className="absolute inset-0 h-full w-full object-cover object-center"
					src={VIDEO}
					poster={POSTER}
					muted
					playsInline
					loop
					autoPlay
					preload="auto"
					disablePictureInPicture
					controls={false}
					aria-label={alt}
					onError={() => setFailed(true)}
				/>
			) : null}
		</>
	);

	if (chatBubble) {
		// ~pill height so it sits level with “立即開始”; tip stays tiny at SE corner
		return (
			<span
				className={`relative inline-block shrink-0 ${className}`}
				style={{
					width: 52,
					height: 52,
					filter: "drop-shadow(0 6px 16px rgba(15, 23, 42, 0.42))",
				}}
			>
				<svg
					aria-hidden
					width={52}
					height={52}
					viewBox="0 0 52 52"
					style={{ display: "block" }}
				>
					{/* Round body + short tip with brand purple outline */}
					<circle
						cx="25"
						cy="25"
						r="23"
						fill="#0b0818"
						stroke="#8B5CF6"
						strokeWidth="2"
					/>
					<path
						d="M39 41 L46 49.5 L35.5 44.5 Z"
						fill="#0b0818"
						stroke="#8B5CF6"
						strokeWidth="2"
						strokeLinejoin="round"
					/>
				</svg>

				<span
					className="absolute overflow-hidden rounded-full"
					style={{ left: 3, top: 3, width: 44, height: 44 }}
				>
					{media}
				</span>
			</span>
		);
	}

	return (
		<span
			className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#0b0818] shadow-[0_8px_24px_-10px_rgba(124,58,237,0.55)] ring-2 ring-violet-400/80 ${className}`}
		>
			{media}
		</span>
	);
}
