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
      price: 0,
      tokens: PLAN_DEFINITIONS.free.monthlyTokens,
      cta: L.pricingFreeCta,
      href: "/start",
      popular: false,
    },
    {
      id: "standard",
      name: P.plans.standard.name,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.standard.monthlyPriceUsd
          : PLAN_DEFINITIONS.standard.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.standard.monthlyTokens,
      cta: P.subscribe,
      href: "/pricing?plan=standard",
      popular: false,
    },
    {
      id: "pro",
      name: P.plans.pro.name,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.pro.monthlyPriceUsd
          : PLAN_DEFINITIONS.pro.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.pro.monthlyTokens,
      cta: L.pricingProCta,
      href: "/pricing?plan=pro",
      popular: true,
    },
    {
      id: "master",
      name: P.plans.master.name,
      price:
        interval === "monthly"
          ? PLAN_DEFINITIONS.master.monthlyPriceUsd
          : PLAN_DEFINITIONS.master.yearlyPriceUsd,
      tokens: PLAN_DEFINITIONS.master.monthlyTokens,
      cta: P.subscribe,
      href: "/pricing?plan=master",
      popular: false,
    },
    {
      id: "custom",
      name: P.plans.custom.name,
      price: null as number | null,
      tokens: null as number | null,
      cta: P.contactSales,
      href: "/pricing",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{P.title}</h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">{L.pricingSubtitle}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
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
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                card.popular
                  ? "border-violet-400 ring-2 ring-violet-200"
                  : "border-slate-200"
              }`}
            >
              {card.popular ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
                  {P.mostPopular}
                </p>
              ) : (
                <div className="mb-2 h-4" />
              )}
              <h3 className="text-lg font-semibold text-slate-900">{card.name}</h3>
              <p className="mt-3 text-3xl font-bold text-slate-900">
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
                <p className="mt-2 text-sm text-slate-600">
                  {card.tokens.toLocaleString()} {P.tokensPerMonth}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{L.pricingCustomHint}</p>
              )}
              <Link
                href={card.href}
                className={`mt-auto block rounded-full px-4 py-2.5 text-center text-sm font-semibold ${
                  card.popular
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "border border-slate-300 text-slate-800 hover:border-violet-300"
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
