"use client";

import Link from "next/link";
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
  const insufficient = isInsufficientTokensMessage(message, m.errors.insufficientTokens);
  const tvcPaid =
    message.trim() === m.errors.tvcNeedsPaidPlan.trim() ||
    /12s minimax h3|12 秒 minimax h3/i.test(message);

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
          <div className="mt-5 flex flex-wrap items-center gap-3">
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
  const primary = notCharged
    ? message.replace(m.errors.tokensNotCharged, "").trim()
    : message;

  return (
    <div className={classes} role="alert">
      <p>{primary}</p>
      {notCharged ? (
        <p
          className={
            variant === "dark"
              ? "mt-1.5 text-xs font-medium text-emerald-300/90"
              : "mt-1.5 text-xs font-medium text-emerald-800"
          }
        >
          {m.errors.tokensNotCharged}
        </p>
      ) : null}
    </div>
  );
}
