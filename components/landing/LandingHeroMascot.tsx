"use client";

import { useEffect, useRef } from "react";

/**
 * Left/right only — fixed-camera head-turn video + pointer X scrubs currentTime.
 * Responsive: object-position shifts so the flask stays visible on narrow screens;
 * touch + mouse both drive the look.
 */
const VIDEO = "/images/landing/alchemy-flask-headturn.mp4?v=1";
const POSTER = "/images/landing/alchemy-flask-poster.jpg?v=1";
const FALLBACK_POSTER = "/images/landing/look-grid/cm.png?v=v5-cute-goggles-2";

const FOLLOW = 7;

type Props = {
  alt: string;
};

export function LandingHeroMascot({ alt }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetT = useRef(0.5);
  const currentT = useRef(0.5);
  const rafRef = useRef(0);
  const lastTs = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.playsInline = true;

    const setFromClientX = (clientX: number) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const local = (clientX - r.left) / Math.max(1, r.width);
      const view = clientX / Math.max(1, window.innerWidth);
      const nx = Math.max(0, Math.min(1, local * 0.7 + view * 0.3));
      const eased = nx * nx * (3 - 2 * nx);
      targetT.current = 0.04 + eased * 0.92;
    };

    const onPointerMove = (e: PointerEvent) => {
      setFromClientX(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setFromClientX(t.clientX);
    };

    const tick = (ts: number) => {
      const prev = lastTs.current || ts;
      const dt = Math.min(0.05, (ts - prev) / 1000);
      lastTs.current = ts;

      const v = videoRef.current;
      if (v && v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        const k = 1 - Math.exp(-FOLLOW * dt);
        currentT.current += (targetT.current - currentT.current) * k;
        const next = currentT.current * Math.max(0.001, v.duration - 0.04);
        if (Math.abs(v.currentTime - next) > 0.008) {
          try {
            v.currentTime = next;
          } catch {
            /* seek race while loading */
          }
        }
        if (!v.paused) v.pause();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onLoaded = () => {
      const v = videoRef.current;
      if (!v?.duration) return;
      v.currentTime = currentT.current * v.duration;
      v.pause();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    video.addEventListener("loadedmetadata", onLoaded);
    if (video.readyState >= 1) onLoaded();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      video.removeEventListener("loadedmetadata", onLoaded);
      cancelAnimationFrame(rafRef.current);
      lastTs.current = 0;
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden bg-[#06040f]">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="landing-hero-video h-full w-full object-cover"
        src={VIDEO}
        poster={POSTER}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        aria-label={alt}
        onError={(e) => {
          e.currentTarget.poster = FALLBACK_POSTER;
        }}
      />
    </div>
  );
}
