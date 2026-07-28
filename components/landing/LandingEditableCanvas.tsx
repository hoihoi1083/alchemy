"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

const CANVAS_IMG = "/images/landing/landing-canvas-skincare.png";

export function LandingEditableCanvas() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section className="bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#0B1020] text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-10 lg:py-14">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
              <span>{L.canvasMockTitle}</span>
              <span>100%</span>
            </div>
            <div className="flex min-h-[280px]">
              <aside className="hidden w-20 shrink-0 flex-col gap-3 border-r border-slate-100 bg-slate-50 p-2 sm:flex">
                {L.canvasSidebar.map((label) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-[10px] text-violet-700">
                      ◆
                    </div>
                    <p className="mt-1 text-[8px] font-medium text-slate-500">{label}</p>
                  </div>
                ))}
              </aside>
              <div className="relative min-w-0 flex-1 bg-[#F5F0E8] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CANVAS_IMG}
                  alt={L.canvasImageAlt}
                  className="mx-auto aspect-square max-h-64 w-full max-w-xs rounded-lg object-cover ring-2 ring-indigo-400"
                />
                <div className="pointer-events-none absolute left-8 top-8 rounded bg-white/95 px-2 py-1 text-[11px] font-bold tracking-wide text-slate-900 shadow">
                  {L.canvasOverlayText}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight">{L.canvasTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">{L.canvasBody}</p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-3">
              {L.canvasFeatureItems.map((item) => (
                <li key={item.title} className="text-center sm:text-left xl:text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 sm:mx-0 xl:mx-auto">
                    ◆
                  </div>
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">{item.body}</p>
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
      </div>
    </section>
  );
}
