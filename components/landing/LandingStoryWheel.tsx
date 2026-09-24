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
    poster: "/images/landing/story-fan-transform.jpg?v=17",
    video: "/videos/landing/story-fan-transform.mp4?v=17",
  },
  {
    poster: "/images/landing/story-fan-reference.jpg?v=17",
    video: "/videos/landing/story-fan-reference.mp4?v=17",
  },
  {
    poster: "/images/landing/story-fan-storyboard.jpg?v=17",
    video: "/videos/landing/story-fan-storyboard.mp4?v=17",
  },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function injectPreload(href: string, as: "image" | "video") {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-fan-preload="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = as;
  link.href = href;
  if (as === "video") link.type = "video/mp4";
  link.setAttribute("data-fan-preload", href);
  document.head.appendChild(link);
}

function prefetchFanMedia() {
  if (typeof document === "undefined") return;
  // First card highest priority — warm poster + bytes ASAP.
  injectPreload(FAN_MEDIA[0].poster, "image");
  injectPreload(FAN_MEDIA[0].video, "video");
  for (const m of FAN_MEDIA) {
    const img = new Image();
    img.decoding = "async";
    img.src = m.poster;
    injectPreload(m.poster, "image");
    injectPreload(m.video, "video");
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = m.video;
    void v.load();
  }
}

/**
 * Story fan: left tabs 01/02/03 + right phone videos (one clip per card).
 * Scroll into view or select a tab → that card’s video plays smoothly from the start.
 * Ambient auto-cycle only until the first user click (then stay for reading).
 */
export function LandingStoryWheel() {
  const { m } = useLocale();
  const L = m.landing;
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** After the user picks a tab/card, stop auto-cycling away while they read. */
  const [userPinned, setUserPinned] = useState(false);
  /** Only play while the section is on screen (scroll-in / scroll-out). */
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const prefetchedRef = useRef(false);
  /** Bumps on each select so play() restarts even if the same index is clicked again. */
  const [playToken, setPlayToken] = useState(0);

  const selectSlide = (index: number) => {
    setUserPinned(true);
    setActiveIndex(index);
    setPlayToken((t) => t + 1);
  };

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
      ctaLabel: null as string | null,
      hint: null as string | null,
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
      ctaLabel: null as string | null,
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
      ctaLabel: null as string | null,
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

  // Prefetch on mount — first card bytes ASAP; rest on idle. Don't wait for scroll-in.
  useEffect(() => {
    if (prefetchedRef.current) return;
    injectPreload(FAN_MEDIA[0].poster, "image");
    injectPreload(FAN_MEDIA[0].video, "video");
    const warm = document.createElement("video");
    warm.preload = "auto";
    warm.muted = true;
    warm.playsInline = true;
    warm.src = FAN_MEDIA[0].video;
    void warm.load();

    const run = () => {
      if (prefetchedRef.current) return;
      prefetchedRef.current = true;
      prefetchFanMedia();
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(run, { timeout: 400 });
      return () => {
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(id);
      };
    }
    const t = window.setTimeout(run, 0);
    return () => window.clearTimeout(t);
  }, []);

  // Scroll: prefetch near; mark inView so the front card can play when visible.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      if (!prefetchedRef.current) {
        prefetchedRef.current = true;
        prefetchFanMedia();
      }
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setInView(visible);
        if (visible && !prefetchedRef.current) {
          prefetchedRef.current = true;
          prefetchFanMedia();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Warm every mounted <video> so switching 01/02/03 starts without a stall.
  useEffect(() => {
    if (!inView || reduceMotion) return;
    videoRefs.current.forEach((v) => {
      if (!v) return;
      v.muted = true;
      v.playsInline = true;
      if (v.preload !== "auto") v.preload = "auto";
      if (v.readyState < 2) void v.load();
    });
  }, [inView, reduceMotion]);

  // Ambient cycle only until the user picks a section (then stay so they can read).
  useEffect(() => {
    if (reduceMotion || userPinned || !inView) return;
    const v = videoRefs.current[activeIndex];
    let done = false;
    let timeoutId: number | undefined;
    const advance = () => {
      if (done) return;
      done = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setActiveIndex((i) => (i + 1) % n);
      setPlayToken((t) => t + 1);
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
  }, [activeIndex, reduceMotion, userPinned, inView, n]);

  // Play the front card from the start on scroll-in, tab click, or ambient advance.
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.loop = false;
      v.muted = true;
      v.playsInline = true;
      if (reduceMotion || !inView || i !== activeIndex) {
        v.pause();
        return;
      }

      let cancelled = false;
      const onReady = () => {
        v.removeEventListener("canplay", onReady);
        v.removeEventListener("loadeddata", onReady);
        if (cancelled) return;
        attemptPlay();
      };
      const attemptPlay = () => {
        if (cancelled) return;
        void v.play().catch(() => {
          window.setTimeout(() => {
            if (!cancelled) void v.play().catch(() => {});
          }, 120);
        });
      };
      const start = () => {
        if (cancelled) return;
        try {
          v.currentTime = 0;
        } catch {
          /* ignore seek abort */
        }
        if (v.readyState >= 2) attemptPlay();
        else {
          v.addEventListener("canplay", onReady);
          v.addEventListener("loadeddata", onReady);
          if (v.preload !== "auto") v.preload = "auto";
          void v.load();
        }
      };
      start();
      cleanups.push(() => {
        cancelled = true;
        v.removeEventListener("canplay", onReady);
        v.removeEventListener("loadeddata", onReady);
      });
    });

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [activeIndex, reduceMotion, inView, playToken]);

  return (
    <section ref={sectionRef} className="w-full bg-white">
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
      >
        <div className="landing-story-wheel-grid py-12 lg:py-14">
          <Reveal
            distance={48}
            scaleFrom={0.94}
            threshold={0}
            rootMargin="0px 0px -8% 0px"
            className="landing-story-copy h-full min-h-0"
          >
            <div className="flex min-h-0 flex-col justify-center overflow-y-auto pr-1">
              <ol className="space-y-2.5">
                {slides.map((slide, i) => {
                  const on = i === activeIndex;
                  return (
                    <li key={slide.id}>
                      <button
                        type="button"
                        className={`w-full rounded-2xl border text-left transition ${
                          on
                            ? "border-violet-300 bg-violet-50 px-4 py-3.5 shadow-sm"
                            : "border-transparent bg-slate-100 px-4 py-2.5 hover:bg-slate-200/80"
                        }`}
                        onClick={() => selectSlide(i)}
                      >
                        <span
                          className={`text-sm font-bold tracking-[0.08em] ${
                            on ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
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
                                {slide.points.map((point) => (
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
                            {slide.ctaLabel ? (
                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <Link
                                  href={slide.ctaHref}
                                  className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {slide.ctaLabel}
                                </Link>
                                {slide.hint ? (
                                  <p className="text-xs text-slate-500">
                                    {slide.hint}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Reveal>

          <Reveal
            delayMs={0}
            distance={28}
            scaleFrom={0.98}
            threshold={0}
            rootMargin="0px 0px -8% 0px"
            className="h-full min-h-0 min-w-0 w-full"
          >
            <div className="landing-story-visual px-0 sm:px-1">
              <div className="landing-story-phone-fan relative w-full">
                {slides.map((slide, i) => {
                  let d = i - activeIndex;
                  while (d > n / 2) d -= n;
                  while (d < -n / 2) d += n;
                  const abs = Math.abs(d);
                  // Fan spread — enough peek for side cards without eating front size.
                  const xPct = d * 14;
                  const rotate = d * 5;
                  const scale = clamp(1 - abs * 0.05, 0.9, 1);
                  const yPx = abs * 8;
                  const z = 20 - Math.round(abs * 8);
                  const opacity = abs > 1.15 ? 0 : 1;
                  const front = abs < 0.35;
                  const near = abs <= 1.05;

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      aria-label={slide.eyebrow}
                      className="landing-story-phone absolute left-1/2 top-[2%] origin-bottom will-change-transform"
                      style={{
                        transform: `translate3d(calc(-50% + ${xPct}%), ${yPx}px, 0) rotate(${rotate}deg) scale(${scale})`,
                        opacity,
                        zIndex: z,
                        pointerEvents: front ? "auto" : "none",
                        transition: reduceMotion
                          ? "opacity 0.2s ease, transform 0.2s ease"
                          : "opacity 0.28s ease, transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      onClick={() => selectSlide(i)}
                    >
                      <div className="landing-story-phone-frame relative h-full w-full overflow-hidden rounded-[2.25rem] border border-white bg-slate-950 shadow-[0_32px_60px_-28px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slide.poster}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain bg-slate-950"
                          draggable={false}
                          aria-hidden
                          decoding="async"
                          fetchPriority={front ? "high" : near ? "low" : "auto"}
                        />
                        {!reduceMotion ? (
                          <video
                            ref={(el) => {
                              videoRefs.current[i] = el;
                            }}
                            className="absolute inset-0 h-full w-full object-contain bg-slate-950"
                            src={slide.video}
                            poster={slide.poster}
                            muted
                            playsInline
                            preload="auto"
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
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? "w-7 bg-violet-600"
                        : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                    onClick={() => selectSlide(i)}
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
  ctaLabel: string | null;
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
          {ctaLabel || hint ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {ctaLabel ? (
                <Link
                  href={ctaHref}
                  className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  {ctaLabel}
                </Link>
              ) : null}
              {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[2.25rem] border border-slate-200 shadow-lg">
          {reduceMotion ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={imageAlt}
              className="aspect-[9/16] w-full object-contain bg-slate-950"
            />
          ) : (
            <video
              ref={ref}
              className="aspect-[9/16] w-full object-contain bg-slate-950"
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
