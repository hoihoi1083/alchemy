"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { SAMPLE_PACK_ITEMS } from "@/lib/sample-pack";

export function SamplePackGallery() {
  const { m } = useLocale();
  const S = m.landing.samplePack;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="mb-4 text-center text-sm text-slate-400">{S.galleryHint}</p>
      <div className="mb-6 flex justify-center">
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
                src={`/api/sample-pack-image/${item.id}`}
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
                href={`/api/sample-pack-image/${item.id}?download=1`}
                className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-violet-300 hover:text-violet-200"
              >
                {S.downloadOne}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
