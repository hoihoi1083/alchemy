"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import type { UserPlan } from "@/lib/billing/plans";
import { pricingPlanI18nKey } from "@/lib/billing/plan-gates";

type PlanGateDialogProps = {
  open: boolean;
  onClose: () => void;
  requiredPlan: UserPlan;
  /** Short feature label, e.g. "1080p video" or template name */
  featureLabel: string;
};

function planDisplayName(
  plan: UserPlan,
  names: {
    free: string;
    light: string;
    standard: string;
    pro: string;
    master: string;
    custom: string;
  },
): string {
  const key = pricingPlanI18nKey(plan);
  if (key === "custom") return names.custom;
  return names[key];
}

export function PlanGateDialog({
  open,
  onClose,
  requiredPlan,
  featureLabel,
}: PlanGateDialogProps) {
  const { m } = useLocale();
  if (!open) return null;

  const planName = planDisplayName(requiredPlan, {
    free: m.pricing.plans.free.name,
    light: m.pricing.plans.light.name,
    standard: m.pricing.plans.standard.name,
    pro: m.pricing.plans.pro.name,
    master: m.pricing.plans.master.name,
    custom: m.pricing.plans.custom.name,
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-gate-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="plan-gate-title" className="text-lg font-semibold text-slate-900">
          {m.planGate.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {m.planGate.body
            .replace("{feature}", featureLabel)
            .replace("{plan}", planName)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/pricing?plan=${requiredPlan === "custom" ? "custom" : requiredPlan}`}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            onClick={onClose}
          >
            {m.planGate.cta.replace("{plan}", planName)}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {m.planGate.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
