/**
 * Path UX gates + briefing IDs for H3 shot recipes and locked image posters
 * (paths shipped in the recent H3 / poster pass).
 *
 * Concept policy: almost every path can run if the user supplies a lockable
 * subject (product, logo, mascot, face, food photo, or reel). We do not hide
 * paths — we state what to upload in Need / Attention. Exception: parts-poster
 * (exploded SKU) stays physical-only.
 */

import {
  H3_SHOT_RECIPE_MODES,
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

export type RecipePathUxMode = H3ShotRecipeMode | ImagePosterUxStyleId;

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

export function isRecipePathUxMode(
  id: string | null | undefined,
): id is RecipePathUxMode {
  return isH3ShotRecipeMode(id) || isImagePosterUxStyle(id);
}

/** H3 modes offered in the wizard / landing for this promotion mode. */
export function h3ShotModesForPromotion(
  _promotionMode: PromotionMode,
): readonly H3ShotRecipeMode[] {
  // Concept can use logo/mascot/face/food as the lock — show the full set.
  return H3_SHOT_RECIPE_MODES;
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
  /** Concept-only: brand logo URL, packaging, or Nano Banana still already on imageUrl */
  hasConceptHero: boolean;
};

/**
 * Whether Generate may unlock for an H3 recipe.
 * Physical: uploaded product photo required (+ reel for imitate/neon).
 * Concept: logo / packaging / still hero OK (+ reel when needed).
 * neon-on-real (both): real MP4 is enough; logo/mascot still is optional identity.
 */
export function h3ShotRecipeInputsReady(input: H3ShotGenerateGateInput): boolean {
  if (!isH3ShotRecipeMode(input.mode)) return false;
  if (!isH3ShotAllowedForPromotion(input.mode, input.promotionMode)) return false;
  if (h3ShotRecipeNeedsReel(input.mode) && !input.hasReferenceVideo) return false;
  // neon-on-real: MP4 is the scene; still/logo/mascot optional on product + concept.
  if (input.mode === "neon-on-real") return true;
  if (input.promotionMode === "physical") {
    return input.hasProductPhoto;
  }
  return input.hasProductPhoto || input.hasConceptHero;
}

export type RecipePathUxCopy = {
  need: string[];
  attention: string[];
  output: string[];
};
