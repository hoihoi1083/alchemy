"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import {
  SAMPLE_PACK_ITEMS,
  SAMPLE_PACK_WATERMARK,
} from "@/lib/sample-pack";

export function SamplePackGallery() {
  const { m } = useLocale();
  const S = m.landing.samplePack;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="mb-4 text-center text-sm text-slate-400">{S.galleryHint}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {SAMPLE_PACK_ITEMS.map((item) => (
          <li
            key={item.id}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-lg"
          >
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={item.src}
                alt={S.labels[item.labelKey]}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-8"
                aria-hidden
              >
                <p className="text-center text-[9px] font-semibold uppercase tracking-wider text-white/90 sm:text-[10px]">
                  {SAMPLE_PACK_WATERMARK}
                </p>
              </div>
            </div>
            <p className="truncate px-2 py-1.5 text-center text-[11px] font-medium text-slate-300">
              {S.labels[item.labelKey]}
            </p>
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
