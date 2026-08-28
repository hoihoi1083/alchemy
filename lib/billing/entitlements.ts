import {
  PLAN_DEFINITIONS,
  type UserPlan,
} from "@/lib/billing/plans";

export type VideoResolutionCap = "480p" | "720p" | "1080p";
export type ImageResolutionCap = "1K" | "2K" | "4K";

const VIDEO_RANK: Record<VideoResolutionCap, number> = {
  "480p": 0,
  "720p": 1,
  "1080p": 2,
};

const IMAGE_RANK: Record<ImageResolutionCap, number> = {
  "1K": 0,
  "2K": 1,
  "4K": 2,
};

export function videoCapForPlan(plan: UserPlan): VideoResolutionCap {
  return PLAN_DEFINITIONS[plan].maxVideoResolution;
}

export function imageCapForPlan(plan: UserPlan): ImageResolutionCap {
  return PLAN_DEFINITIONS[plan].maxImageResolution;
}

export const VIDEO_RESOLUTION_CAPS: VideoResolutionCap[] = ["480p", "720p", "1080p"];
/** Studio UI offers 1K / 2K (4K reserved; no plan currently unlocks it). */
export const IMAGE_RESOLUTION_CAPS: ImageResolutionCap[] = ["1K", "2K"];
const ALL_IMAGE_CAPS: ImageResolutionCap[] = ["1K", "2K", "4K"];

/** Resolutions the UI may offer for this plan (inclusive of lower tiers). */
export function videoResolutionsForPlan(plan: UserPlan): VideoResolutionCap[] {
  const max = videoCapForPlan(plan);
  return VIDEO_RESOLUTION_CAPS.filter((r) => VIDEO_RANK[r] <= VIDEO_RANK[max]);
}

export function imageResolutionsForPlan(plan: UserPlan): ImageResolutionCap[] {
  const max = imageCapForPlan(plan);
  return ALL_IMAGE_CAPS.filter((r) => IMAGE_RANK[r] <= IMAGE_RANK[max]);
}

export function canUseProCanvas(plan: UserPlan): boolean {
  return PLAN_DEFINITIONS[plan].proCanvas;
}

/** Normalize client video resolution to a known tier. */
export function parseVideoResolutionTier(raw: string): VideoResolutionCap {
  const r = raw.toLowerCase();
  if (r.includes("1080") || r.includes("4k")) return "1080p";
  if (r.includes("480") || r.includes("360") || r.includes("540")) return "480p";
  return "720p";
}

export function parseImageResolutionTier(raw: string): ImageResolutionCap {
  const r = raw.trim().toUpperCase();
  if (r === "4K" || r.includes("4K")) return "4K";
  if (r === "2K" || r.includes("2K")) return "2K";
  return "1K";
}

/**
 * Clamp requested video resolution down to the plan max.
 * Preserves non-standard strings only after tier clamp (e.g. keep "720p").
 */
export function clampVideoResolution(plan: UserPlan, requested: string): {
  resolution: string;
  capped: boolean;
  max: VideoResolutionCap;
} {
  const max = videoCapForPlan(plan);
  const requestedTier = parseVideoResolutionTier(requested);
  if (VIDEO_RANK[requestedTier] <= VIDEO_RANK[max]) {
    return { resolution: requested.trim() || max, capped: false, max };
  }
  return { resolution: max, capped: true, max };
}

/** UI / form resolution after plan clamp (Free → 480p). */
export function capUiVideoResolution(
  plan: UserPlan,
  requested: string,
): VideoResolutionCap {
  return parseVideoResolutionTier(clampVideoResolution(plan, requested).resolution);
}

export function clampImageResolution(plan: UserPlan, requested?: string | null): {
  resolution: ImageResolutionCap;
  capped: boolean;
  max: ImageResolutionCap;
} {
  const max = imageCapForPlan(plan);
  const requestedTier = requested?.trim()
    ? parseImageResolutionTier(requested)
    : max; // default to plan max so paid users get what they pay for
  if (IMAGE_RANK[requestedTier] <= IMAGE_RANK[max]) {
    return { resolution: requestedTier, capped: false, max };
  }
  return { resolution: max, capped: true, max };
}

export class PlanEntitlementError extends Error {
  readonly status = 403;
  readonly code = "PLAN_ENTITLEMENT";

  constructor(message: string) {
    super(message);
    this.name = "PlanEntitlementError";
  }
}

export function assertProCanvasAllowed(plan: UserPlan): void {
  if (!canUseProCanvas(plan)) {
    throw new PlanEntitlementError(
      "Ultra canvas requires the Master plan. Upgrade on Pricing to unlock.",
    );
  }
}
