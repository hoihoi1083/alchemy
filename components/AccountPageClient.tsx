"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/components/LocaleProvider";
import type { CreditReason } from "@/lib/billing/ledger";
import type { UserPlan } from "@/lib/billing/plans";
import { CREDITS_EVENT } from "@/lib/credits-client";
import { PRODUCT_LOGO_ALT, PRODUCT_LOGO_SRC, PRODUCT_NAME } from "@/lib/brand";

type MeUser = {
  creditBalance?: number | null;
  plan?: UserPlan | string | null;
  planRenewsAt?: string | Date | null;
  pendingPlan?: "standard" | "pro" | "master" | null;
  pendingPlanEffectiveAt?: string | Date | null;
  stripeCustomerId?: string | null;
  email?: string | null;
  name?: string | null;
};

type TxRow = {
  id: string;
  delta: number;
  reason: CreditReason;
  ref: string | null;
  meta: Record<string, unknown> | null;
  balanceAfter: number;
  createdAt: string;
};

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(
    locale === "zh-cn"
      ? "zh-CN"
      : locale === "zh-tw"
        ? "zh-TW"
        : locale === "zh"
          ? "zh-HK"
          : "en-US",
    {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AccountPageClient() {
  const { m, locale } = useLocale();
  const a = m.account;
  const { isSignedIn, isLoaded } = useAuth();
  const [user, setUser] = useState<MeUser | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [meRes, txRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/me/transactions?limit=40"),
      ]);
      if (meRes.status === 401 || txRes.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/account")}`;
        return;
      }
      if (!meRes.ok) throw new Error(a.loadError);
      const meData = (await meRes.json()) as { user?: MeUser | null };
      setUser(meData.user ?? null);

      if (txRes.ok) {
        const txData = (await txRes.json()) as { transactions?: TxRow[] };
        setTxs(txData.transactions ?? []);
      } else {
        setTxs([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : a.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/account")}`;
      return;
    }
    void load();
    const onCredits = () => void load();
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => window.removeEventListener(CREDITS_EVENT, onCredits);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on auth only
  }, [isLoaded, isSignedIn]);

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? a.portalError);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : a.portalError);
      setPortalBusy(false);
    }
  }

  const planKey = (user?.plan as UserPlan) || "free";
  const planLabel =
    planKey === "standard"
      ? m.pricing.plans.standard.name
      : planKey === "pro"
        ? m.pricing.plans.pro.name
        : planKey === "master"
          ? m.pricing.plans.master.name
          : planKey === "custom"
            ? m.pricing.plans.custom.name
            : m.pricing.plans.free.name;

  const balance = typeof user?.creditBalance === "number" ? user.creditBalance : null;
  const renewsAt =
    user?.planRenewsAt != null
      ? formatDate(
          typeof user.planRenewsAt === "string"
            ? user.planRenewsAt
            : new Date(user.planRenewsAt).toISOString(),
          locale,
        )
      : null;

  const pendingPlanKey = user?.pendingPlan ?? null;
  const pendingPlanLabel =
    pendingPlanKey === "standard"
      ? m.pricing.plans.standard.name
      : pendingPlanKey === "pro"
        ? m.pricing.plans.pro.name
        : pendingPlanKey === "master"
          ? m.pricing.plans.master.name
          : null;
  const pendingAt =
    user?.pendingPlanEffectiveAt != null
      ? formatDate(
          typeof user.pendingPlanEffectiveAt === "string"
            ? user.pendingPlanEffectiveAt
            : new Date(user.pendingPlanEffectiveAt).toISOString(),
          locale,
        )
      : null;

  function reasonLabel(reason: CreditReason): string {
    return a.reasons[reason] ?? reason;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto max-w-3xl px-6" style={{ paddingTop: 40, paddingBottom: 32 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={PRODUCT_LOGO_SRC} alt={PRODUCT_LOGO_ALT} className="h-10 w-10 rounded-xl object-contain" />
            <p className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</p>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LanguageToggle variant="light" />
            <Link
              href="/pricing"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {m.pricing.pricingLink}
            </Link>
            <AuthNav />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight">{a.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{a.subtitle}</p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">{a.loading}</p>
        ) : (
          <>
            <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.planLabel}</p>
                  <p className="mt-1 text-2xl font-semibold">{planLabel}</p>
                  {renewsAt ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {a.renewsLabel}: {renewsAt}
                    </p>
                  ) : null}
                  {pendingPlanLabel && pendingAt ? (
                    <p className="mt-2 text-sm text-amber-800">
                      {a.pendingDowngradeLabel}:{" "}
                      {a.pendingDowngradeBody
                        .replace("{plan}", pendingPlanLabel)
                        .replace("{date}", pendingAt)}
                    </p>
                  ) : null}
                  {user?.email ? (
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.balanceLabel}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {balance != null ? balance.toLocaleString() : "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{a.tokensUnit}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={portalBusy || !user?.stripeCustomerId}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  title={!user?.stripeCustomerId ? a.portalNeedSubscribe : undefined}
                >
                  {portalBusy ? a.portalRedirecting : a.manageBilling}
                </button>
                <Link
                  href="/pricing"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {a.viewPlans}
                </Link>
                <Link
                  href="/library"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {m.auth.libraryMenu}
                </Link>
              </div>
              {!user?.stripeCustomerId ? (
                <p className="mt-3 text-xs text-slate-500">{a.portalNeedSubscribe}</p>
              ) : null}
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-semibold tracking-tight">{a.historyTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{a.historySubtitle}</p>

              {txs.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">
                  {a.historyEmpty}
                </p>
              ) : (
                <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {txs.map((t) => {
                    const positive = t.delta > 0;
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{reasonLabel(t.reason)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(t.createdAt, locale)}</p>
                          {typeof t.meta?.invoiceId === "string" ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              {a.invoiceRef}: {t.meta.invoiceId}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold tabular-nums ${
                              positive ? "text-emerald-700" : "text-slate-800"
                            }`}
                          >
                            {positive ? "+" : ""}
                            {t.delta.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {a.balanceAfter}: {t.balanceAfter.toLocaleString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
