"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const CANVAS_IMG = "/images/landing/landing-canvas-skincare.png";

export function LandingEditableCanvas() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-3 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CANVAS_IMG}
            alt={L.canvasImageAlt}
            className="aspect-[3/4] w-full rounded-2xl object-cover sm:aspect-[4/5]"
          />
          <div className="pointer-events-none absolute left-8 top-10 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold tracking-wide text-slate-900 shadow">
            {L.canvasOverlayText}
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight">{L.canvasTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">{L.canvasBody}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {L.canvasFeatures.map((f) => (
              <li
                key={f}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/edit-image"
            className="mt-8 inline-flex rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
          >
            {L.canvasCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
