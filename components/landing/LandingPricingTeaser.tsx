"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";

type Interval = "monthly" | "yearly";

export function LandingPricingTeaser() {
  const { m } = useLocale();
  const L = m.landing;
  const P = m.pricing;
  const [interval, setInterval] = useState<Interval>("monthly");

  const cards = [
    {
      id: "free",
      name: P.plans.free.name,
      blurb: L.planBlurbFree,
      price: 0,
      tokens: PLAN_DEFINITIONS.free.monthlyTokens,
      features: L.planFeaturesFree,
      cta: L.pricingFreeCta,
      href: "/start",
      popular: false,
    },
    {
      id: "standard",
      name: P.plans.standard.name,
      blurb: L.planBlurbStandard,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.standard.monthlyPriceUsd
          : PLAN_DEFINITIONS.standard.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.standard.monthlyTokens,
      features: L.planFeaturesStandard,
      cta: P.subscribe,
      href: "/pricing?plan=standard",
      popular: false,
    },
    {
      id: "pro",
      name: P.plans.pro.name,
      blurb: L.planBlurbPro,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.pro.monthlyPriceUsd
          : PLAN_DEFINITIONS.pro.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.pro.monthlyTokens,
      features: L.planFeaturesPro,
      cta: L.pricingProCta,
      href: "/pricing?plan=pro",
      popular: true,
    },
    {
      id: "master",
      name: P.plans.master.name,
      blurb: L.planBlurbMaster,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.master.monthlyPriceUsd
          : PLAN_DEFINITIONS.master.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.master.monthlyTokens,
      features: L.planFeaturesMaster,
      cta: P.subscribe,
      href: "/pricing?plan=master",
      popular: false,
    },
    {
      id: "custom",
      name: P.plans.custom.name,
      blurb: L.planBlurbCustom,
      price: null as number | null,
      tokens: null as number | null,
      features: L.planFeaturesCustom,
      cta: P.contactSales,
      href: "/pricing",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{P.title}</h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">{L.pricingSubtitle}</p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                interval === "monthly" ? "bg-violet-600 text-white" : "text-slate-600"
              }`}
            >
              {P.monthly}
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                interval === "yearly" ? "bg-violet-600 text-white" : "text-slate-600"
              }`}
            >
              {P.yearly}
            </button>
            <span className="mr-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              {L.pricingSaveBadge}
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                card.popular ? "border-violet-400 ring-2 ring-violet-200" : "border-slate-200"
              }`}
            >
              {card.popular ? (
                <p className="mb-2 inline-flex self-start rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {P.mostPopular}
                </p>
              ) : (
                <div className="mb-2 h-5" />
              )}
              <h3 className="text-lg font-semibold text-slate-900">{card.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{card.blurb}</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {card.price == null ? (
                  <span className="text-xl">{L.pricingCustom}</span>
                ) : (
                  <>
                    ${card.price}
                    <span className="text-sm font-medium text-slate-500">{P.perMonth}</span>
                  </>
                )}
              </p>
              {card.tokens != null ? (
                <p className="mt-2 text-sm font-medium text-violet-700">
                  {card.tokens.toLocaleString()} {P.tokensPerMonth}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{L.pricingCustomHint}</p>
              )}
              <ul className="mt-4 space-y-2">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2 text-xs text-slate-600">
                    <span className="text-violet-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={card.href}
                className={`mt-auto block rounded-full px-4 py-2.5 text-center text-sm font-semibold ${
                  card.popular
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                }`}
                style={{ marginTop: 20 }}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
