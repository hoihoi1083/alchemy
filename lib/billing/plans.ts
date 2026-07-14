/**
 * Subscription plans — aligned with /pricing UI.
 * Token COGS anchor: 1,000 tokens ≈ USD 3.30 (≈ USD 0.0033 / token).
 */
export type UserPlan = "free" | "standard" | "pro" | "master" | "custom";

export const LEGACY_PLAN_MAP: Record<string, UserPlan> = {
  free: "free",
  pro: "pro",
  payg: "standard", // legacy one-off → treat as Standard-tier entitlements
  standard: "standard",
  master: "master",
  custom: "custom",
};

export function normalizeUserPlan(raw: unknown): UserPlan {
  if (typeof raw !== "string") return "free";
  return LEGACY_PLAN_MAP[raw] ?? "free";
}

export type PlanDefinition = {
  id: UserPlan;
  /** Tokens granted once at signup (Free) or each billing period (paid). */
  monthlyTokens: number;
  /** Approximate COGS if the full grant is consumed (USD). */
  grantCogsUsd: number;
  listPriceUsd: number | null;
  monthlyPriceUsd: number | null;
  yearlyPriceUsd: number | null;
  maxVideoResolution: "480p" | "720p" | "1080p";
  proCanvas: boolean;
  /** Paid subscribers can buy $10 / 1,000 token packs. */
  canTopUp: boolean;
};

/** 1,000 tokens ≈ USD 3.30 operator COGS. */
export const TOKEN_COGS_USD_PER_1000 = 3.3;

export const TOP_UP_TOKENS = 1000;
export const TOP_UP_PRICE_USD = 10;

/** Free signup grant — once only. */
export const FREE_SIGNUP_GRANT_TOKENS = 1000;

export const PLAN_DEFINITIONS: Record<UserPlan, PlanDefinition> = {
  free: {
    id: "free",
    monthlyTokens: FREE_SIGNUP_GRANT_TOKENS,
    grantCogsUsd: 3.3,
    listPriceUsd: null,
    monthlyPriceUsd: 0,
    yearlyPriceUsd: null,
    maxVideoResolution: "480p",
    proCanvas: false,
    canTopUp: false,
  },
  standard: {
    id: "standard",
    monthlyTokens: 3000,
    grantCogsUsd: 9.9,
    listPriceUsd: 29.99,
    monthlyPriceUsd: 19.99,
    yearlyPriceUsd: 14.99,
    maxVideoResolution: "720p",
    proCanvas: false,
    canTopUp: true,
  },
  pro: {
    id: "pro",
    monthlyTokens: 8000,
    grantCogsUsd: 26.4,
    listPriceUsd: 79.99,
    monthlyPriceUsd: 49.99,
    yearlyPriceUsd: 39.99,
    maxVideoResolution: "1080p",
    proCanvas: false,
    canTopUp: true,
  },
  master: {
    id: "master",
    monthlyTokens: 16000,
    grantCogsUsd: 52.8,
    listPriceUsd: 159.99,
    monthlyPriceUsd: 99.99,
    yearlyPriceUsd: 79.0,
    maxVideoResolution: "1080p",
    proCanvas: true,
    canTopUp: true,
  },
  custom: {
    id: "custom",
    monthlyTokens: 0,
    grantCogsUsd: 0,
    listPriceUsd: null,
    monthlyPriceUsd: null,
    yearlyPriceUsd: null,
    maxVideoResolution: "1080p",
    proCanvas: true,
    canTopUp: true,
  },
};

export function marginPct(priceUsd: number, cogsUsd: number): number {
  if (priceUsd <= 0) return 0;
  return Math.round(((priceUsd - cogsUsd) / priceUsd) * 1000) / 10;
}
