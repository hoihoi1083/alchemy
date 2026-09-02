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
  "product-impact-poster-6s",
  "product-tvc-12s",
  "product-premium-punch-15s",
  "product-cinematic-assemble-15s",
  "product-studio-type-15s",
  "product-brand-warp-12s",
  "product-blockbuster-9s",
  "product-vacuum-inflate-4s",
  "product-creative-motion-4s",
  "product-hand-throw-scene-6s",
  "product-web-boundary-break-10s",
  "product-product-explode-4s",
  "product-bullet-elevate-10s",
  "product-ecom-orbit-6s",
  "product-object-lock-6s",
  "product-macro-snap-6s",
  "product-luxury-tabletop-8s",
  "product-beauty-mv-10s",
  "product-imitate-ad-8s",
  "product-neon-on-real-8s",
  "product-food-bullet-time-6s",
  "product-c4d-motion-8s",
  "product-h3-showreel-8s",
  "product-h3-sphere-mg-8s",
  "product-h3-logo-mg-8s",
  "product-h3-triangle-light-mg-10s",
  "product-h3-glass-type-mg-12s",
  "product-h3-design-studio-mg-12s",
  "product-h3-movie-title-8s",
  "product-h3-lifestyle-8s",
  "product-gaming-cover",
  "product-sports-big-words",
  "product-jelly-3d",
  "concept-motion-poster",
  "concept-impact-poster-6s",
  "concept-tvc-12s",
  "concept-premium-punch-15s",
  "concept-studio-type-15s",
  "concept-brand-warp-12s",
  "concept-blockbuster-9s",
  "concept-vacuum-inflate-4s",
  "concept-creative-motion-4s",
  "concept-hand-throw-scene-6s",
  "concept-web-boundary-break-10s",
  "concept-product-explode-4s",
  "concept-bullet-elevate-10s",
  "concept-beauty-mv-10s",
  "concept-imitate-ad-8s",
  "concept-neon-on-real-8s",
  "concept-c4d-motion-8s",
  "concept-h3-showreel-8s",
  "concept-h3-sphere-mg-8s",
  "concept-h3-logo-mg-8s",
  "concept-h3-triangle-light-mg-10s",
  "concept-h3-glass-type-mg-12s",
  "concept-h3-design-studio-mg-12s",
  "concept-h3-movie-title-8s",
  "concept-gaming-cover",
  "concept-sports-big-words",
  "concept-jelly-3d",
  "concept-explosion-unbox-8s",
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
  /** When set, wizard locks StoryboardRecipePicker to this narrative recipe. */
  storyboardRecipeId?: import("@/lib/storyboard-recipes").StoryboardRecipeId;
  /** Suggested output duration string for video settings. */
  duration?: VideoDuration;
};

function videoModeRecipePreview(mode: string): string {
  return `/images/studio/video-modes/${mode}.png?v=3`;
}

function h3ProductRecipe(
  id: LandingRecipeId,
  mode: H3ShotRecipeMode,
  duration: VideoDuration,
): LandingRecipeDef {
  return {
    id,
    previewSrc: videoModeRecipePreview(mode),
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
    previewSrc: videoModeRecipePreview(mode),
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
  "product-impact-poster-6s": {
    id: "product-impact-poster-6s",
    previewSrc: videoModeRecipePreview("impact-poster"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "impact-poster",
    duration: "6",
  },
  "product-tvc-12s": {
    id: "product-tvc-12s",
    previewSrc: "/images/studio/visual-styles/storyboard-video.png?v=2",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: String(DEFAULT_STORYBOARD_SCENE_COUNT) as StoryboardSceneCount,
    storyboardRecipeId: "classic-tvc",
    duration: "12",
  },
  "product-premium-punch-15s": {
    id: "product-premium-punch-15s",
    previewSrc: "/images/studio/recipes/premium-punch.png?v=1",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "6",
    storyboardRecipeId: "premium-punch",
    duration: "12",
  },
  "product-cinematic-assemble-15s": {
    id: "product-cinematic-assemble-15s",
    previewSrc: "/images/studio/recipes/cinematic-assemble.png?v=1",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "6",
    storyboardRecipeId: "cinematic-assemble",
    duration: "12",
  },
  "product-studio-type-15s": {
    id: "product-studio-type-15s",
    previewSrc: "/images/studio/recipes/studio-type.png?v=1",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "6",
    storyboardRecipeId: "studio-type",
    duration: "12",
  },
  "product-brand-warp-12s": {
    id: "product-brand-warp-12s",
    previewSrc: "/images/studio/recipes/brand-warp.png?v=1",
    promotionMode: "physical",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "4",
    storyboardRecipeId: "brand-warp",
    duration: "12",
  },
  "product-blockbuster-9s": {
    id: "product-blockbuster-9s",
    previewSrc: videoModeRecipePreview("blockbuster"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "blockbuster",
    duration: "8",
  },
  "product-vacuum-inflate-4s": {
    id: "product-vacuum-inflate-4s",
    previewSrc: videoModeRecipePreview("vacuum-inflate"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "vacuum-inflate",
    duration: "4",
  },
  "product-creative-motion-4s": {
    id: "product-creative-motion-4s",
    previewSrc: videoModeRecipePreview("creative-motion"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "creative-motion",
    duration: "4",
  },
  "product-hand-throw-scene-6s": {
    id: "product-hand-throw-scene-6s",
    previewSrc: videoModeRecipePreview("hand-throw-scene"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "hand-throw-scene",
    duration: "6",
  },
  "product-web-boundary-break-10s": {
    id: "product-web-boundary-break-10s",
    previewSrc: videoModeRecipePreview("web-boundary-break"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "web-boundary-break",
    duration: "10",
  },
  "product-product-explode-4s": {
    id: "product-product-explode-4s",
    previewSrc: videoModeRecipePreview("product-explode"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "product-explode",
    duration: "4",
  },
  "product-bullet-elevate-10s": {
    id: "product-bullet-elevate-10s",
    previewSrc: videoModeRecipePreview("bullet-product-elevate"),
    promotionMode: "physical",
    workflowMode: "video-only",
    visualStyleId: "product",
    videoCreativeMode: "bullet-product-elevate",
    duration: "10",
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
  "product-food-bullet-time-6s": h3ProductRecipe(
    "product-food-bullet-time-6s",
    "food-bullet-time",
    "6",
  ),
  "product-c4d-motion-8s": h3ProductRecipe(
    "product-c4d-motion-8s",
    "c4d-motion",
    "8",
  ),
  "product-h3-showreel-8s": h3ProductRecipe(
    "product-h3-showreel-8s",
    "h3-showreel",
    "8",
  ),
  "product-h3-sphere-mg-8s": h3ProductRecipe(
    "product-h3-sphere-mg-8s",
    "h3-sphere-mg",
    "8",
  ),
  "product-h3-logo-mg-8s": h3ProductRecipe(
    "product-h3-logo-mg-8s",
    "h3-logo-mg",
    "8",
  ),
  "product-h3-triangle-light-mg-10s": h3ProductRecipe(
    "product-h3-triangle-light-mg-10s",
    "h3-triangle-light-mg",
    "10",
  ),
  "product-h3-glass-type-mg-12s": h3ProductRecipe(
    "product-h3-glass-type-mg-12s",
    "h3-glass-type-mg",
    "12",
  ),
  "product-h3-design-studio-mg-12s": h3ProductRecipe(
    "product-h3-design-studio-mg-12s",
    "h3-design-studio-mg",
    "12",
  ),
  "product-h3-movie-title-8s": h3ProductRecipe(
    "product-h3-movie-title-8s",
    "h3-movie-title",
    "8",
  ),
  "product-h3-lifestyle-8s": h3ProductRecipe(
    "product-h3-lifestyle-8s",
    "h3-lifestyle",
    "8",
  ),
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
  "concept-impact-poster-6s": {
    id: "concept-impact-poster-6s",
    previewSrc: videoModeRecipePreview("impact-poster"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "impact-poster",
    duration: "6",
  },
  "concept-tvc-12s": {
    id: "concept-tvc-12s",
    previewSrc: "/images/studio/visual-styles/storyboard-video.png?v=2",
    promotionMode: "concept",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: String(DEFAULT_STORYBOARD_SCENE_COUNT) as StoryboardSceneCount,
    storyboardRecipeId: "classic-tvc",
    duration: "12",
  },
  "concept-premium-punch-15s": {
    id: "concept-premium-punch-15s",
    previewSrc: "/images/studio/recipes/premium-punch.png?v=1",
    promotionMode: "concept",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "6",
    storyboardRecipeId: "premium-punch",
    duration: "12",
  },
  "concept-studio-type-15s": {
    id: "concept-studio-type-15s",
    previewSrc: "/images/studio/recipes/studio-type.png?v=1",
    promotionMode: "concept",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "6",
    storyboardRecipeId: "studio-type",
    duration: "12",
  },
  "concept-brand-warp-12s": {
    id: "concept-brand-warp-12s",
    previewSrc: "/images/studio/recipes/brand-warp.png?v=1",
    promotionMode: "concept",
    workflowMode: "combined",
    visualStyleId: "storyboard-video",
    storyboardSceneCount: "4",
    storyboardRecipeId: "brand-warp",
    duration: "12",
  },
  "concept-blockbuster-9s": {
    id: "concept-blockbuster-9s",
    previewSrc: videoModeRecipePreview("blockbuster"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "blockbuster",
    duration: "8",
  },
  "concept-vacuum-inflate-4s": {
    id: "concept-vacuum-inflate-4s",
    previewSrc: videoModeRecipePreview("vacuum-inflate"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "vacuum-inflate",
    duration: "4",
  },
  "concept-creative-motion-4s": {
    id: "concept-creative-motion-4s",
    previewSrc: videoModeRecipePreview("creative-motion"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "creative-motion",
    duration: "4",
  },
  "concept-hand-throw-scene-6s": {
    id: "concept-hand-throw-scene-6s",
    previewSrc: videoModeRecipePreview("hand-throw-scene"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "hand-throw-scene",
    duration: "6",
  },
  "concept-web-boundary-break-10s": {
    id: "concept-web-boundary-break-10s",
    previewSrc: videoModeRecipePreview("web-boundary-break"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "web-boundary-break",
    duration: "10",
  },
  "concept-product-explode-4s": {
    id: "concept-product-explode-4s",
    previewSrc: videoModeRecipePreview("product-explode"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "product-explode",
    duration: "4",
  },
  "concept-bullet-elevate-10s": {
    id: "concept-bullet-elevate-10s",
    previewSrc: videoModeRecipePreview("bullet-product-elevate"),
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "service-promo",
    videoCreativeMode: "bullet-product-elevate",
    duration: "10",
  },
  "concept-beauty-mv-10s": h3ConceptRecipe("concept-beauty-mv-10s", "beauty-mv", "10"),
  "concept-imitate-ad-8s": h3ConceptRecipe("concept-imitate-ad-8s", "imitate-ad", "8"),
  "concept-neon-on-real-8s": h3ConceptRecipe(
    "concept-neon-on-real-8s",
    "neon-on-real",
    "8",
  ),
  "concept-c4d-motion-8s": h3ConceptRecipe(
    "concept-c4d-motion-8s",
    "c4d-motion",
    "8",
  ),
  "concept-h3-showreel-8s": h3ConceptRecipe(
    "concept-h3-showreel-8s",
    "h3-showreel",
    "8",
  ),
  "concept-h3-sphere-mg-8s": h3ConceptRecipe(
    "concept-h3-sphere-mg-8s",
    "h3-sphere-mg",
    "8",
  ),
  "concept-h3-logo-mg-8s": h3ConceptRecipe(
    "concept-h3-logo-mg-8s",
    "h3-logo-mg",
    "8",
  ),
  "concept-h3-triangle-light-mg-10s": h3ConceptRecipe(
    "concept-h3-triangle-light-mg-10s",
    "h3-triangle-light-mg",
    "10",
  ),
  "concept-h3-glass-type-mg-12s": h3ConceptRecipe(
    "concept-h3-glass-type-mg-12s",
    "h3-glass-type-mg",
    "12",
  ),
  "concept-h3-design-studio-mg-12s": h3ConceptRecipe(
    "concept-h3-design-studio-mg-12s",
    "h3-design-studio-mg",
    "12",
  ),
  "concept-h3-movie-title-8s": h3ConceptRecipe(
    "concept-h3-movie-title-8s",
    "h3-movie-title",
    "8",
  ),
  "concept-gaming-cover": imageConceptRecipe("concept-gaming-cover", "gaming-cover"),
  "concept-sports-big-words": imageConceptRecipe(
    "concept-sports-big-words",
    "sports-big-words",
  ),
  "concept-jelly-3d": imageConceptRecipe("concept-jelly-3d", "jelly-3d"),
  "concept-explosion-unbox-8s": {
    id: "concept-explosion-unbox-8s",
    previewSrc: "/images/studio/visual-styles/explosion-unbox.png?v=1",
    promotionMode: "concept",
    workflowMode: "video-only",
    visualStyleId: "explosion-unbox",
    duration: "8",
  },
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
  if (recipe === "concept-explosion-unbox-8s") {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      conceptSource: "assistant",
      videoSubpath: "explosion_unbox",
    };
  }
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
  if (
    LANDING_RECIPES[recipe].videoCreativeMode === "vacuum-inflate" ||
    LANDING_RECIPES[recipe].videoCreativeMode === "creative-motion" ||
    LANDING_RECIPES[recipe].videoCreativeMode === "hand-throw-scene" ||
    LANDING_RECIPES[recipe].videoCreativeMode === "web-boundary-break" ||
    LANDING_RECIPES[recipe].videoCreativeMode === "product-explode" ||
    LANDING_RECIPES[recipe].videoCreativeMode === "bullet-product-elevate"
  ) {
    const mode = LANDING_RECIPES[recipe].videoCreativeMode;
    const videoSubpath =
      mode === "vacuum-inflate"
        ? "vacuum_inflate"
        : mode === "creative-motion"
          ? "creative_motion"
          : mode === "hand-throw-scene"
            ? "hand_throw_scene"
            : mode === "web-boundary-break"
              ? "web_boundary_break"
            : mode === "bullet-product-elevate"
              ? "bullet_product_elevate"
            : "product_explode";
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      ...(promotionMode === "concept" ? { conceptSource: "assistant" as const } : {}),
      videoSubpath,
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
  if (LANDING_RECIPES[recipe].videoCreativeMode === "impact-poster") {
    return {
      promotionMode,
      workflowMode: "video-only",
      intakePath: "direct",
      videoSubpath: "impact_poster",
    };
  }
  return {
    promotionMode,
    workflowMode: "combined",
    intakePath: "direct",
    combinedStyle: "storyboard",
  };
}
