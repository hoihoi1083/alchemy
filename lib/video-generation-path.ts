import type { VideoCreativeMode } from "@/lib/creative-workflow";

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
