import type { LandingCapacityPlan } from "@/lib/billing/token-costs";
import { estimatePlanApproxCapacity } from "@/lib/billing/token-costs";

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

/**
 * Free is the signup pack (1 image + 1× 8s 480p together).
 * Paid cards stay “if you spend the grant on one format”.
 */
export function estimatePricingCardCapacity(plan: LandingCapacityPlan): {
  images: number;
  videos8s: number;
  packTogether: boolean;
} {
  if (plan === "free") {
    return { images: 1, videos8s: 1, packTogether: true };
  }
  const c = estimatePlanApproxCapacity(plan);
  return {
    images: c.approxImages,
    videos8s: c.approxVideos8s,
    packTogether: false,
  };
}

export function pricingCardCapacityItems(
  plan: LandingCapacityPlan,
  copy: PricingCardCapacityCopy,
): PricingCardCapacityItem[] {
  const c = estimatePricingCardCapacity(plan);
  if (c.packTogether) {
    return [
      { kind: "images", label: copy.capacityFreeImages },
      { kind: "videos", label: copy.capacityFreeVideos },
    ];
  }
  return [
    {
      kind: "images",
      label: copy.capacityImagesFeature.replace("{n}", String(c.images)),
    },
    {
      kind: "videos",
      label: copy.capacityVideosFeature.replace("{n}", String(c.videos8s)),
    },
  ];
}
