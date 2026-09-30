"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { SAMPLE_PACK_ITEMS, SAMPLE_PACK_VIDEOS } from "@/lib/sample-pack";

export function SamplePackGallery() {
  const { m } = useLocale();
  const S = m.landing.samplePack;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section aria-labelledby="sample-pack-images-heading">
        <div className="mb-4 text-center">
          <h2
            id="sample-pack-images-heading"
            className="text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            {S.imagesSectionTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">{S.galleryHint}</p>
        </div>
        <div className="mb-5 flex justify-center">
          <a
            href="/api/sample-pack-download"
            className="inline-flex w-full items-center justify-center rounded-full border border-violet-400/50 bg-violet-500/15 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25 sm:w-auto"
          >
            {S.downloadPack}
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {SAMPLE_PACK_ITEMS.map((item) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-lg"
            >
              <div className="relative aspect-[4/5] w-full">
                {/* Served from API with watermark burned into pixels (not CSS). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/sample-pack-image/${item.id}?v=6`}
                  alt={S.labels[item.labelKey]}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-slate-300">
                  {S.labels[item.labelKey]}
                </p>
                <a
                  href={`/api/sample-pack-image/${item.id}?download=1&v=6`}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-violet-300 hover:text-violet-200"
                >
                  {S.downloadOne}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="mt-12 border-t border-white/10 pt-10"
        aria-labelledby="sample-pack-videos-heading"
      >
        <div className="mb-5 text-center">
          <h2
            id="sample-pack-videos-heading"
            className="text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            {S.videosSectionTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">{S.videosSectionHint}</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
          {SAMPLE_PACK_VIDEOS.map((clip) => (
            <li
              key={clip.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg"
            >
              {/* In-flow poster sets card height; video overlays for playback. */}
              <div className="relative w-full bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clip.poster}
                  alt={S.videoLabels[clip.labelKey]}
                  className="block h-auto w-full object-contain"
                  width={832}
                  height={480}
                  loading="lazy"
                  decoding="async"
                />
                <video
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                  src={clip.src}
                  poster={clip.poster}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="truncate text-[11px] font-medium text-slate-300">
                  {S.videoLabels[clip.labelKey]}
                </p>
                <a
                  href={clip.src}
                  download
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-violet-300 hover:text-violet-200"
                >
                  {S.downloadOne}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/start"
          className="inline-flex w-full items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
        >
          {S.thanksCtaPrimary}
        </Link>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
        >
          {S.thanksCtaHome}
        </Link>
      </div>
    </div>
  );
}
