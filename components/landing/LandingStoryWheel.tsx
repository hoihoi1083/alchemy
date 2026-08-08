"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

/** Fallback dwell when a video has no duration yet. Storyboard stitch may be ~6s. */
const FALLBACK_LOOP_MS = 5000;

const FAN_MEDIA = [
  {
    poster: "/images/landing/story-fan-transform.jpg?v=8",
    video: "/videos/landing/story-fan-transform.mp4?v=8",
  },
  {
    poster: "/images/landing/story-fan-reference.jpg?v=8",
    video: "/videos/landing/story-fan-reference.mp4?v=8",
  },
  {
    poster: "/images/landing/story-fan-storyboard.jpg?v=8",
    video: "/videos/landing/story-fan-storyboard.mp4?v=8",
  },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Auto-looping story fan: left copy + right phone video cards cycle 1 → 2 → 3 → 1.
 * Dwell follows each card’s video length (transform/reference ~5s; storyboard stitch ~6s).
 */
export function LandingStoryWheel() {
  const { m } = useLocale();
  const L = m.landing;
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const slides = [
    {
      id: "transform",
      eyebrow: L.transformBadge,
      title: (
        <>
          {L.transformTitleBefore}
          <span className="text-violet-600">{L.transformTitleHighlight}</span>
          {L.transformTitleAfter}
        </>
      ),
      body: L.transformBody,
      points: L.transformPoints,
      ctaHref: "/start",
      ctaLabel: L.transformCta,
      hint: L.transformHint,
      ...FAN_MEDIA[0],
      imageAlt: L.heroImageAlt,
    },
    {
      id: "reference",
      eyebrow: L.refCardLabel,
      title: <>{L.refTitle}</>,
      body: L.refBody,
      points: L.refFeatureItems,
      ctaHref: "/start",
      ctaLabel: L.transformCta,
      hint: null as string | null,
      ...FAN_MEDIA[1],
      imageAlt: L.resultCardAlt,
    },
    {
      id: "storyboard",
      eyebrow: L.storyboardBadge,
      title: <>{L.storyboardTitle}</>,
      body: L.storyboardBody,
      points: L.storyboardFeatureItems,
      ctaHref: "/start",
      ctaLabel: L.storyboardCta,
      hint: null as string | null,
      ...FAN_MEDIA[2],
      imageAlt: L.storyboardImageAlt,
    },
  ] as const;

  const n = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Advance once when the front card video finishes (timeout is a safety net).
  useEffect(() => {
    if (paused || reduceMotion) return;
    const v = videoRefs.current[activeIndex];
    let done = false;
    let timeoutId: number | undefined;
    const advance = () => {
      if (done) return;
      done = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setActiveIndex((i) => (i + 1) % n);
    };
    const armTimeout = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const ms =
        v && Number.isFinite(v.duration) && v.duration > 0
          ? Math.ceil(v.duration * 1000) + 300
          : FALLBACK_LOOP_MS;
      timeoutId = window.setTimeout(advance, ms);
    };
    if (v) {
      v.addEventListener("ended", advance);
      v.addEventListener("loadedmetadata", armTimeout);
      armTimeout();
      return () => {
        done = true;
        v.removeEventListener("ended", advance);
        v.removeEventListener("loadedmetadata", armTimeout);
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      };
    }
    timeoutId = window.setTimeout(advance, FALLBACK_LOOP_MS);
    return () => {
      done = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [activeIndex, paused, reduceMotion, n]);

  // Play only the front card video; restart from the beginning each card switch.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.loop = false;
      if (reduceMotion) {
        v.pause();
        return;
      }
      if (i === activeIndex && !paused) {
        v.currentTime = 0;
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeIndex, paused, reduceMotion]);

  return (
    <section className="w-full bg-white">
      <div className="md:hidden">
        {slides.map((slide, i) => (
          <Reveal
            key={slide.id}
            delayMs={i * 70}
            distance={44}
            scaleFrom={0.94}
            threshold={0}
            rootMargin="0px 0px -6% 0px"
          >
            <MobileSlide
              eyebrow={slide.eyebrow}
              title={slide.title}
              body={slide.body}
              points={slide.points}
              pointIcons={undefined}
              ctaHref={slide.ctaHref}
              ctaLabel={slide.ctaLabel}
              hint={slide.hint}
              poster={slide.poster}
              video={slide.video}
              imageAlt={slide.imageAlt}
              reduceMotion={reduceMotion}
            />
          </Reveal>
        ))}
      </div>

      <section
        id="story-wheel"
        className="relative hidden bg-white md:block"
        aria-label={L.transformBadge}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="landing-story-wheel-grid py-12 lg:py-14">
          <Reveal
            distance={48}
            scaleFrom={0.94}
            threshold={0}
            rootMargin="0px 0px -8% 0px"
            className="min-h-0"
          >
          <div className="flex min-h-0 flex-col justify-center overflow-y-auto pr-1">
            <ol className="space-y-2.5">
              {slides.map((slide, i) => {
                const on = i === activeIndex;
                return (
                  <li key={slide.id}>
                    <button
                      type="button"
                      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                        on
                          ? "border-violet-200 bg-violet-50 shadow-sm"
                          : "border-slate-100 bg-white opacity-55 hover:opacity-80"
                      }`}
                      onClick={() => setActiveIndex(i)}
                    >
                      <span className="text-sm font-bold tracking-[0.08em] text-violet-600">
                        {String(i + 1).padStart(2, "0")} · {slide.eyebrow}
                      </span>
                      {on ? (
                        <div className="mt-2">
                          <h2 className="text-2xl font-bold leading-snug tracking-tight text-slate-900 lg:text-[1.75rem]">
                            {slide.title}
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {slide.body}
                          </p>
                          {slide.points ? (
                            <ul className="mt-3 space-y-2">
                              {slide.points.map((point, pi) => (
                                <li key={point.title} className="flex gap-2.5">
                                    <span
                                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white"
                                      aria-hidden
                                    >
                                      ✓
                                    </span>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {point.title}
                                    </p>
                                    <p className="text-xs leading-snug text-slate-500">
                                      {point.body}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Link
                              href={slide.ctaHref}
                              className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {slide.ctaLabel}
                            </Link>
                            {slide.hint ? (
                              <p className="text-xs text-slate-500">{slide.hint}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-700">
                          {typeof slide.title === "string"
                            ? slide.title
                            : slide.eyebrow}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          </Reveal>

          <Reveal
            delayMs={160}
            distance={56}
            scaleFrom={1.44}
            threshold={0}
            rootMargin="0px 0px -8% 0px"
            className="min-h-0"
          >
          <div className="relative flex min-h-0 flex-col items-center justify-center overflow-visible px-2">
            <div className="landing-story-phone-fan relative w-full max-w-[560px]">
              {slides.map((slide, i) => {
                let d = i - activeIndex;
                while (d > n / 2) d -= n;
                while (d < -n / 2) d += n;
                const abs = Math.abs(d);
                const xPct = d * 32;
                const rotate = d * 11;
                const scale = clamp(1 - abs * 0.06, 0.9, 1);
                const yPx = abs * 12;
                const z = 20 - Math.round(abs * 8);
                const opacity = abs > 1.15 ? 0 : 1;
                const front = abs < 0.35;

                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={slide.eyebrow}
                    className="landing-story-phone absolute left-1/2 top-0 origin-bottom will-change-transform"
                    style={{
                      transform: `translate3d(calc(-50% + ${xPct}%), ${yPx}px, 0) rotate(${rotate}deg) scale(${scale})`,
                      opacity,
                      zIndex: z,
                      pointerEvents: front ? "auto" : "none",
                      transition:
                        "opacity 0.55s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    onClick={() => setActiveIndex(i)}
                  >
                    <div className="landing-story-phone-frame relative h-full w-full overflow-hidden rounded-[2.25rem] border border-white bg-slate-950 shadow-[0_32px_60px_-28px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.poster}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                        aria-hidden
                      />
                      {!reduceMotion ? (
                        <video
                          ref={(el) => {
                            videoRefs.current[i] = el;
                          }}
                          className="absolute inset-0 h-full w-full object-cover"
                          src={slide.video}
                          poster={slide.poster}
                          muted
                          playsInline
                          preload={front ? "auto" : "metadata"}
                          aria-label={slide.imageAlt}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={slide.eyebrow}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex
                      ? "w-7 bg-violet-600"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  onClick={() => setActiveIndex(i)}
                />
              ))}
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </section>
  );
}

function MobileSlide({
  eyebrow,
  title,
  body,
  points,
  pointIcons,
  ctaHref,
  ctaLabel,
  hint,
  poster,
  video,
  imageAlt,
  reduceMotion,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  points: readonly { title: string; body: string }[] | null;
  pointIcons?: readonly string[];
  ctaHref: string;
  ctaLabel: string;
  hint: string | null;
  poster: string;
  video: string;
  imageAlt: string;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduceMotion) return;
    v.muted = true;
    void v.play().catch(() => {});
  }, [reduceMotion, video]);

  return (
    <section className="w-full border-b border-slate-200/80 bg-white px-5 py-10 md:px-8">
      <div className="landing-story-mobile-grid mx-auto max-w-[1440px]">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-[0.08em] text-violet-600">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
          {points ? (
            <ul className="mt-5 space-y-2.5">
              {points.map((point, i) => (
                <li key={point.title} className="flex gap-2.5">
                  {pointIcons?.[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pointIcons[i]}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                      ✓
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {point.title}
                    </p>
                    <p className="text-xs leading-snug text-slate-500">
                      {point.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              {ctaLabel}
            </Link>
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[2.25rem] border border-slate-200 shadow-lg">
          {reduceMotion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={imageAlt}
              className="aspect-[9/16] w-full object-cover"
            />
          ) : (
            <video
              ref={ref}
              className="aspect-[9/16] w-full object-cover"
              src={video}
              poster={poster}
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
              aria-label={imageAlt}
            />
          )}
        </div>
      </div>
    </section>
  );
}
