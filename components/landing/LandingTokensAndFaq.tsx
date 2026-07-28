"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { TOKEN_COST } from "@/lib/billing/token-costs";

export function LandingTokensAndFaq() {
  const { m } = useLocale();
  const L = m.landing;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const costs = [
    { label: L.tokenCostPlan, value: TOKEN_COST.plan },
    { label: L.tokenCostImage, value: TOKEN_COST.image },
    { label: L.tokenCostStoryboard, value: TOKEN_COST.storyboard_batch },
    { label: L.tokenCostMusic, value: TOKEN_COST.music },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{L.tokensTitle}</h2>
          <p className="mt-3 text-sm text-slate-600">{L.tokensBody}</p>
          <ul className="mt-6 space-y-3">
            {costs.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{c.label}</span>
                <span className="font-semibold text-violet-700">
                  {c.value} {L.tokensUnit}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">{L.tokensVideoNote}</p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex text-sm font-semibold text-violet-700 hover:underline"
          >
            {L.tokensSeePricing}
          </Link>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{L.faqTitle}</h2>
          <div className="mt-6 space-y-2">
            {L.faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className="rounded-xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900"
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    {item.q}
                    <span className="text-violet-600">{open ? "−" : "+"}</span>
                  </button>
                  {open ? (
                    <p className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
