"use client";

import { useEffect, useRef, useState } from "react";

const POSTER = "/images/assistant/mascot-launcher.jpg?v=1";
const VIDEO = "/videos/assistant/mascot-launcher.mp4?v=1";

type Props = {
	alt: string;
	className?: string;
	/** Larger landing FAB vs compact dark chrome. */
	size?: "lg" | "md";
	/** Idle video loop; false = poster only (e.g. panel header). */
	animated?: boolean;
};

/**
 * Ask AI floating launcher — brand flask mascot with idle motion loop.
 * Falls back to poster when reduced-motion or video fails.
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

	const box =
		size === "lg"
			? "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl"
			: "relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-2 ring-violet-400/80";

	return (
		<span
			className={`${box} bg-[#0b0818] shadow-[0_8px_24px_-10px_rgba(124,58,237,0.55)] ${className}`}
		>
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
		</span>
	);
}
