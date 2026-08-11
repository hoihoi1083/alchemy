"use client";

import { useEffect, useRef, useState } from "react";

const HOW_STEP_IMAGES = [
  "/images/landing/how-step-1-upload.jpg?v=3",
  "/images/landing/how-step-2-analyze.jpg",
  "/images/landing/how-step-3-plan.jpg?v=3",
  "/images/landing/how-step-4-generate.jpg?v=3",
] as const;

const HOW_STEP_VIDEOS = [
  "/videos/landing/how-step-1-upload.mp4?v=3",
  "/videos/landing/how-step-2-analyze.mp4",
  "/videos/landing/how-step-3-plan.mp4?v=3",
  "/videos/landing/how-step-4-generate.mp4?v=3",
] as const;

type HowStepMediaProps = {
  step: 0 | 1 | 2 | 3;
  alt: string;
};

/**
 * Seedance I2V loops from the how-step stills (JPG as poster).
 * Reduced-motion falls back to the still.
 */
export function HowStepMedia({ step, alt }: HowStepMediaProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(true);
  const [reduce, setReduce] = useState(false);
  const [failed, setFailed] = useState(false);

  const poster = HOW_STEP_IMAGES[step];
  const src = HOW_STEP_VIDEOS[step];
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
    setFailed(false);
  }, [step]);

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
      void v.play().catch(() => {
        // Autoplay can race load; retry after canplay. Don't kill video permanently.
      });
    };

    if (v.readyState >= 2) tryPlay();
    else {
      const onReady = () => tryPlay();
      v.addEventListener("canplay", onReady, { once: true });
      v.load();
      return () => v.removeEventListener("canplay", onReady);
    }
  }, [active, showVideo, src]);

  return (
    <div
      ref={rootRef}
      className="landing-how-motion relative h-full w-full overflow-hidden bg-violet-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />

      {showVideo ? (
        <video
          ref={videoRef}
          key={src}
          className="absolute inset-0 h-full w-full object-cover object-top"
          src={src}
          poster={poster}
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

export { HOW_STEP_IMAGES, HOW_STEP_VIDEOS };
