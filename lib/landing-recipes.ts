/**
 * Landing / deep-link recipes — finishable shot recipes (not marketing template IDs).
 * /studio?mode=physical|concept&recipe=motion-poster|product-tvc-12s|concept-…
 */

import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { VideoCreativeMode } from "@/lib/creative-workflow";
import type { StoryboardSceneCount } from "@/lib/ad-pack-preferences";
import type { VideoDuration } from "@/lib/video-settings";
import { DEFAULT_STORYBOARD_SCENE_COUNT } from "@/lib/shot-recipes";
import type { MicroWizardContext } from "@/lib/wizard-micro-steps.types";
import {
  h3ShotRecipeToSubpath,
  isH3ShotRecipeMode,
  type H3ShotRecipeMode,
} from "@/lib/h3-shot-recipes";

export const LANDING_RECIPE_IDS = [
  "motion-poster",
  "product-tvc-12s",
  "product-blockbuster-9s",
  "product-ecom-orbit-6s",
  "product-object-lock-6s",
  "product-macro-snap-6s",
  "product-luxury-tabletop-8s",
  "product-beauty-mv-10s",
  "product-imitate-ad-8s",
  "product-neon-on-real-8s",
  "product-food-bullet-time-6s",
  "product-gaming-cover",
  "product-sports-big-words",
  "product-jelly-3d",
  "concept-motion-poster",
  "concept-tvc-12s",
  "concept-blockbuster-9s",
  "concept-beauty-mv-10s",
  "concept-imitate-ad-8s",
  "concept-neon-on-real-8s",
  "concept-food-bullet-time-6s",
  "concept-gaming-cover",
  "concept-sports-big-words",
  "concept-jelly-3d",
] as const;

export type LandingRecipeId = (typeof LANDING_RECIPE_IDS)[number];

export const LANDING_RECIPE_STORAGE_KEY = "ams-landing-recipe";

export function isLandingRecipeId(value: string | null | undefined): value is LandingRecipeId {
  return (LANDING_RECIPE_IDS as readonly string[]).includes(value ?? "");
}

export type LandingRecipeDef = {
  id: LandingRecipeId;
  previewSrc: string;
  promotionMode: PromotionMode;
  workflowMode: WorkflowMode;
  visualStyleId: VisualStyleId;
  videoCreativeMode?: VideoCreativeMode;
  storyboardSceneCount?: StoryboardSceneCount;
  /** Suggested output duration string for video settings. */
  duration?: VideoDuration;
};

function h3ProductRecipe(
  id: LandingRecipeId,
  mode: H3ShotRecipeMode,
  duration: VideoDuration,
): LandingRecipeDef {
  return {
    id,
    previewSrc: "/images/studio/recipes/product-tvc-12s.png?v=1",
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: mode,
    duration,
  };
}

function h3ConceptRecipe(
  id: LandingRecipeId,
  mode: H3ShotRecipeMode,
  duration: VideoDuration,
): LandingRecipeDef {
  return {
    id,
    previewSrc: "/images/studio/recipes/concept-tvc-12s.png?v=1",
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: mode,
    duration,
  };
}

const IMAGE_POSTER_STYLES = [
  "gaming-cover",
  "sports-big-words",
  "jelly-3d",
] as const;

type ImagePosterStyle = (typeof IMAGE_POSTER_STYLES)[number];

function imagePosterPreview(style: ImagePosterStyle): string {
  return `/images/studio/recipes/${style}.jpg?v=1`;
}

function imageProductRecipe(
  id: LandingRecipeId,
  style: ImagePosterStyle,
): LandingRecipeDef {
  return {
    id,
    previewSrc: imagePosterPreview(style),
    promotionMode: "physical",
    workflowMode: "image-only",
    visualStyleId: style,
  };
}

function imageConceptRecipe(
  id: LandingRecipeId,
  style: ImagePosterStyle,
): LandingRecipeDef {
  return {
    id,
    previewSrc: imagePosterPreview(style),
    promotionMode: "concept",
    workflowMode: "image-only",
    visualStyleId: style,
  };
}

export const LANDING_RECIPES: Record<LandingRecipeId, LandingRecipeDef> = {
  "motion-poster": {
    id: "motion-poster",
    previewSrc: "/images/studio/recipes/motion-poster.png?v=1",
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "motion-poster",
    duration: "6",
  },
  "product-tvc-12s": {
    id: "product-tvc-12s",
    previewSrc: "/images/studio/recipes/product-tvc-12s.png?v=1",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: String(DEFAULT_STORYBOARD_SCENE_COUNT) as StoryboardSceneCount,
    duration: "12",
  },
  "product-blockbuster-9s": {
    id: "product-blockbuster-9s",
    previewSrc: "/images/studio/recipes/product-tvc-12s.png?v=1",
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "blockbuster",
    duration: "8",
  },
  "product-ecom-orbit-6s": h3ProductRecipe("product-ecom-orbit-6s", "ecom-orbit", "6"),
  "product-object-lock-6s": h3ProductRecipe("product-object-lock-6s", "object-lock", "6"),
  "product-macro-snap-6s": h3ProductRecipe("product-macro-snap-6s", "macro-snap", "6"),
  "product-luxury-tabletop-8s": h3ProductRecipe(
    "product-luxury-tabletop-8s",
    "luxury-tabletop",
    "8",
  ),
  "product-beauty-mv-10s": h3ProductRecipe("product-beauty-mv-10s", "beauty-mv", "10"),
  "product-imitate-ad-8s": h3ProductRecipe("product-imitate-ad-8s", "imitate-ad", "8"),
  "product-neon-on-real-8s": h3ProductRecipe(
    "product-neon-on-real-8s",
    "neon-on-real",
    "8",
  ),
  "product-food-bullet-time-6s": {
    ...h3ProductRecipe("product-food-bullet-time-6s", "food-bullet-time", "6"),
    previewSrc: "/images/studio/recipes/food-bullet-time.jpg?v=1",
  },
  "product-gaming-cover": imageProductRecipe("product-gaming-cover", "gaming-cover"),
  "product-sports-big-words": imageProductRecipe(
    "product-sports-big-words",
    "sports-big-words",
  ),
  "product-jelly-3d": imageProductRecipe("product-jelly-3d", "jelly-3d"),
  "concept-motion-poster": {
    id: "concept-motion-poster",
    previewSrc: "/images/studio/recipes/concept-motion-poster.png?v=1",
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "motion-poster",
    duration: "6",
  },
  "concept-tvc-12s": {
    id: "concept-tvc-12s",
    previewSrc: "/images/studio/recipes/concept-tvc-12s.png?v=1",
    promotionMode: "concept",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: String(DEFAULT_STORYBOARD_SCENE_COUNT) as StoryboardSceneCount,
    duration: "12",
  },
  "concept-blockbuster-9s": {
    id: "concept-blockbuster-9s",
    previewSrc: "/images/studio/recipes/concept-tvc-12s.png?v=1",
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "blockbuster",
    duration: "8",
  },
  "concept-beauty-mv-10s": h3ConceptRecipe("concept-beauty-mv-10s", "beauty-mv", "10"),
  "concept-imitate-ad-8s": h3ConceptRecipe("concept-imitate-ad-8s", "imitate-ad", "8"),
  "concept-neon-on-real-8s": h3ConceptRecipe(
    "concept-neon-on-real-8s",
    "neon-on-real",
    "8",
  ),
  "concept-food-bullet-time-6s": {
    ...h3ConceptRecipe("concept-food-bullet-time-6s", "food-bullet-time", "6"),
    previewSrc: "/images/studio/recipes/food-bullet-time.jpg?v=1",
  },
  "concept-gaming-cover": imageConceptRecipe("concept-gaming-cover", "gaming-cover"),
  "concept-sports-big-words": imageConceptRecipe(
    "concept-sports-big-words",
    "sports-big-words",
  ),
  "concept-jelly-3d": imageConceptRecipe("concept-jelly-3d", "jelly-3d"),
};

export function isMotionPosterLandingRecipe(id: LandingRecipeId): boolean {
  return LANDING_RECIPES[id].videoCreativeMode === "motion-poster";
}

export function isBlockbusterLandingRecipe(id: LandingRecipeId): boolean {
  return LANDING_RECIPES[id].videoCreativeMode === "blockbuster";
}

export function isH3ShotLandingRecipe(id: LandingRecipeId): boolean {
  return isH3ShotRecipeMode(LANDING_RECIPES[id].videoCreativeMode);
}

export function isImagePosterLandingRecipe(id: LandingRecipeId): boolean {
  return (
    LANDING_RECIPES[id].workflowMode === "image-only" &&
    (IMAGE_POSTER_STYLES as readonly string[]).includes(
      LANDING_RECIPES[id].visualStyleId,
    )
  );
}

export function isTvcLandingRecipe(id: LandingRecipeId): boolean {
  return Boolean(LANDING_RECIPES[id].storyboardSceneCount);
}

export function landingRecipesForPromotion(mode: PromotionMode): LandingRecipeId[] {
  return LANDING_RECIPE_IDS.filter((id) => LANDING_RECIPES[id].promotionMode === mode);
}

export function studioRecipeHref(
  recipe: LandingRecipeId,
  opts?: { mode?: PromotionMode },
): string {
  const def = LANDING_RECIPES[recipe];
  const params = new URLSearchParams({
    mode: opts?.mode ?? def.promotionMode,
    fresh: "1",
    recipe,
  });
  return `/studio?${params.toString()}`;
}

export function storeLandingRecipe(recipe: LandingRecipeId): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LANDING_RECIPE_STORAGE_KEY, recipe);
}

export function peekLandingRecipe(): LandingRecipeId | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LANDING_RECIPE_STORAGE_KEY);
  return isLandingRecipeId(raw) ? raw : null;
}

export function consumeLandingRecipe(): LandingRecipeId | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LANDING_RECIPE_STORAGE_KEY);
  window.sessionStorage.removeItem(LANDING_RECIPE_STORAGE_KEY);
  return isLandingRecipeId(raw) ? raw : null;
}

/** Micro-wizard ctx so landing recipes skip output-goal and land on setup. */
export function microContextForLandingRecipe(
  recipe: LandingRecipeId,
  promotionMode: PromotionMode = LANDING_RECIPES[recipe].promotionMode,
): MicroWizardContext {
  if (recipe === "concept-motion-poster") {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      conceptSource: "assistant",
      videoSubpath: "motion_poster",
    };
  }
  if (recipe === "concept-blockbuster-9s") {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      conceptSource: "assistant",
      videoSubpath: "blockbuster",
    };
  }
  if (recipe === "product-blockbuster-9s" || isBlockbusterLandingRecipe(recipe)) {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "blockbuster",
    };
  }
  if (isH3ShotLandingRecipe(recipe)) {
    const mode = LANDING_RECIPES[recipe].videoCreativeMode;
    if (!isH3ShotRecipeMode(mode)) {
      throw new Error(`Expected H3 shot recipe mode for ${recipe}`);
    }
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      ...(promotionMode === "concept" ? { conceptSource: "assistant" as const } : {}),
      videoSubpath: h3ShotRecipeToSubpath(mode),
    };
  }
  if (isImagePosterLandingRecipe(recipe)) {
    return {
      promotionMode,
      workflowMode: "image-only",
      intakePath: "direct",
      ...(promotionMode === "concept" ? { conceptSource: "assistant" as const } : {}),
    };
  }
  if (isMotionPosterLandingRecipe(recipe)) {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "motion_poster",
    };
  }
  return {
    promotionMode,
    workflowMode: "combined",
    intakePath: "direct",
    combinedStyle: "storyboard",
  };
}
