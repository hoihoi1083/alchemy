import type { WorkflowMode } from "@/lib/workflow-mode";
import {
  h3ShotRecipeNeedsLifestyleStill,
  isH3ShotRecipeMode,
} from "@/lib/h3-shot-recipes";

/** Step 1 — what the user wants to export. */
export type OutputGoal = WorkflowMode;

/** Image step — AI creates a new promo shot vs inspired by a reference ad. */
export type ImageCreativeMode = "promo-ai" | "reference-concept";

/** Video step — how motion is created. */
export type VideoCreativeMode =
  | "product-assistant"
  | "product-promo"
  | "motion-poster"
  | "impact-poster"
  | "social-drip"
  | "blockbuster"
  | "vacuum-inflate"
  | "creative-motion"
  | "hand-throw-scene"
  | "product-explode"
  | "ecom-orbit"
  | "object-lock"
  | "macro-snap"
  | "luxury-tabletop"
  | "beauty-mv"
  | "imitate-ad"
  | "neon-on-real"
  | "food-bullet-time"
  | "c4d-motion"
  | "h3-showreel"
  | "h3-sphere-mg"
  | "h3-logo-mg"
  | "h3-movie-title"
  | "h3-lifestyle"
  | "reference-concept"
  | "image-to-video";

export const IMAGE_CREATIVE_MODES: ImageCreativeMode[] = [
  "promo-ai",
  "reference-concept",
];

export const VIDEO_CREATIVE_MODES: VideoCreativeMode[] = [
  "product-assistant",
  "product-promo",
  "motion-poster",
  "impact-poster",
  "social-drip",
  "blockbuster",
  "vacuum-inflate",
  "creative-motion",
  "hand-throw-scene",
  "product-explode",
  "ecom-orbit",
  "object-lock",
  "macro-snap",
  "luxury-tabletop",
  "beauty-mv",
  "imitate-ad",
  "neon-on-real",
  "food-bullet-time",
  "c4d-motion",
  "h3-showreel",
  "h3-sphere-mg",
  "h3-logo-mg",
  "h3-movie-title",
  "h3-lifestyle",
  "reference-concept",
  "image-to-video",
];

export function videoModePreviewSrc(id: VideoCreativeMode): string {
  return `/images/studio/video-modes/${id}.png?v=3`;
}

/** Recipe owns the motion prompt — skip DeepSeek auto-plan. */
export function isRecipeOwnedVideoMode(
  mode: string | null | undefined,
): boolean {
  return (
    mode === "motion-poster" ||
    mode === "impact-poster" ||
    mode === "social-drip" ||
    mode === "blockbuster" ||
    mode === "vacuum-inflate" ||
    mode === "creative-motion" ||
    mode === "hand-throw-scene" ||
    mode === "product-explode" ||
    mode === "ecom-orbit" ||
    mode === "object-lock" ||
    mode === "macro-snap" ||
    mode === "luxury-tabletop" ||
    mode === "beauty-mv" ||
    mode === "imitate-ad" ||
    mode === "neon-on-real" ||
    mode === "food-bullet-time" ||
    mode === "c4d-motion" ||
    mode === "h3-showreel" ||
    mode === "h3-sphere-mg" ||
    mode === "h3-logo-mg" ||
    mode === "h3-movie-title" ||
    mode === "h3-lifestyle"
  );
}

/**
 * Dual-frame FX run MiniMax H3 first (native stereo). Seedance is fallback
 * only — that path is silent, so the wizard mixes library BGM after generate.
 * Always false here so generateVideo does not overlay pads on H3 audio.
 */
export function recipeUsesSilentSeedance(
  mode: string | null | undefined,
): boolean {
  if (!mode) return false;
  return false;
}

export function imageModePreviewSrc(id: ImageCreativeMode): string {
  return `/images/studio/image-modes/${id}.png?v=1`;
}

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

const H3_SHOT_PICKER_MODES: VideoCreativeMode[] = [
  "ecom-orbit",
  "object-lock",
  "macro-snap",
  "luxury-tabletop",
  "beauty-mv",
  "imitate-ad",
  "neon-on-real",
  "food-bullet-time",
  "c4d-motion",
  "h3-showreel",
  "h3-sphere-mg",
  "h3-logo-mg",
  "h3-movie-title",
  "h3-lifestyle",
];

function h3ShotPickerModesForPromotion(
  promotionMode: import("@/lib/promotion-mode").PromotionMode,
): VideoCreativeMode[] {
  if (promotionMode !== "concept") return [...H3_SHOT_PICKER_MODES];
  return H3_SHOT_PICKER_MODES.filter(
    (mode) =>
      !isH3ShotRecipeMode(mode) || !h3ShotRecipeNeedsLifestyleStill(mode),
  );
}

export function videoModesForGoal(goal: OutputGoal): VideoCreativeMode[] {
  if (goal === "combined") {
    return [
      "image-to-video",
      "motion-poster",
      "impact-poster",
      "blockbuster",
      "vacuum-inflate",
      "creative-motion",
      "hand-throw-scene",
      "product-explode",
      ...H3_SHOT_PICKER_MODES,
      "social-drip",
      "reference-concept",
      "product-promo",
    ];
  }
  if (goal === "video-only") {
    return [
      "product-assistant",
      "motion-poster",
      "impact-poster",
      "blockbuster",
      "vacuum-inflate",
      "creative-motion",
      "hand-throw-scene",
      "product-explode",
      ...H3_SHOT_PICKER_MODES,
      "social-drip",
      "product-promo",
      "reference-concept",
    ];
  }
  return [];
}

/** Concept promos skip product-photo assistant; hide lifestyle-weak H3 paths. */
export function videoModesForStudio(
  promotionMode: import("@/lib/promotion-mode").PromotionMode,
  goal: OutputGoal,
): VideoCreativeMode[] {
  const modes = videoModesForGoal(goal);
  if (promotionMode !== "concept") return modes;
  const h3Modes = h3ShotPickerModesForPromotion("concept");
  if (goal === "video-only") {
    return [
      "product-promo",
      "motion-poster",
      "impact-poster",
      "blockbuster",
      "vacuum-inflate",
      "creative-motion",
      "hand-throw-scene",
      "product-explode",
      ...h3Modes,
      "social-drip",
      "reference-concept",
    ];
  }
  if (goal === "combined") {
    return [
      "image-to-video",
      "motion-poster",
      "impact-poster",
      "blockbuster",
      "vacuum-inflate",
      "creative-motion",
      "hand-throw-scene",
      "product-explode",
      ...h3Modes,
      "social-drip",
      "product-promo",
      "reference-concept",
    ];
  }
  return modes;
}
