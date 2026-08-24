"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";

type WizardErrorBannerProps = {
  message: string;
  variant?: "light" | "dark";
  onDismiss?: () => void;
};

function isInsufficientTokensMessage(message: string, localized: string): boolean {
  const m = message.trim().toLowerCase();
  if (!m) return false;
  if (message.trim() === localized.trim()) return true;
  return (
    m.includes("not enough tokens") ||
    m.includes("insufficient_tokens") ||
    m.includes("token 不足") ||
    m.includes("tokens for this generation")
  );
}

export function WizardErrorBanner({
  message,
  variant = "light",
  onDismiss,
}: WizardErrorBannerProps) {
  const { m } = useLocale();
  const [trialBusy, setTrialBusy] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const insufficient = isInsufficientTokensMessage(message, m.errors.insufficientTokens);
  const tvcPaid =
    message.trim() === m.errors.tvcNeedsPaidPlan.trim() ||
    /12s single-clip|12 秒單鏡|12 秒单镜/i.test(message);

  async function startProTrial() {
    setTrialError(null);
    setTrialBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "pro_trial" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? m.errors.proTrialStartError);
      }
      window.location.href = data.url;
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : m.errors.proTrialStartError);
      setTrialBusy(false);
    }
  }

  if (insufficient || tvcPaid) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insufficient-tokens-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2
            id="insufficient-tokens-title"
            className="text-lg font-semibold text-slate-900"
          >
            {tvcPaid ? m.errors.tvcNeedsPaidPlanTitle : m.errors.insufficientTokensTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {tvcPaid ? m.errors.tvcNeedsPaidPlan : m.errors.insufficientTokens}
          </p>
          {!tvcPaid ? (
            <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-sm text-violet-900">
              {m.errors.proTrialOfferBody}
            </p>
          ) : null}
          {trialError ? (
            <p className="mt-2 text-sm text-red-600">{trialError}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!tvcPaid ? (
              <button
                type="button"
                disabled={trialBusy}
                onClick={() => void startProTrial()}
                className="inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {trialBusy ? m.errors.proTrialStarting : m.errors.proTrialCta}
              </button>
            ) : null}
            <Link
              href="/pricing"
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {m.errors.insufficientTokensCta}
            </Link>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {m.errors.insufficientTokensDismiss}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const classes =
    variant === "dark"
      ? "rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
      : "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800";

  const notCharged = message.includes(m.errors.tokensNotCharged);

  return (
    <div className={classes} role="alert">
      <p>{message}</p>
      {notCharged ? null : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-xs font-medium underline opacity-80"
        >
          {m.errors.insufficientTokensDismiss}
        </button>
      ) : null}
    </div>
  );
}
