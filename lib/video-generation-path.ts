import {
  isRecipeOwnedVideoMode,
  type VideoCreativeMode,
} from "@/lib/creative-workflow";
import { isH3ShotRecipeMode } from "@/lib/h3-shot-recipes";

/** Which Seedance path generateVideo() should take (unit-tested). */
export type VideoGenerationKind =
  | "compositor"
  | "storyboard"
  | "cinematic-stitch"
  | "concept-cinematic-single"
  | "product-assistant"
  | "text-to-video"
  | "reference-r2v"
  | "multi-angle-r2v"
  | "digital-presenter"
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
  | "image-to-video";

export type ResolveVideoGenerationKindInput = {
  usesCompositor: boolean;
  isStoryboardOutput: boolean;
  isUgcPresenterOutput: boolean;
  shouldCinematicStitch: boolean;
  isConceptCinematicSingleOutput: boolean;
  cinematicSceneCount: number;
  cinematicScenesLength: number;
  usesProductAssistant: boolean;
  conceptTextVideoReady: boolean;
  videoCreativeMode: VideoCreativeMode;
  useReferenceVideo: boolean;
  hasReferenceAd: boolean;
  useMultiAngleVideo: boolean;
};

export function resolveVideoGenerationKind(
  input: ResolveVideoGenerationKindInput,
): VideoGenerationKind {
  if (input.usesCompositor) return "compositor";
  // Motion poster / social drip are single-clip recipes — win over storyboard lock.
  if (input.videoCreativeMode === "motion-poster") {
    return "motion-poster";
  }
  if (input.videoCreativeMode === "impact-poster") {
    return "impact-poster";
  }
  if (input.videoCreativeMode === "social-drip") {
    return "social-drip";
  }
  if (input.videoCreativeMode === "blockbuster") {
    return "blockbuster";
  }
  if (input.videoCreativeMode === "vacuum-inflate") {
    return "vacuum-inflate";
  }
  if (input.videoCreativeMode === "creative-motion") {
    return "creative-motion";
  }
  if (input.videoCreativeMode === "hand-throw-scene") {
    return "hand-throw-scene";
  }
  if (input.videoCreativeMode === "product-explode") {
    return "product-explode";
  }
  if (isH3ShotRecipeMode(input.videoCreativeMode)) {
    return input.videoCreativeMode;
  }
  if (input.isStoryboardOutput) return "storyboard";
  if (input.isUgcPresenterOutput) return "digital-presenter";
  if (input.shouldCinematicStitch) return "cinematic-stitch";
  if (
    input.isConceptCinematicSingleOutput &&
    input.cinematicScenesLength >= 1
  ) {
    return "concept-cinematic-single";
  }
  if (input.usesProductAssistant) return "product-assistant";
  if (input.conceptTextVideoReady) return "text-to-video";
  if (
    input.videoCreativeMode === "reference-concept" &&
    input.useReferenceVideo &&
    input.hasReferenceAd
  ) {
    return "reference-r2v";
  }
  if (input.useMultiAngleVideo && input.useReferenceVideo && input.hasReferenceAd) {
    return "multi-angle-r2v";
  }
  return "image-to-video";
}

/** Sticky 九宫格 style must not block recipe-owned H3 / poster / drip clips. */
export function storyboardBlocksRecipeVideo(
  isStoryboardOutput: boolean,
  videoCreativeMode: VideoCreativeMode,
): boolean {
  return isStoryboardOutput && !isRecipeOwnedVideoMode(videoCreativeMode);
}

/** Physical video-only still needs @Image1 unless the recipe can Nano Banana it. */
export function physicalVideoOnlyNeedsUploadedPhoto(input: {
  hasProductPhoto: boolean;
  hasDirectReferenceR2v: boolean;
  hasStoryboardScenes: boolean;
  hasImageOverride: boolean;
  canAutoStill: boolean;
}): boolean {
  if (input.hasProductPhoto || input.hasDirectReferenceR2v || input.hasImageOverride) {
    return false;
  }
  if (input.hasStoryboardScenes || input.canAutoStill) return false;
  return true;
}
