"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Reveal } from "@/components/landing/Reveal";
import { useLocale } from "@/components/LocaleProvider";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import {
  estimatePlanApproxCapacity,
} from "@/lib/billing/token-costs";
import { PRODUCT_SUPPORT_EMAIL } from "@/lib/brand";
import {
  trackCheckoutFailed,
  trackCheckoutRedirected,
  trackCheckoutStarted,
  trackSubscribeSuccess,
  trackTopupSuccess,
} from "@/lib/analytics";

type BillingInterval = "monthly" | "yearly";
type PaidPlanKey = "standard" | "pro" | "master";

const PRICING_LAYOUT_CSS = `
.pricing-page-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .pricing-page-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 768px) {
  .pricing-page-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
}
@media (min-width: 1100px) {
  .pricing-page-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
`;

export function PricingPageClient() {
  const { m } = useLocale();
  const p = m.pricing;
  const { isSignedIn, isLoaded } = useAuth();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const confirmStarted = useRef(false);
  const paidPlans: PaidPlanKey[] = ["standard", "pro", "master"];

  const checkoutStatus = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval");
  const autoCheckoutStarted = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (checkoutStatus === "success" || checkoutStatus === "cancel") return;
    if (searchParams.get("checkout") !== "1") return;
    if (!planParam || !paidPlans.includes(planParam as PaidPlanKey)) return;
    if (autoCheckoutStarted.current) return;
    autoCheckoutStarted.current = true;
    const nextInterval =
      intervalParam === "yearly" || intervalParam === "monthly" ? intervalParam : interval;
    setInterval(nextInterval);
    void startCheckout({
      kind: "subscription",
      plan: planParam,
      interval: nextInterval,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on signed-in deep link
  }, [isLoaded, isSignedIn, checkoutStatus, planParam, intervalParam]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (checkoutStatus !== "success") return;
    if (confirmStarted.current) return;
    confirmStarted.current = true;

    // In-place plan switch (no Checkout Session) — show upgrade/downgrade note from query.
    if (searchParams.get("updated") === "1" && !checkoutSessionId) {
      if (searchParams.get("deferred") === "1") {
        const pendingPlan = searchParams.get("pendingPlan");
        const pendingAt = searchParams.get("pendingAt");
        const planName =
          pendingPlan === "standard"
            ? p.plans.standard.name
            : pendingPlan === "pro"
              ? p.plans.pro.name
              : pendingPlan === "master"
                ? p.plans.master.name
                : pendingPlan ?? "";
        const dateLabel = pendingAt
          ? new Date(pendingAt).toLocaleDateString(undefined, { dateStyle: "medium" })
          : "—";
        setConfirmNote(
          p.subscriptionDowngradeScheduled
            .replace("{plan}", planName)
            .replace("{date}", dateLabel),
        );
      } else {
        setConfirmNote(p.subscriptionUpgraded);
      }
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/stripe/confirm-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            checkoutSessionId ? { sessionId: checkoutSessionId } : {},
          ),
        });
        const data = (await res.json()) as {
          error?: string;
          tokensGranted?: number;
          creditBalance?: number;
        };
        if (!res.ok) {
          setConfirmNote(data.error ?? p.checkoutError);
          return;
        }
        const kind = searchParams.get("kind");
        if (kind === "topup") {
          trackTopupSuccess({
            tokens_granted: data.tokensGranted,
            source: "pricing",
          });
        } else {
          trackSubscribeSuccess({
            tokens_granted: data.tokensGranted,
            source: "pricing",
          });
        }
        const granted = typeof data.tokensGranted === "number" ? data.tokensGranted : 0;
        const bal = typeof data.creditBalance === "number" ? data.creditBalance : null;
        if (granted > 0) {
          setConfirmNote(
            bal != null
              ? `${p.checkoutSuccess} (+${granted} · balance ${bal})`
              : p.checkoutSuccess,
          );
        } else {
          setConfirmNote(
            bal != null ? `${p.checkoutSuccess} (balance ${bal})` : p.checkoutSuccess,
          );
        }
      } catch {
        setConfirmNote(p.checkoutSuccess);
      }
    })();
  }, [
    isLoaded,
    isSignedIn,
    checkoutStatus,
    checkoutSessionId,
    p.checkoutError,
    p.checkoutSuccess,
    p.subscriptionUpgraded,
    p.subscriptionDowngradeScheduled,
    p.plans.standard.name,
    p.plans.pro.name,
    p.plans.master.name,
    searchParams,
  ]);

  async function startCheckout(body: Record<string, string>) {
    setCheckoutError(null);
    if (!isLoaded) return;
    if (!isSignedIn) {
      const returnTo = `/pricing?plan=${body.plan ?? "pro"}&interval=${body.interval ?? interval}&checkout=1`;
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
      return;
    }
    const key = body.kind === "topup" ? "topup" : `${body.plan}-${body.interval}`;
    setBusy(key);
    trackCheckoutStarted({
      kind: body.kind ?? "subscription",
      plan: body.plan,
      interval: body.interval,
      source: "pricing",
    });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let data: {
        url?: string;
        error?: string;
        code?: string;
        updated?: boolean;
        deferred?: boolean;
        pendingPlan?: string | null;
        pendingEffectiveAt?: string | null;
      } = {};
      try {
        data = raw
          ? (JSON.parse(raw) as {
              url?: string;
              error?: string;
              code?: string;
              updated?: boolean;
              deferred?: boolean;
              pendingPlan?: string | null;
              pendingEffectiveAt?: string | null;
            })
          : {};
      } catch {
        throw new Error(raw?.slice(0, 200) || p.checkoutError);
      }
      if (res.ok && data.updated) {
        trackSubscribeSuccess({
          plan: body.plan,
          interval: body.interval,
          updated_in_place: true,
          source: "pricing",
        });
        if (data.deferred && data.pendingPlan) {
          const planName =
            data.pendingPlan === "standard"
              ? p.plans.standard.name
              : data.pendingPlan === "pro"
                ? p.plans.pro.name
                : data.pendingPlan === "master"
                  ? p.plans.master.name
                  : data.pendingPlan;
          const dateLabel = data.pendingEffectiveAt
            ? new Date(data.pendingEffectiveAt).toLocaleDateString(undefined, {
                dateStyle: "medium",
              })
            : "—";
          setConfirmNote(
            p.subscriptionDowngradeScheduled
              .replace("{plan}", planName)
              .replace("{date}", dateLabel),
          );
        } else {
          setConfirmNote(p.subscriptionUpgraded);
        }
        setBusy(null);
        return;
      }
      if (!res.ok || !data.url) {
        if (data.code === "payment_incomplete") {
          throw new Error(p.paymentIncomplete);
        }
        throw new Error(data.error ?? p.checkoutError);
      }
      trackCheckoutRedirected({
        kind: body.kind ?? "subscription",
        plan: body.plan,
        interval: body.interval,
        source: "pricing",
      });
      window.location.href = data.url;
    } catch (e) {
      trackCheckoutFailed({
        kind: body.kind ?? "subscription",
        plan: body.plan,
        source: "pricing",
      });
      setCheckoutError(e instanceof Error ? e.message : p.checkoutError);
      setBusy(null);
    }
  }

  const cards = [
    {
      id: "free" as const,
      name: p.plans.free.name,
      blurb: p.plans.free.description,
      priceLabel: p.freeForever,
      tokensLabel: `${PLAN_DEFINITIONS.free.monthlyTokens.toLocaleString()} ${p.tokensPerMonth}`,
      capacity: (() => {
        const c = estimatePlanApproxCapacity("free");
        return [
          {
            kind: "images" as const,
            label: p.capacityImagesFeature.replace("{n}", String(c.approxImages)),
          },
          {
            kind: "storyboard" as const,
            label: p.capacityStoryboardsFeature
              .replace("{n}", String(c.approxStoryboards))
              .replace("{sec}", String(c.storyboardSec)),
          },
        ];
      })(),
      features: p.plans.free.features.slice(1),
      cta: p.getStarted,
      popular: false,
    },
    {
      id: "standard" as const,
      name: p.plans.standard.name,
      blurb: p.plans.standard.description,
      priceLabel: interval === "monthly" ? p.plans.standard.monthlyPrice : p.plans.standard.yearlyPrice,
      listPrice: p.plans.standard.listPrice,
      saveLabel: interval === "monthly" ? p.plans.standard.monthlySave : p.plans.standard.yearlySave,
      tokensLabel: `${p.plans.standard.tokens} ${p.tokensPerMonth}`,
      capacity: (() => {
        const c = estimatePlanApproxCapacity("standard");
        return [
          {
            kind: "images" as const,
            label: p.capacityImagesFeature.replace("{n}", String(c.approxImages)),
          },
          {
            kind: "storyboard" as const,
            label: p.capacityStoryboardsFeature
              .replace("{n}", String(c.approxStoryboards))
              .replace("{sec}", String(c.storyboardSec)),
          },
        ];
      })(),
      features: p.plans.standard.features.slice(1),
      cta: p.subscribe,
      popular: false,
    },
    {
      id: "pro" as const,
      name: p.plans.pro.name,
      blurb: p.plans.pro.description,
      priceLabel: interval === "monthly" ? p.plans.pro.monthlyPrice : p.plans.pro.yearlyPrice,
      listPrice: p.plans.pro.listPrice,
      saveLabel: interval === "monthly" ? p.plans.pro.monthlySave : p.plans.pro.yearlySave,
      tokensLabel: `${p.plans.pro.tokens} ${p.tokensPerMonth}`,
      capacity: (() => {
        const c = estimatePlanApproxCapacity("pro");
        return [
          {
            kind: "images" as const,
            label: p.capacityImagesFeature.replace("{n}", String(c.approxImages)),
          },
          {
            kind: "storyboard" as const,
            label: p.capacityStoryboardsFeature
              .replace("{n}", String(c.approxStoryboards))
              .replace("{sec}", String(c.storyboardSec)),
          },
        ];
      })(),
      features: p.plans.pro.features.slice(1),
      cta: p.subscribe,
      popular: true,
    },
    {
      id: "master" as const,
      name: p.plans.master.name,
      blurb: p.plans.master.description,
      priceLabel: interval === "monthly" ? p.plans.master.monthlyPrice : p.plans.master.yearlyPrice,
      listPrice: p.plans.master.listPrice,
      saveLabel: interval === "monthly" ? p.plans.master.monthlySave : p.plans.master.yearlySave,
      tokensLabel: `${p.plans.master.tokens} ${p.tokensPerMonth}`,
      capacity: (() => {
        const c = estimatePlanApproxCapacity("master");
        return [
          {
            kind: "images" as const,
            label: p.capacityImagesFeature.replace("{n}", String(c.approxImages)),
          },
          {
            kind: "storyboard" as const,
            label: p.capacityStoryboardsFeature
              .replace("{n}", String(c.approxStoryboards))
              .replace("{sec}", String(c.storyboardSec)),
          },
        ];
      })(),
      features: p.plans.master.features.slice(1),
      cta: p.subscribe,
      popular: false,
    },
    {
      id: "custom" as const,
      name: p.plans.custom.name,
      blurb: p.plans.custom.description,
      priceLabel: p.contactSales,
      tokensLabel: null as string | null,
      capacity: null as
        | { kind: "images" | "storyboard"; label: string }[]
        | null,
      features: p.plans.custom.features,
      cta: p.contactSales,
      popular: false,
    },
    {
      id: "topup" as const,
      name: p.topUpTitle,
      blurb: p.topUpSubtitle,
      priceLabel: p.topUpPrice,
      tokensLabel: p.topUpTokens,
      capacity: null as
        | { kind: "images" | "storyboard"; label: string }[]
        | null,
      features: [p.topUpNote],
      cta: p.buyTopUp,
      popular: false,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900 supports-[min-height:100dvh]:min-h-dvh">
      <style dangerouslySetInnerHTML={{ __html: PRICING_LAYOUT_CSS }} />
      <LandingNav />

      <div className="flex flex-1 flex-col">
        {/* Plans — landing-style header + cards */}
        <section className="w-full bg-white">
          <div className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
            {checkoutStatus === "success" ? (
              <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                {confirmNote ?? p.checkoutSuccess}
              </div>
            ) : null}
            {checkoutStatus !== "success" && confirmNote ? (
              <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                {confirmNote}
              </div>
            ) : null}
            {checkoutStatus === "cancel" ? (
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {p.checkoutCanceled}
              </div>
            ) : null}
            {checkoutError ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {checkoutError}
              </div>
            ) : null}

            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
                  {p.titleBefore}
                  <br />
                  <span className="text-violet-600">{p.titleHighlight}</span>
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-[17px]">
                  {p.subtitle}
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={80} distance={28} scaleFrom={0.96}>
              <div className="mt-6 flex justify-center">
                <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setInterval("monthly")}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                      interval === "monthly" ? "bg-violet-600 text-white" : "text-slate-600"
                    }`}
                  >
                    {p.monthly}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterval("yearly")}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                      interval === "yearly" ? "bg-violet-600 text-white" : "text-slate-600"
                    }`}
                  >
                    {p.yearly}
                  </button>
                  <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {interval === "monthly" ? p.monthlyBadge : p.yearlyBadge}
                  </span>
                </div>
              </div>
            </Reveal>

            <div
              className="pricing-page-grid mt-8"
              onMouseLeave={() => setHoveredId(null)}
            >
              {cards.map((card, i) => {
                const busyKey =
                  card.id === "standard" || card.id === "pro" || card.id === "master"
                    ? `${card.id}-${interval}`
                    : card.id === "topup"
                      ? "topup"
                      : null;
                const isBusy = busyKey != null && busy === busyKey;
                const ctaLabel = isBusy ? p.checkoutRedirecting : card.cta;
                const isActive = hoveredId === card.id || (hoveredId === null && card.popular);
                const isTopup = card.id === "topup";

                return (
                  <Reveal
                    key={card.id}
                    delayMs={i * 90}
                    distance={44}
                    scaleFrom={0.94}
                    className="h-full"
                  >
                    <div
                      onMouseEnter={() => setHoveredId(card.id)}
                      className={`pricing-plan-card flex h-full min-h-[300px] min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm transition duration-200 ${
                        isActive
                          ? "border-violet-400 ring-2 ring-violet-200"
                          : isTopup
                            ? "border-violet-200"
                            : "border-slate-200 ring-0"
                      }`}
                    >
                      {/* Zone: badge — same height on every card */}
                      <div className="flex h-5 shrink-0 items-center">
                        {card.popular ? (
                          <p className="inline-flex rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                            {p.mostPopular}
                          </p>
                        ) : null}
                      </div>

                      {/* Zone: name + blurb */}
                      <h2
                        className={`mt-2 text-base font-semibold leading-tight ${
                          isTopup ? "text-violet-700" : "text-slate-900"
                        }`}
                      >
                        {card.name}
                      </h2>
                      <p className="mt-1 min-h-[2.5rem] text-[11px] leading-snug text-slate-500 line-clamp-2">
                        {card.blurb}
                      </p>

                      {/* Zone: price — reserved rows keep baselines aligned */}
                      <div className="mt-4 flex min-h-[4.75rem] flex-col justify-start">
                        <p
                          className={`h-4 text-[11px] leading-4 ${
                            "listPrice" in card && card.listPrice
                              ? "text-slate-400 line-through"
                              : "invisible"
                          }`}
                        >
                          {"listPrice" in card && card.listPrice
                            ? card.listPrice
                            : "—"}
                        </p>
                        <p
                          className={`text-2xl font-bold leading-none ${
                            isTopup ? "text-violet-800" : "text-slate-900"
                          }`}
                        >
                          {card.priceLabel}
                          {card.id !== "free" &&
                          card.id !== "custom" &&
                          card.id !== "topup" ? (
                            <span className="text-xs font-medium text-slate-500">
                              {p.perMonth}
                            </span>
                          ) : null}
                        </p>
                        <p
                          className={`mt-0.5 flex h-5 items-center ${
                            "saveLabel" in card && card.saveLabel ? "" : "invisible"
                          }`}
                        >
                          {"saveLabel" in card && card.saveLabel ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              {card.saveLabel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                        <p
                          className={`h-4 text-[10px] leading-4 ${
                            interval === "yearly" &&
                            card.id !== "free" &&
                            card.id !== "custom" &&
                            card.id !== "topup"
                              ? "text-slate-400"
                              : "invisible"
                          }`}
                        >
                          {p.billedYearly}
                        </p>
                      </div>

                      {/* Zone: tokens */}
                      <p
                        className={`mt-2 min-h-[1.25rem] text-xs font-medium leading-5 ${
                          card.tokensLabel ? "text-violet-700" : "invisible"
                        }`}
                      >
                        {card.tokensLabel ?? "—"}
                      </p>

                      {/* Zone: capacity (images / storyboard) */}
                      <ul className="mt-3 min-h-[5.5rem] space-y-2 border-b border-dashed border-slate-200 pb-3">
                        {card.capacity && card.capacity.length > 0 ? (
                          card.capacity.map((item) => (
                            <li
                              key={item.kind}
                              className="flex items-start gap-2 text-[11px] leading-snug text-slate-700"
                            >
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-violet-600">
                                {item.kind === "images" ? (
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
                                    <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
                                    <circle cx="9" cy="10" r="1.4" fill="currentColor" />
                                    <path d="M3.5 15.5 8 12l3.5 2.5L15 11l5.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
                                    <rect x="2.5" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
                                    <rect x="9.25" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
                                    <rect x="16" y="5" width="5.5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
                                  </svg>
                                )}
                              </span>
                              {item.label}
                            </li>
                          ))
                        ) : (
                          <>
                            <li className="invisible flex items-start gap-2 text-[11px] leading-snug">
                              <span className="h-4 w-4 shrink-0" />
                              —
                            </li>
                            <li className="invisible flex items-start gap-2 text-[11px] leading-snug">
                              <span className="h-4 w-4 shrink-0" />
                              —
                            </li>
                          </>
                        )}
                      </ul>

                      {/* Zone: feature checklist — grows; CTA stays pinned */}
                      <ul className="mt-3 flex-1 space-y-2">
                        {card.features.map((f) => (
                          <li
                            key={f}
                            className="flex gap-1.5 text-[11px] leading-snug text-slate-600"
                          >
                            <span className="shrink-0 text-violet-600">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5 shrink-0">
                      {card.id === "free" ? (
                        <Link
                          href="/start"
                          className={`block rounded-full px-3 py-2.5 text-center text-xs font-semibold transition ${
                            isActive
                              ? "bg-violet-600 text-white hover:bg-violet-500"
                              : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                          }`}
                        >
                          {ctaLabel}
                        </Link>
                      ) : card.id === "custom" ? (
                        <a
                          href={`mailto:${PRODUCT_SUPPORT_EMAIL}?subject=Custom%20plan`}
                          className={`block rounded-full px-3 py-2.5 text-center text-xs font-semibold transition ${
                            isActive
                              ? "bg-violet-600 text-white hover:bg-violet-500"
                              : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                          }`}
                        >
                          {ctaLabel}
                        </a>
                      ) : card.id === "topup" ? (
                        <button
                          type="button"
                          disabled={busy != null}
                          onClick={() => void startCheckout({ kind: "topup" })}
                          className={`block w-full rounded-full px-3 py-2.5 text-center text-xs font-semibold transition disabled:opacity-60 ${
                            isActive
                              ? "bg-violet-600 text-white hover:bg-violet-500"
                              : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                          }`}
                        >
                          {ctaLabel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy != null}
                          onClick={() =>
                            void startCheckout({
                              kind: "subscription",
                              plan: card.id,
                              interval,
                            })
                          }
                          className={`block w-full rounded-full px-3 py-2.5 text-center text-xs font-semibold transition disabled:opacity-60 ${
                            isActive
                              ? "bg-violet-600 text-white hover:bg-violet-500"
                              : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                          }`}
                        >
                          {ctaLabel}
                        </button>
                      )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Compare — constrained table width */}
        <section className="border-t border-slate-100 bg-white">
          <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-8 md:py-12">
            <Reveal>
              <div className="mx-auto max-w-xl text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {p.compareTitle}
                </h2>
              </div>
            </Reveal>
            <Reveal delayMs={80} distance={28} scaleFrom={0.98}>
              <div
                className="mx-auto mt-6 overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-sm"
                style={{ maxWidth: "50rem" }}
              >
                <table className="w-full min-w-[480px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[18.5%]" />
                    <col className="w-[18.5%]" />
                    <col className="w-[18.5%]" />
                    <col className="w-[18.5%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50/80">
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-4">
                        {p.compareFeature}
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-semibold text-slate-700">
                        {p.plans.free.name}
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-semibold text-slate-700">
                        {p.plans.standard.name}
                      </th>
                      <th className="bg-violet-100/70 px-2 py-3 text-center text-sm font-semibold text-violet-800">
                        {p.plans.pro.name}
                      </th>
                      <th className="px-2 py-3 text-center text-sm font-semibold text-slate-700">
                        {p.plans.master.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.comparisonRows.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`border-b border-slate-100 last:border-0 ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-3 py-3 text-sm font-medium leading-snug text-slate-800 sm:px-4">
                          {row.feature}
                        </td>
                        <td className="px-2 py-3 text-center text-sm text-slate-600">{row.free}</td>
                        <td className="px-2 py-3 text-center text-sm text-slate-600">{row.standard}</td>
                        <td className="bg-violet-50/50 px-2 py-3 text-center text-sm font-medium text-violet-900">
                          {row.pro}
                        </td>
                        <td className="px-2 py-3 text-center text-sm text-slate-600">{row.master}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-violet-100 bg-gradient-to-b from-violet-50/70 to-white">
          <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8 md:py-12">
            <Reveal>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-violet-900">{p.faqTitle}</h2>
                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-violet-500" aria-hidden />
              </div>
            </Reveal>
            <div className="mt-6 space-y-3">
              {p.faq.map((item, i) => (
                <Reveal key={item.q} delayMs={i * 60} distance={28} scaleFrom={0.98}>
                  <details className="group rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm open:border-violet-400 open:bg-violet-50/60 open:shadow-md open:shadow-violet-100/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 text-sm sm:text-[15px]">{item.q}</span>
                      <span
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold leading-none text-violet-700 transition group-open:rotate-45 group-open:bg-violet-600 group-open:text-white"
                        style={{ width: 28, height: 28 }}
                        aria-hidden
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 border-t border-violet-100 pt-3 text-sm leading-relaxed text-slate-600">
                      {item.body}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
            <p className="mt-8 text-center text-xs leading-relaxed text-violet-800/70">{p.footnote}</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-5 py-10 md:px-8">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/start"
                className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              >
                {m.landing.startCreating}
              </Link>
              <Link
                href="/"
                className="rounded-full border border-violet-300 px-6 py-3 text-sm font-medium text-violet-800 hover:bg-violet-50"
              >
                {m.header.homeLink}
              </Link>
            </div>
          </Reveal>
        </section>
      </div>

      <LandingFooter />
    </main>
  );
}
