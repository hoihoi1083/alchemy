import type { WorkflowMode } from "@/lib/workflow-mode";

/** Step 1 — what the user wants to export. */
export type OutputGoal = WorkflowMode;

/** Image step — AI creates a new promo shot vs inspired by a reference ad. */
export type ImageCreativeMode = "promo-ai" | "reference-concept";

/** Video step — how motion is created. */
export type VideoCreativeMode =
  | "product-assistant"
  | "product-promo"
  | "reference-concept"
  | "image-to-video";

export const IMAGE_CREATIVE_MODES: ImageCreativeMode[] = [
  "promo-ai",
  "reference-concept",
];

export const VIDEO_CREATIVE_MODES: VideoCreativeMode[] = [
  "product-assistant",
  "product-promo",
  "reference-concept",
  "image-to-video",
];

export function defaultImageModeForGoal(goal: OutputGoal): ImageCreativeMode {
  if (goal === "image-only") return "reference-concept";
  return "promo-ai";
}

export function defaultVideoModeForGoal(goal: OutputGoal): VideoCreativeMode {
  if (goal === "combined") return "image-to-video";
  return "product-assistant";
}

export function defaultVideoModeForStudio(
  promotionMode: import("@/lib/promotion-mode").PromotionMode,
  goal: OutputGoal,
): VideoCreativeMode {
  if (promotionMode === "concept") {
    return goal === "combined" ? "image-to-video" : "product-promo";
  }
  return defaultVideoModeForGoal(goal);
}

export function videoModesForGoal(goal: OutputGoal): VideoCreativeMode[] {
  if (goal === "combined") {
    return ["image-to-video", "reference-concept", "product-promo"];
  }
  if (goal === "video-only") {
    return ["product-assistant", "product-promo", "reference-concept"];
  }
  return [];
}

/** Concept promos skip product-photo assistant; physical goods keep all modes. */
export function videoModesForStudio(
  promotionMode: import("@/lib/promotion-mode").PromotionMode,
  goal: OutputGoal,
): VideoCreativeMode[] {
  const modes = videoModesForGoal(goal);
  if (promotionMode !== "concept") return modes;
  if (goal === "video-only") return ["product-promo", "reference-concept"];
  if (goal === "combined") return ["image-to-video", "product-promo", "reference-concept"];
  return modes;
}
