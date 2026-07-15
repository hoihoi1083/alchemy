import type { UserPlan } from "@/lib/billing/plans";

export type PaidPlan = "standard" | "pro" | "master";
export type BillingInterval = "monthly" | "yearly";

export type CheckoutKind = "subscription" | "topup";

const PAID_PLANS: PaidPlan[] = ["standard", "pro", "master"];

function envPrice(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

/** Map plan + interval → Stripe Price ID from env. */
export function priceIdForPlan(plan: PaidPlan, interval: BillingInterval): string | null {
  const key =
    interval === "monthly"
      ? `STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY`
      : `STRIPE_PRICE_${plan.toUpperCase()}_YEARLY`;
  return envPrice(key);
}

export function topUpPriceId(): string | null {
  return envPrice("STRIPE_PRICE_TOPUP");
}

export function isPaidPlan(value: string): value is PaidPlan {
  return (PAID_PLANS as string[]).includes(value);
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

/** Reverse-lookup plan from a Price ID (webhook sync). */
export function planFromPriceId(priceId: string): {
  plan: PaidPlan;
  interval: BillingInterval;
} | null {
  for (const plan of PAID_PLANS) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (priceIdForPlan(plan, interval) === priceId) {
        return { plan, interval };
      }
    }
  }
  return null;
}

export function monthlyTokensForPlan(plan: UserPlan): number {
  if (plan === "standard") return 3000;
  if (plan === "pro") return 8000;
  if (plan === "master") return 16000;
  return 0;
}
