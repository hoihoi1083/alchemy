/**
 * Subscription plans — aligned with /pricing UI.
 * Token COGS: sized so Master yearly still yields ~75% gross vs fal.
 * 1,000 tokens ≈ USD 1.23 operator fal COGS (≈ USD 0.001234 / token).
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
  /** Nano Banana output resolution cap (aligned with /pricing). */
  maxImageResolution: "1K" | "2K" | "4K";
  proCanvas: boolean;
  /** Paid subscribers can buy $10 / 1,000 token packs. */
  canTopUp: boolean;
};

/**
 * 1,000 tokens ≈ USD 1.234375 operator fal COGS
 * (= 25% of Master yearly $79 / 16,000).
 */
export const TOKEN_COGS_USD_PER_1000 = 1.234375;

export const TOP_UP_TOKENS = 1000;
export const TOP_UP_PRICE_USD = 10;

/** Free signup grant — once only. Covers 1× image (65) + 8s 480P video (328) + buffer. */
export const FREE_SIGNUP_GRANT_TOKENS = 500;

export const PLAN_DEFINITIONS: Record<UserPlan, PlanDefinition> = {
  free: {
    id: "free",
    monthlyTokens: FREE_SIGNUP_GRANT_TOKENS,
    grantCogsUsd: 0.62,
    listPriceUsd: null,
    monthlyPriceUsd: 0,
    yearlyPriceUsd: null,
    maxVideoResolution: "480p",
    maxImageResolution: "1K",
    proCanvas: false,
    canTopUp: false,
  },
  standard: {
    id: "standard",
    monthlyTokens: 3000,
    grantCogsUsd: 3.7,
    listPriceUsd: 29.99,
    monthlyPriceUsd: 19.99,
    yearlyPriceUsd: 14.99,
    maxVideoResolution: "720p",
    maxImageResolution: "1K",
    proCanvas: false,
    canTopUp: true,
  },
  pro: {
    id: "pro",
    monthlyTokens: 8000,
    grantCogsUsd: 9.88,
    listPriceUsd: 79.99,
    monthlyPriceUsd: 49.99,
    yearlyPriceUsd: 39.99,
    maxVideoResolution: "1080p",
    maxImageResolution: "1K",
    proCanvas: false,
    canTopUp: true,
  },
  master: {
    id: "master",
    monthlyTokens: 16000,
    grantCogsUsd: 19.75,
    listPriceUsd: 159.99,
    monthlyPriceUsd: 99.99,
    yearlyPriceUsd: 79.0,
    maxVideoResolution: "1080p",
    maxImageResolution: "2K",
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
    maxImageResolution: "2K",
    proCanvas: true,
    canTopUp: true,
  },
};

export function marginPct(priceUsd: number, cogsUsd: number): number {
  if (priceUsd <= 0) return 0;
  return Math.round(((priceUsd - cogsUsd) / priceUsd) * 1000) / 10;
}
