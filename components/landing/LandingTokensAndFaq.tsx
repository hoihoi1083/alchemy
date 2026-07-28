"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { TOKEN_COST, estimateVideoTokens } from "@/lib/billing/token-costs";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";

export function LandingTokensAndFaq() {
  const { m } = useLocale();
  const L = m.landing;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const video8s = estimateVideoTokens({
    duration: 8,
    resolution: "480p",
    fast: true,
  });

  const costs = [
    { label: L.tokenCostPlan, value: TOKEN_COST.plan },
    { label: L.tokenCostImage, value: TOKEN_COST.image },
    { label: L.tokenCostStoryboard, value: TOKEN_COST.storyboard_batch },
    { label: L.tokenCostMusic, value: TOKEN_COST.music },
    { label: L.tokenCostVideoDraft, value: video8s },
    { label: L.tokenCostVoice, value: TOKEN_COST.voiceover },
  ];

  return (
    <section id="resources" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{L.tokensTitle}</h2>
          <p className="mt-3 text-sm text-slate-600">{L.tokensBody}</p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {costs.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-violet-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                ◆
              </div>
              <p className="text-xs font-medium text-slate-700">{c.label}</p>
              <p className="mt-2 text-sm font-bold text-violet-700">
                {c.value} {L.tokensUnit}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">{L.tokensVideoNote}</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-violet-700">{L.topUpTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{L.topUpBody}</p>
            <ul className="mt-5 space-y-3">
              <li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">
                  {TOP_UP_TOKENS.toLocaleString()} {L.tokensUnit}
                </span>
                <span className="font-semibold text-violet-700">${TOP_UP_PRICE_USD}</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">{L.topUpCustom}</span>
                <Link href="/pricing" className="font-semibold text-violet-700 hover:underline">
                  {L.pricingCustom}
                </Link>
              </li>
            </ul>
            <Link
              href="/pricing"
              className="mt-5 inline-flex text-sm font-semibold text-violet-700 hover:underline"
            >
              {L.tokensSeePricing}
            </Link>
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{L.faqTitle}</h3>
            <div className="mt-5 space-y-2">
              {L.faq.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      {item.q}
                      <span className="text-violet-600">{open ? "−" : "+"}</span>
                    </button>
                    {open ? (
                      <p className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600">
                        {item.a}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
