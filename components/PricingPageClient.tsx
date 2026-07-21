"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { useLocale } from "@/components/LocaleProvider";

type BillingInterval = "monthly" | "yearly";
type PaidPlanKey = "standard" | "pro" | "master";

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Vertical spacer between major page blocks */
function SectionGap() {
  return <div style={{ height: 48 }} aria-hidden />;
}

export function PricingPageClient() {
  const { m } = useLocale();
  const p = m.pricing;
  const { isSignedIn, isLoaded } = useAuth();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"free" | PaidPlanKey>("pro");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const paidPlans: PaidPlanKey[] = ["standard", "pro", "master"];

  const checkoutStatus = searchParams.get("checkout");

  async function startCheckout(body: Record<string, string>) {
    setCheckoutError(null);
    if (!isLoaded) return;
    if (!isSignedIn) {
      const returnTo = `/pricing?plan=${body.plan ?? "pro"}&interval=${body.interval ?? interval}`;
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
      return;
    }
    const key = body.kind === "topup" ? "topup" : `${body.plan}-${body.interval}`;
    setBusy(key);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? p.checkoutError);
      }
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : p.checkoutError);
      setBusy(null);
    }
  }

  async function openPortal() {
    setCheckoutError(null);
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }
    setBusy("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? p.checkoutError);
      }
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : p.checkoutError);
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* 1. Navbar */}
      <header className="mx-auto max-w-6xl px-6" style={{ paddingTop: 40, paddingBottom: 48 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/alchemy-logo.png" alt="alchemy.ai logo" className="h-10 w-10 rounded-xl object-contain" />
            <p className="text-lg font-semibold tracking-tight">alchemy.ai</p>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LanguageToggle variant="light" />
            <Link
              href="/how"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {m.landing.howItWorks}
            </Link>
            <AuthNav />
            <Link
              href="/start"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
            >
              {m.landing.openStudio}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        {checkoutStatus === "success" ? (
          <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            {p.checkoutSuccess}
          </div>
        ) : null}
        {checkoutStatus === "cancel" ? (
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            {p.checkoutCanceled}
          </div>
        ) : null}
        {checkoutError ? (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {checkoutError}
          </div>
        ) : null}

        {/* 2. Hero — 按創作量選計劃 */}
        <section
          className="rounded-2xl border border-slate-200 bg-linear-to-br from-indigo-50 via-white to-cyan-50 text-center"
          style={{ padding: "64px 40px" }}
        >
          <p className="mb-5 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            {p.badge}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{p.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600">{p.subtitle}</p>
          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                interval === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.monthly}
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                interval === "yearly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.yearly}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  interval === "yearly" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {p.yearlyBadge}
              </span>
            </button>
          </div>
          {isSignedIn ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/account"
                className="text-sm font-medium text-indigo-700 underline-offset-2 hover:underline"
              >
                {m.auth.accountMenu}
              </Link>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={busy === "portal"}
                className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline disabled:opacity-60"
              >
                {busy === "portal" ? p.checkoutRedirecting : p.manageBilling}
              </button>
            </div>
          ) : null}
        </section>

        <SectionGap />

        {/* 3. Pricing cards */}
        <section>
          <div className="grid lg:grid-cols-4 lg:items-stretch" style={{ gap: 48 }}>
            <PlanCard
              selected={selectedPlan === "free"}
              onSelect={() => setSelectedPlan("free")}
              name={p.plans.free.name}
              description={p.plans.free.description}
              price={p.freeForever}
              priceNote={p.plans.free.features[0]}
              features={p.plans.free.features.slice(1)}
              cta={p.getStarted}
              ctaHref="/sign-up"
            />
            {paidPlans.map((key) => {
              const plan = p.plans[key];
              const busyKey = `${key}-${interval}`;
              return (
                <PlanCard
                  key={key}
                  selected={selectedPlan === key}
                  onSelect={() => setSelectedPlan(key)}
                  name={plan.name}
                  description={plan.description}
                  listPrice={plan.listPrice}
                  price={interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  perMonth={p.perMonth}
                  yearlyNote={interval === "yearly" ? p.billedYearly : undefined}
                  saveLabel={interval === "monthly" ? plan.monthlySave : plan.yearlySave}
                  tokens={`${plan.tokens} ${p.tokensPerMonth}`}
                  features={plan.features.slice(1)}
                  cta={busy === busyKey ? p.checkoutRedirecting : p.subscribe}
                  ctaDisabled={busy != null}
                  onCtaClick={() =>
                    void startCheckout({
                      kind: "subscription",
                      plan: key,
                      interval,
                    })
                  }
                  badge={key === "pro" ? p.mostPopular : undefined}
                />
              );
            })}
          </div>
        </section>

        <SectionGap />

        {/* 4. Custom */}
        <section
          className="rounded-2xl border border-slate-200 bg-slate-50 sm:flex sm:items-center sm:justify-between sm:gap-10"
          style={{ padding: 48 }}
        >
          <div>
            <h2 className="text-xl font-semibold">{p.plans.custom.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{p.plans.custom.description}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {p.plans.custom.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="mailto:hello@alchemy.ai?subject=Custom%20plan"
            className="mt-10 inline-flex shrink-0 justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 sm:mt-0"
          >
            {p.contactSales}
          </a>
        </section>
      </div>

      <SectionGap />

      {/* 5. Token 點樣計 */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{p.tokenTitle}</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">{p.tokenSubtitle}</p>
          </div>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-12">
            {p.tokenItems.map((item, index) => (
              <li key={item.title} className="relative">
                <span className="text-sm font-semibold tabular-nums text-indigo-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>

          <div
            className="mt-14 flex flex-col items-stretch justify-between gap-6 border-t border-slate-200 pt-10 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{p.topUpTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.topUpSubtitle}</p>
              <p className="mt-1 text-xs text-slate-500">{p.topUpNote}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">{p.topUpPrice}</p>
              <p className="mt-1 text-sm text-slate-600">{p.topUpTokens}</p>
              <button
                type="button"
                onClick={() => void startCheckout({ kind: "topup" })}
                disabled={busy != null}
                className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {busy === "topup" ? p.checkoutRedirecting : p.buyTopUp}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 計劃比較 */}
      <section className="mx-auto max-w-6xl px-6" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h2 className="text-2xl font-semibold tracking-tight">{p.compareTitle}</h2>
        <div className="mt-12 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 font-semibold text-slate-700">{p.compareFeature}</th>
                <th className="px-5 py-4 font-semibold text-slate-700">{p.plans.free.name}</th>
                <th className="px-5 py-4 font-semibold text-slate-700">{p.plans.standard.name}</th>
                <th className="px-5 py-4 font-semibold text-indigo-700">{p.plans.pro.name}</th>
                <th className="px-5 py-4 font-semibold text-slate-700">{p.plans.master.name}</th>
              </tr>
            </thead>
            <tbody>
              {p.comparisonRows.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-5 py-4 font-medium text-slate-800">{row.feature}</td>
                  <td className="px-5 py-4 text-slate-600">{row.free}</td>
                  <td className="px-5 py-4 text-slate-600">{row.standard}</td>
                  <td className="px-5 py-4 font-medium text-indigo-900">{row.pro}</td>
                  <td className="px-5 py-4 text-slate-600">{row.master}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <h2 className="text-2xl font-semibold tracking-tight">{p.faqTitle}</h2>
          <div className="mt-12 space-y-5">
            {p.faq.map((item) => (
              <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-6">
                <summary className="cursor-pointer font-medium text-slate-900">{item.q}</summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </details>
            ))}
          </div>
          <p className="mt-14 text-center text-xs text-slate-500">{p.footnote}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/start"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white"
          >
            {m.landing.startCreating}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700"
          >
            {m.header.homeLink}
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

type PlanCardProps = {
  selected: boolean;
  onSelect: () => void;
  name: string;
  description: string;
  price: string;
  listPrice?: string;
  perMonth?: string;
  yearlyNote?: string;
  saveLabel?: string;
  priceNote?: string;
  tokens?: string;
  features: readonly string[];
  cta: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
  badge?: string;
};

function PlanCard({
  selected,
  onSelect,
  name,
  description,
  price,
  listPrice,
  perMonth,
  yearlyNote,
  saveLabel,
  priceNote,
  tokens,
  features,
  cta,
  ctaHref,
  onCtaClick,
  ctaDisabled,
  badge,
}: PlanCardProps) {
  const ctaClass = `mt-8 block w-full rounded-full py-3 text-center text-sm font-medium transition ${
    selected
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
  } disabled:opacity-60`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={name}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex h-full cursor-pointer flex-col rounded-2xl border p-8 transition ${
        selected
          ? "border-indigo-400 bg-linear-to-b from-indigo-50 to-white shadow-lg shadow-indigo-100/50 ring-2 ring-indigo-300"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* Reserve badge height on every card — empty when no badge */}
      <div className="mb-4 flex h-7 shrink-0 items-center justify-center">
        {badge ? (
          <span className="inline-flex rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="min-h-[4.5rem]">
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>

      <div className="mt-6 min-h-[7.5rem]">
        {listPrice ? (
          <p className="text-sm text-slate-400 line-through">{listPrice}</p>
        ) : (
          <div className="h-5" aria-hidden />
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{price}</span>
          {perMonth ? <span className="text-sm text-slate-500">{perMonth}</span> : null}
        </div>
        {saveLabel ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">{saveLabel}</p>
        ) : (
          <div className="mt-2 h-4" aria-hidden />
        )}
        {yearlyNote ? <p className="mt-1 text-xs text-slate-500">{yearlyNote}</p> : null}
        <p className={`mt-4 text-sm font-medium ${selected ? "text-indigo-800" : "text-slate-700"}`}>
          {tokens ?? priceNote}
        </p>
      </div>

      <ul className="mt-6 flex-1 space-y-3.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>

      {onCtaClick ? (
        <button
          type="button"
          disabled={ctaDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onCtaClick();
          }}
          className={ctaClass}
        >
          {cta}
        </button>
      ) : (
        <Link href={ctaHref ?? "/sign-up"} onClick={(e) => e.stopPropagation()} className={ctaClass}>
          {cta}
        </Link>
      )}
    </div>
  );
}
