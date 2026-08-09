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

export const LANDING_RECIPE_IDS = [
  "motion-poster",
  "product-tvc-12s",
  "concept-motion-poster",
  "concept-tvc-12s",
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
  "concept-motion-poster": {
    id: "concept-motion-poster",
    previewSrc: "/images/studio/recipes/concept-motion-poster.png?v=1",
    promotionMode: "concept",
    workflowMode: "combined",
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
};

export function isMotionPosterLandingRecipe(id: LandingRecipeId): boolean {
  return LANDING_RECIPES[id].videoCreativeMode === "motion-poster";
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
      workflowMode: "combined",
      intakePath: "direct",
      conceptSource: "assistant",
      videoSubpath: "motion_poster",
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
