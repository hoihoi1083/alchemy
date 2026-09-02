/**
 * Path UX gates + briefing IDs for H3 shot recipes and locked image posters
 * (paths shipped in the recent H3 / poster pass).
 *
 * Concept policy: offer paths that lock from logo / mascot / brand still / reel.
 * Hide lifestyle-still paths (food-bullet-time, h3-lifestyle) — they need a real
 * person+subject photo and are weak with logo-only. parts-poster stays physical-only.
 */

import {
  H3_SHOT_RECIPE_MODES,
  h3ShotRecipeNeedsLifestyleStill,
  h3ShotRecipeNeedsReel,
  isH3ShotRecipeMode,
  type H3ShotRecipeMode,
} from "@/lib/h3-shot-recipes";
import { isLockedSinglePosterStyle, type VisualStyleId } from "@/lib/visual-styles";
import type { PromotionMode } from "@/lib/promotion-mode";

export const IMAGE_POSTER_UX_STYLE_IDS = [
  "designed-poster",
  "parts-poster",
  "gaming-cover",
  "sports-big-words",
  "jelly-3d",
] as const;

export type ImagePosterUxStyleId = (typeof IMAGE_POSTER_UX_STYLE_IDS)[number];

/** Image posters offered on concept (logo / mascot / brand mark OK). */
export const CONCEPT_IMAGE_POSTER_STYLE_IDS = [
  "designed-poster",
  "gaming-cover",
  "sports-big-words",
  "jelly-3d",
] as const;

export type ConceptImagePosterStyleId =
  (typeof CONCEPT_IMAGE_POSTER_STYLE_IDS)[number];

/** Morph / gag recipes that must lock the uploaded SKU — text-only is not enough. */
export const IDENTITY_VIDEO_UX_MODES = [
  "vacuum-inflate",
  "creative-motion",
  "hand-throw-scene",
  "web-boundary-break",
  "product-explode",
  "bullet-product-elevate",
] as const;

export type IdentityVideoUxMode = (typeof IDENTITY_VIDEO_UX_MODES)[number];

/** Non-H3 video recipes that get Need / Attention / Output cards. */
export const VIDEO_RECIPE_UX_MODES = [
  ...IDENTITY_VIDEO_UX_MODES,
  "motion-poster",
  "impact-poster",
  "social-drip",
  "blockbuster",
] as const;

export type VideoRecipeUxMode = (typeof VIDEO_RECIPE_UX_MODES)[number];

export type RecipePathUxMode =
  | H3ShotRecipeMode
  | ImagePosterUxStyleId
  | VideoRecipeUxMode;

export function isImagePosterUxStyle(
  id: string | null | undefined,
): id is ImagePosterUxStyleId {
  return (IMAGE_POSTER_UX_STYLE_IDS as readonly string[]).includes(id ?? "");
}

export function isConceptImagePosterStyle(
  id: string | null | undefined,
): id is ConceptImagePosterStyleId {
  return (CONCEPT_IMAGE_POSTER_STYLE_IDS as readonly string[]).includes(id ?? "");
}

export function isIdentityVideoRecipeMode(
  id: string | null | undefined,
): id is IdentityVideoUxMode {
  return (IDENTITY_VIDEO_UX_MODES as readonly string[]).includes(id ?? "");
}

export function isVideoRecipeUxMode(
  id: string | null | undefined,
): id is VideoRecipeUxMode {
  return (VIDEO_RECIPE_UX_MODES as readonly string[]).includes(id ?? "");
}

export function isRecipePathUxMode(
  id: string | null | undefined,
): id is RecipePathUxMode {
  return (
    isH3ShotRecipeMode(id) || isImagePosterUxStyle(id) || isVideoRecipeUxMode(id)
  );
}

/** H3 modes offered in the wizard / landing for this promotion mode. */
export function h3ShotModesForPromotion(
  promotionMode: PromotionMode,
): readonly H3ShotRecipeMode[] {
  if (promotionMode === "physical") return H3_SHOT_RECIPE_MODES;
  // Concept: hide lifestyle-still paths (need person+subject photo; logo is weak).
  return H3_SHOT_RECIPE_MODES.filter(
    (mode) => !h3ShotRecipeNeedsLifestyleStill(mode),
  );
}

export function isH3ShotAllowedForPromotion(
  mode: string | null | undefined,
  promotionMode: PromotionMode,
): boolean {
  if (!isH3ShotRecipeMode(mode)) return false;
  return h3ShotModesForPromotion(promotionMode).includes(mode);
}

/** Physical (product) H3 / posters always need an uploaded product or lifestyle photo. */
export function requiresProductPhotoPhysical(
  mode: RecipePathUxMode | string | null | undefined,
): boolean {
  if (isIdentityVideoRecipeMode(mode)) return true;
  if (isH3ShotRecipeMode(mode)) return true;
  if (isImagePosterUxStyle(mode)) return true;
  if (mode && isLockedSinglePosterStyle(mode as VisualStyleId)) return true;
  return false;
}

export type H3ShotGenerateGateInput = {
  mode: string | null | undefined;
  promotionMode: PromotionMode;
  hasProductPhoto: boolean;
  hasReferenceVideo: boolean;
  /**
   * Concept visual lock: brand logo URL, packaging photo, or Nano Banana still
   * already on imageUrl. Do not pass text-only brief/headline here.
   */
  hasConceptHero: boolean;
  /**
   * Lifestyle paths: uploaded photo or generated still (imageUrl).
   * Logo-only does not count.
   */
  hasLifestyleStill?: boolean;
};

/**
 * Whether Generate may unlock for an H3 recipe.
 * Physical: uploaded product photo required (+ reel for imitate/neon/showreel).
 * Concept: logo / packaging / still hero OK (+ reel when needed).
 * Lifestyle (food-bullet-time / h3-lifestyle): need person+subject still
 * (upload or Nano Banana) — logo alone is not enough on product or concept.
 * neon-on-real (both): real MP4 is enough; logo/mascot still is optional identity.
 */
export function h3ShotRecipeInputsReady(input: H3ShotGenerateGateInput): boolean {
  if (!isH3ShotRecipeMode(input.mode)) return false;
  if (!isH3ShotAllowedForPromotion(input.mode, input.promotionMode)) return false;
  if (h3ShotRecipeNeedsReel(input.mode) && !input.hasReferenceVideo) return false;
  // neon-on-real: MP4 is the scene; still/logo/mascot optional on product + concept.
  if (input.mode === "neon-on-real") return true;
  if (h3ShotRecipeNeedsLifestyleStill(input.mode)) {
    return Boolean(input.hasProductPhoto || input.hasLifestyleStill);
  }
  if (input.promotionMode === "physical") {
    return input.hasProductPhoto;
  }
  return input.hasProductPhoto || input.hasConceptHero;
}

export type IdentityRecipeHeroInput = {
  promotionMode: PromotionMode;
  hasProductPhoto: boolean;
  /** Logo / packaging / still / persistable preview — not text. */
  hasConceptHero: boolean;
};

/** Vacuum / creative-motion / hand-throw / explode — never unlock from headline/topic alone. */
export function identityRecipeHeroReady(input: IdentityRecipeHeroInput): boolean {
  if (input.hasProductPhoto) return true;
  if (input.promotionMode === "physical") return false;
  return input.hasConceptHero;
}

export type RecipePathUxCopy = {
  need: string[];
  attention: string[];
  output: string[];
};
