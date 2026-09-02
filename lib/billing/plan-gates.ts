import type { TemplateId } from "@/lib/templates";
import type { ImageResolutionCap, VideoResolutionCap } from "@/lib/billing/entitlements";
import { PLAN_DEFINITIONS, type UserPlan } from "@/lib/billing/plans";

/** Higher number = higher tier. */
const PLAN_RANK: Record<UserPlan, number> = {
  free: 0,
  light: 1,
  standard: 2,
  pro: 3,
  master: 4,
  custom: 5,
};

export type PlanGateFeature =
  | "video_720p"
  | "video_1080p"
  | "image_2k"
  | "pro_canvas"
  | "priority_queue"
  | "email_support"
  | "top_up"
  | "campaign_mode"
  | "carousel_mode"
  | "platform_research"
  | "storyboard"
  | "template";

export function planRank(plan: UserPlan): number {
  return PLAN_RANK[plan];
}

export function planMeetsMinimum(userPlan: UserPlan, required: UserPlan): boolean {
  return planRank(userPlan) >= planRank(required);
}

export function minPlanForVideoResolution(res: VideoResolutionCap): UserPlan {
  if (res === "1080p") return "pro";
  if (res === "720p") return "standard";
  return "free";
}

export function minPlanForImageResolution(res: ImageResolutionCap): UserPlan {
  if (res === "4K" || res === "2K") return "master";
  return "free";
}

export function canUseImageResolution(plan: UserPlan, res: ImageResolutionCap): boolean {
  return planMeetsMinimum(plan, minPlanForImageResolution(res));
}

export function minPlanForFeature(feature: PlanGateFeature): UserPlan {
  switch (feature) {
    case "video_720p":
      return "standard";
    case "video_1080p":
      return "pro";
    case "image_2k":
      return "master";
    case "pro_canvas":
      return "master";
    case "priority_queue":
      return "pro";
    case "email_support":
      return "light";
    case "top_up":
      return "light";
    case "campaign_mode":
    case "carousel_mode":
    case "platform_research":
      return "standard";
    case "storyboard":
      return "pro";
    case "template":
      return "free";
    default:
      return "free";
  }
}

export function canUseCarousel(plan: UserPlan): boolean {
  return planMeetsMinimum(plan, minPlanForFeature("carousel_mode"));
}

export function canUsePlatformResearch(plan: UserPlan): boolean {
  return planMeetsMinimum(plan, minPlanForFeature("platform_research"));
}

export function canUseStoryboard(plan: UserPlan): boolean {
  return planMeetsMinimum(plan, minPlanForFeature("storyboard"));
}

export function canUseVideoResolution(plan: UserPlan, res: VideoResolutionCap): boolean {
  return planMeetsMinimum(plan, minPlanForVideoResolution(res));
}

export function hasPriorityQueue(plan: UserPlan): boolean {
  return planMeetsMinimum(plan, "pro");
}

export function hasEmailSupport(plan: UserPlan): boolean {
  return planMeetsMinimum(plan, "light");
}

/** Minimum plan to start a template (unlisted = free). */
export const TEMPLATE_MIN_PLAN: Partial<Record<TemplateId, UserPlan>> = {
  "product-reel": "free",
  "paper-sticker-reel": "free",
  "info-poster": "free",
  "designed-poster": "free",
  "shop-promo": "light",
  "service-promo": "light",
  "testimonial": "light",
  "pricing-offer": "light",
  "brand-campaign": "standard",
  "storyboard-video": "pro",
  "parts-poster": "standard",
  "creative-video": "pro",
  "brand-video": "pro",
  "model-wear-reel": "pro",
  "ugc-presenter-reel": "pro",
  "crystal-promo": "pro",
  "gaming-cover": "pro",
  "sports-big-words": "pro",
  "jelly-3d": "pro",
  "brand-fit": "pro",
  "website-launch": "pro",
  "explosion-unbox-reel": "pro",
};

export function minPlanForTemplate(templateId: TemplateId): UserPlan {
  return TEMPLATE_MIN_PLAN[templateId] ?? "free";
}

export function canUseTemplate(plan: UserPlan, templateId: TemplateId): boolean {
  return planMeetsMinimum(plan, minPlanForTemplate(templateId));
}

/** i18n key under `pricing.plans.*.name` (Enterprise = custom). */
export function pricingPlanI18nKey(plan: UserPlan): keyof typeof PLAN_DEFINITIONS {
  return plan;
}
