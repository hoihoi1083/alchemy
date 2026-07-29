"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Reveal } from "@/components/landing/Reveal";

const TOOLS = [
  {
    href: "/#brand-kit",
    titleKey: "toolBrandTitle" as const,
    descKey: "toolBrandDesc" as const,
    src: "/images/landing/tool-icon-brand.png?v=2",
  },
  {
    href: "/edit-image",
    titleKey: "toolEditTitle" as const,
    descKey: "toolEditDesc" as const,
    src: "/images/landing/tool-icon-edit.png?v=2",
  },
  {
    href: "/captions",
    titleKey: "toolCaptionsTitle" as const,
    descKey: "toolCaptionsDesc" as const,
    src: "/images/landing/tool-icon-captions.png?v=2",
  },
  {
    href: "/pro",
    titleKey: "toolProTitle" as const,
    descKey: "toolProDesc" as const,
    src: "/images/landing/tool-icon-pro.png?v=2",
    badgeKey: "proMasterBadge" as const,
  },
] as const;

/**
 * Compact tool cards — square art (source is 1:1) + centered copy.
 */
export function LandingProductTools() {
  const { m } = useLocale();
  const L = m.landing;

  return (
    <section id="tools" className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {L.toolsTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{L.toolsSubtitle}</p>
          </div>
        </Reveal>

        <ul className="mx-auto mt-7 grid w-full max-w-[860px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {TOOLS.map((tool, i) => (
            <li key={tool.href} className="min-w-0">
              <Reveal delayMs={i * 90} distance={40} scaleFrom={0.94} className="h-full">
                <Link
                  href={tool.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-center shadow-sm transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/70"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#0B1020]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tool.src}
                      alt=""
                      width={320}
                      height={320}
                      className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                    />
                    {"badgeKey" in tool && tool.badgeKey ? (
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700 shadow-sm">
                        {L[tool.badgeKey]}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col items-center px-3 pb-3 pt-2.5">
                    <p className="w-full text-[13px] font-semibold tracking-tight text-slate-900 group-hover:text-violet-800">
                      {L[tool.titleKey]}
                    </p>
                    <p className="mt-1 line-clamp-2 w-full text-[11px] leading-snug text-slate-500">
                      {L[tool.descKey]}
                    </p>
                    <span className="mt-auto inline-flex items-center justify-center gap-0.5 pt-2.5 text-[11px] font-semibold text-violet-700">
                      {L.toolsOpenCta}
                      <span aria-hidden className="transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
