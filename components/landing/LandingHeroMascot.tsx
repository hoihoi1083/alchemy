"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desktop: pointer X picks look-grid stills (L/C/R) — no video seek lag.
 * Mobile / touch / reduced-motion: center poster only.
 */
const LOOK = {
  l: "/images/landing/look-grid/lm.png?v=v5-cute-goggles-2",
  c: "/images/landing/look-grid/cm.png?v=v5-cute-goggles-2",
  r: "/images/landing/look-grid/rm.png?v=v5-cute-goggles-2",
} as const;

const POSTER = "/images/landing/alchemy-flask-poster.jpg?v=1";
const FALLBACK_POSTER = LOOK.c;

type LookKey = keyof typeof LOOK;

/** Fine pointer + hover ≈ desktop mouse; excludes phones / most tablets. */
function canFollowPointer(): boolean {
  if (typeof window === "undefined") return false;
  const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return fineHover && !reduceMotion;
}

function lookFromClientX(clientX: number, wrap: HTMLElement): LookKey {
  const r = wrap.getBoundingClientRect();
  const local = (clientX - r.left) / Math.max(1, r.width);
  const view = clientX / Math.max(1, window.innerWidth);
  const nx = Math.max(0, Math.min(1, local * 0.7 + view * 0.3));
  if (nx < 0.34) return "l";
  if (nx > 0.66) return "r";
  return "c";
}

type Props = {
  alt: string;
};

export function LandingHeroMascot({ alt }: Props) {
  const [useFollow, setUseFollow] = useState(false);
  const [look, setLook] = useState<LookKey>("c");
  const [posterSrc, setPosterSrc] = useState(POSTER);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setUseFollow(canFollowPointer());
    update();
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    fineHover.addEventListener("change", update);
    reduceMotion.addEventListener("change", update);
    return () => {
      fineHover.removeEventListener("change", update);
      reduceMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!useFollow) return;

    for (const src of Object.values(LOOK)) {
      const img = new Image();
      img.src = src;
    }

    const onPointerMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const next = lookFromClientX(e.clientX, el);
      setLook((prev) => (prev === next ? prev : next));
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [useFollow]);

  if (!useFollow) {
    return (
      <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden bg-[#06040f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterSrc}
          alt={alt}
          className="landing-hero-video h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onError={() => setPosterSrc(FALLBACK_POSTER)}
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden bg-[#06040f]">
      {(Object.keys(LOOK) as LookKey[]).map((key) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={LOOK[key]}
          alt=""
          aria-hidden={look !== key}
          className="landing-hero-video absolute inset-0 h-full w-full object-cover transition-opacity duration-75 ease-out"
          style={{ opacity: look === key ? 1 : 0 }}
          decoding="async"
          fetchPriority={key === "c" ? "high" : "low"}
          draggable={false}
        />
      ))}
      <span className="sr-only">{alt}</span>
    </div>
  );
}
