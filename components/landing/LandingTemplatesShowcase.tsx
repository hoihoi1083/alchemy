"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

type Tab = "all" | "product" | "video" | "service";

const SHOWCASE = [
  {
    id: "skincare",
    tab: "product" as const,
    src: "/images/landing/landing-canvas-skincare.png",
  },
  {
    id: "sunscreen",
    tab: "product" as const,
    src: "/images/landing/landing-tpl-sunscreen.png",
  },
  {
    id: "coffee",
    tab: "product" as const,
    src: "/images/landing/landing-result-coffee.png",
  },
  {
    id: "service",
    tab: "service" as const,
    src: "/images/landing/landing-tpl-service.png",
  },
  {
    id: "ref",
    tab: "video" as const,
    src: "/images/landing/landing-ref-coffee.png",
  },
  {
    id: "hero",
    tab: "video" as const,
    src: "/images/landing/landing-hero-product.png",
  },
];

export function LandingTemplatesShowcase() {
  const { m } = useLocale();
  const L = m.landing;
  const [tab, setTab] = useState<Tab>("all");

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: L.tplTabAll },
    { id: "product", label: L.tplTabProduct },
    { id: "video", label: L.tplTabVideo },
    { id: "service", label: L.tplTabService },
  ];

  const cards = SHOWCASE.filter((c) => tab === "all" || c.tab === tab);

  return (
    <section id="templates" className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {L.tplTitleBefore}
            <span className="text-sky-600">{L.tplTitleHighlight}</span>
            {L.tplTitleAfter}
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">{L.tplSubtitle}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.id}
              href="/start"
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-violet-300 hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.src}
                alt=""
                className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/start"
            className="inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            {L.ctaPrimary}
          </Link>
        </div>
      </div>
    </section>
  );
}
