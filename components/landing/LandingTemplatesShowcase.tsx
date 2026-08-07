"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

type Platform = "instagram" | "facebook" | "xhs" | "x";
type Format = "image" | "carousel" | "reels" | "video";

type ShowcaseCard = {
  id: string;
  platform: Platform;
  format: Format;
  ratio: string;
  /** Optional muted looping video. */
  video?: string;
  /** Still poster / first frame. */
  poster: string;
  /** Image carousel slides. */
  slides?: readonly string[];
  businessKey:
    | "tplBizMakeup"
    | "tplBizFashion"
    | "tplBizBranding"
    | "tplBizCafe"
    | "tplBizService";
  captionKey:
    | "tplAdMakeup"
    | "tplAdFashion"
    | "tplAdBranding"
    | "tplAdCafe"
    | "tplAdService";
};

const BRANDING_CAROUSEL = [
  "/images/landing/tpl-biz-ig-carousel-1.jpg?v=1",
  "/images/landing/tpl-biz-ig-carousel-2.jpg?v=1",
  "/images/landing/tpl-biz-ig-carousel-3.jpg?v=1",
  "/images/landing/tpl-biz-ig-carousel-4.jpg?v=1",
  "/images/landing/tpl-biz-ig-carousel-5.jpg?v=1",
] as const;

const SERVICE_CAROUSEL = [
  "/images/landing/tpl-biz-alchemy-carousel-1.jpg?v=1",
  "/images/landing/tpl-biz-alchemy-carousel-2.jpg?v=1",
  "/images/landing/tpl-biz-alchemy-carousel-3.jpg?v=1",
  "/images/landing/tpl-biz-alchemy-carousel-4.jpg?v=1",
] as const;

/** Each attached set becomes its own card — never merge into another carousel. */
const SHOWCASE: ShowcaseCard[] = [
  {
    id: "branding-carousel",
    platform: "instagram",
    format: "carousel",
    ratio: "4:5",
    poster: BRANDING_CAROUSEL[0],
    slides: BRANDING_CAROUSEL,
    businessKey: "tplBizBranding",
    captionKey: "tplAdBranding",
  },
  {
    id: "service-carousel",
    platform: "facebook",
    format: "carousel",
    ratio: "4:5",
    poster: SERVICE_CAROUSEL[0],
    slides: SERVICE_CAROUSEL,
    businessKey: "tplBizService",
    captionKey: "tplAdService",
  },
  {
    id: "fashion",
    platform: "facebook",
    format: "reels",
    ratio: "9:16",
    video: "/videos/landing/tpl-biz-fashion.mp4?v=2",
    poster: "/images/landing/tpl-biz-fashion.jpg?v=2",
    businessKey: "tplBizFashion",
    captionKey: "tplAdFashion",
  },
  {
    id: "makeup",
    platform: "instagram",
    format: "reels",
    ratio: "9:16",
    video: "/videos/landing/tpl-biz-makeup.mp4?v=2",
    poster: "/images/landing/tpl-biz-makeup.jpg?v=2",
    businessKey: "tplBizMakeup",
    captionKey: "tplAdMakeup",
  },
  {
    id: "cafe",
    platform: "facebook",
    format: "image",
    ratio: "4:5",
    poster: "/images/landing/tpl-biz-cafe-2.jpg?v=1",
    businessKey: "tplBizCafe",
    captionKey: "tplAdCafe",
  },
];

const HIGHLIGHT_MS = 2800;
const CAROUSEL_MS = 1600;

function formatLabel(
  format: Format,
  L: {
    tplFormatImage: string;
    tplFormatCarousel: string;
    tplFormatReels: string;
    tplFormatVideo: string;
  },
) {
  switch (format) {
    case "image":
      return L.tplFormatImage;
    case "carousel":
      return L.tplFormatCarousel;
    case "reels":
      return L.tplFormatReels;
    case "video":
      return L.tplFormatVideo;
  }
}

function platformShort(platform: Platform) {
  switch (platform) {
    case "instagram":
      return "IG";
    case "facebook":
      return "FB";
    case "xhs":
      return "RED";
    case "x":
      return "X";
  }
}

function CardMedia({
  poster,
  video,
  slides,
  inView,
  reduceMotion,
  featured,
}: {
  poster: string;
  video?: string;
  slides?: readonly string[];
  inView: boolean;
  reduceMotion: boolean;
  featured: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [slide, setSlide] = useState(0);
  const isCarousel = Boolean(slides && slides.length > 1);

  useEffect(() => {
    if (!isCarousel || !inView || reduceMotion) return;
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % (slides?.length ?? 1));
    }, featured ? CAROUSEL_MS : CAROUSEL_MS + 600);
    return () => window.clearInterval(id);
  }, [isCarousel, inView, reduceMotion, featured, slides?.length]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video || reduceMotion || failed) return;
    v.muted = true;
    if (!inView) {
      v.pause();
      return;
    }
    void v.play().catch(() => {});
  }, [inView, reduceMotion, failed, video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video || reduceMotion || failed || !inView) return;
    if (featured) void v.play().catch(() => {});
  }, [featured, inView, reduceMotion, failed, video]);

  if (isCarousel && slides) {
    return (
      <div className="landing-tpl-media relative w-full overflow-hidden bg-zinc-800">
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        <span className="pointer-events-none absolute right-2 top-12 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {slide + 1}/{slides.length}
        </span>
        <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === slide ? "bg-violet-400" : "bg-white/45"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="landing-tpl-media relative w-full overflow-hidden bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {video && !reduceMotion && !failed ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={poster}
          muted
          playsInline
          loop
          preload={inView ? "auto" : "metadata"}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

export function LandingTemplatesShowcase() {
  const { m } = useLocale();
  const L = m.landing;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [rowInView, setRowInView] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const lastFeatured = useRef(0);

  const platformLogos = [
    { id: "instagram", label: L.tplPlatformIg, src: "/images/landing/platform-instagram.svg" },
    { id: "facebook", label: L.tplPlatformFb, src: "/images/landing/platform-facebook.svg" },
    { id: "xhs", label: L.tplPlatformXhs, src: "/images/landing/platform-xhs.png?v=2" },
    { id: "x", label: L.tplPlatformX, src: "/images/landing/platform-x.svg" },
  ] as const;
  const formatTags = [L.tplFormatImage, L.tplFormatCarousel, L.tplFormatReels, L.tplFormatVideo];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setRowInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || !rowInView || SHOWCASE.length < 2) return;
    const tick = () => {
      let next = Math.floor(Math.random() * SHOWCASE.length);
      if (next === lastFeatured.current) {
        next = (next + 1) % SHOWCASE.length;
      }
      lastFeatured.current = next;
      setFeaturedIndex(next);
    };
    tick();
    const id = window.setInterval(tick, HIGHLIGHT_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, rowInView]);

  return (
    <section id="templates" className="w-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {L.tplTitleBefore}
            <span className="text-violet-600">{L.tplTitleHighlight}</span>
            {L.tplTitleAfter}
          </h2>
        </Reveal>

        <Reveal delayMs={80}>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5" aria-label={L.tplPlatformsLabel}>
            {platformLogos.map((p) => (
              <span key={p.id} title={p.label} className="inline-flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.label} className="h-10 w-10 rounded-[10px] object-contain sm:h-11 sm:w-11" />
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2" aria-label={L.tplFormatsLabel}>
            {formatTags.map((label) => (
              <span
                key={label}
                className="landing-tpl-chip-muted rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:text-xs"
              >
                {label}
              </span>
            ))}
          </div>
        </Reveal>

        <div ref={rowRef} className="landing-tpl-row relative mt-6">
          <div
            ref={scroller}
            className="landing-tpl-scroller flex items-center justify-start overflow-x-auto md:justify-center"
          >
            {SHOWCASE.map((card, i) => {
              const featured = !reduceMotion && featuredIndex === i;
              return (
                <div key={card.id} className="landing-tpl-slot">
                  <Link
                    href="/start"
                    className={`landing-tpl-card group ${featured ? "landing-tpl-card--featured" : ""}`}
                  >
                    <div className="landing-tpl-media-wrap relative">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5">
                        <span className="landing-tpl-badge">
                          {formatLabel(card.format, L)} · {card.ratio}
                        </span>
                        <span className="landing-tpl-badge">{platformShort(card.platform)}</span>
                      </div>
                      <CardMedia
                        poster={card.poster}
                        video={card.video}
                        slides={card.slides}
                        inView={rowInView}
                        reduceMotion={reduceMotion}
                        featured={featured}
                      />
                    </div>
                    <div className="landing-tpl-caption px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
                        {L[card.businessKey]}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-white">
                        “{L[card.captionKey]}”
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-zinc-400">{L.tplAdBadge}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50 to-transparent md:hidden"
            aria-hidden
          />
          <button
            type="button"
            aria-label="Scroll templates"
            onClick={() => scroller.current?.scrollBy({ left: 240, behavior: "smooth" })}
            className="landing-tpl-scroll-btn absolute -right-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-600 md:flex"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
