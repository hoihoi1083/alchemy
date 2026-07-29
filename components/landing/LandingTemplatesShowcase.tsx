"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

type Tab = "all" | "product" | "instagram" | "facebook" | "xhs" | "video" | "service";

const SHOWCASE: Array<{
  id: string;
  tab: Tab;
  src: string;
  titleKey:
    | "tplCardSkincare"
    | "tplCardSunscreen"
    | "tplCardCoffee"
    | "tplCardService"
    | "tplCardReel"
    | "tplCardHero";
  captionKey: "tplCapIg" | "tplCapFb" | "tplCapReel" | "tplCapService" | "tplCapProduct";
}> = [
  {
    id: "skincare",
    tab: "product",
    src: "/images/landing/landing-canvas-skincare.png",
    titleKey: "tplCardSkincare",
    captionKey: "tplCapIg",
  },
  {
    id: "sunscreen",
    tab: "instagram",
    src: "/images/landing/landing-tpl-sunscreen.png",
    titleKey: "tplCardSunscreen",
    captionKey: "tplCapIg",
  },
  {
    id: "coffee",
    tab: "facebook",
    src: "/images/landing/landing-result-coffee.png",
    titleKey: "tplCardCoffee",
    captionKey: "tplCapFb",
  },
  {
    id: "service",
    tab: "service",
    src: "/images/landing/landing-tpl-service.png",
    titleKey: "tplCardService",
    captionKey: "tplCapService",
  },
  {
    id: "ref",
    tab: "video",
    src: "/images/landing/landing-ref-coffee.png",
    titleKey: "tplCardReel",
    captionKey: "tplCapReel",
  },
  {
    id: "hero",
    tab: "xhs",
    src: "/images/landing/landing-hero-product.png",
    titleKey: "tplCardHero",
    captionKey: "tplCapProduct",
  },
];

export function LandingTemplatesShowcase() {
  const { m } = useLocale();
  const L = m.landing;
  const [tab, setTab] = useState<Tab>("all");
  const scroller = useRef<HTMLDivElement>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: L.tplTabAll },
    { id: "product", label: L.tplTabProduct },
    { id: "instagram", label: L.tplTabInstagram },
    { id: "facebook", label: L.tplTabFacebook },
    { id: "xhs", label: L.tplTabXhs },
    { id: "video", label: L.tplTabVideo },
    { id: "service", label: L.tplTabService },
  ];

  const cards = SHOWCASE.filter((c) => tab === "all" || c.tab === tab);

  return (
    <section id="templates" className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-8 md:py-14">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {L.tplTitleBefore}
          <span className="text-violet-600">{L.tplTitleHighlight}</span>
          {L.tplTitleAfter}
        </h2>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition md:text-sm ${
                tab === t.id
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mt-8">
          <div
            ref={scroller}
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card) => (
              <Link
                key={card.id}
                href="/start"
                className="w-[140px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md sm:w-[152px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.src} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-slate-900">{L[card.titleKey]}</p>
                  <p className="mt-0.5 truncate text-[10px] leading-snug text-slate-500">
                    {L[card.captionKey]}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {/* Mobile swipe hint — desktop uses the arrow button */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent md:hidden"
            aria-hidden
          />
          <button
            type="button"
            aria-label="Scroll templates"
            onClick={() => scroller.current?.scrollBy({ left: 180, behavior: "smooth" })}
            className="absolute -right-1 top-[40%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-600 shadow-md md:flex"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
