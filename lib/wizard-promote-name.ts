import type { PromotionMode } from "@/lib/promotion-mode";

/** What the user is promoting — product SKU (physical) or topic/headline (concept). */
export function wizardPromoteName(input: {
  promotionMode: PromotionMode;
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): string {
  const product = input.product?.trim() ?? "";
  const headline = input.headline?.trim() ?? "";
  const conceptIdea = input.conceptIdea?.trim() ?? "";
  if (input.promotionMode === "concept") {
    return headline || conceptIdea || product;
  }
  return product;
}
