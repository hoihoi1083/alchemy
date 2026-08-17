import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import type { LandingCapacityPlan } from "@/lib/billing/token-costs";
import { H3_TOKENS_PER_SEC, TOKEN_COST } from "@/lib/billing/token-costs";

export type PricingCardCapacityItem = {
  kind: "images" | "videos";
  label: string;
};

export type PricingCardCapacityCopy = {
  capacityFreeImages: string;
  capacityFreeVideos: string;
  capacityImagesFeature: string;
  capacityVideosFeature: string;
};

/** 8s at the lowest studio video resolution (480P) — used for “up to” video counts. */
export const PRICING_CARD_VIDEO_8S_TOKENS = H3_TOKENS_PER_SEC["480P"] * 8; // 328

/**
 * Independent maxima for pricing cards: 1K stills, or 8s 480p video.
 * Higher resolution / mixing formats uses more tokens per piece.
 */
export function estimatePricingCardCapacity(plan: LandingCapacityPlan): {
  images: number;
  videos8s: number;
} {
  const tokens = PLAN_DEFINITIONS[plan].monthlyTokens;
  return {
    images: Math.max(0, Math.floor(tokens / TOKEN_COST.image)),
    videos8s: Math.max(0, Math.floor(tokens / PRICING_CARD_VIDEO_8S_TOKENS)),
  };
}

export function pricingCardCapacityItems(
  plan: LandingCapacityPlan,
  copy: PricingCardCapacityCopy,
): PricingCardCapacityItem[] {
  const c = estimatePricingCardCapacity(plan);
  const imageTpl =
    plan === "free" ? copy.capacityFreeImages : copy.capacityImagesFeature;
  const videoTpl =
    plan === "free" ? copy.capacityFreeVideos : copy.capacityVideosFeature;
  return [
    {
      kind: "images",
      label: imageTpl.replace("{n}", String(c.images)),
    },
    {
      kind: "videos",
      label: videoTpl.replace("{n}", String(c.videos8s)),
    },
  ];
}
