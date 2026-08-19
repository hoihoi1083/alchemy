import { PLAN_DEFINITIONS, type UserPlan } from "@/lib/billing/plans";

export type PaidPlan = "standard" | "pro" | "master" | "custom";
export type BillingInterval = "monthly" | "yearly";

export type CheckoutKind = "subscription" | "topup";

const PAID_PLANS: PaidPlan[] = ["standard", "pro", "master", "custom"];

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
  return PLAN_DEFINITIONS[plan]?.monthlyTokens ?? 0;
}

/** Higher number = higher tier (used to decide upgrade vs downgrade). */
export function paidPlanRank(plan: PaidPlan): number {
  if (plan === "standard") return 1;
  if (plan === "pro") return 2;
  if (plan === "master") return 3;
  return 4; // custom / Enterprise
}

export type PlanChangeKind = "upgrade" | "downgrade" | "lateral";

/**
 * Compare paid plan tiers only (interval monthly↔yearly is lateral).
 * Upgrades apply immediately and reset the billing cycle; downgrades are
 * deferred to the next cycle.
 */
export function comparePaidPlans(from: PaidPlan, to: PaidPlan): PlanChangeKind {
  const a = paidPlanRank(from);
  const b = paidPlanRank(to);
  if (b > a) return "upgrade";
  if (b < a) return "downgrade";
  return "lateral";
}
