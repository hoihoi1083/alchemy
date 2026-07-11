import type { VideoCreativeMode } from "@/lib/creative-workflow";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** User-facing video pipeline — not the Seedance API mode. */
export type VideoOutputPresentationId =
  | "storyboard-reel"
  | "animate-keyframe"
  | "reference-motion"
  | "text-reel"
  | "product-assistant"
  | "cinematic-reel"
  | "digital-presenter";

export type ResolveVideoOutputPresentationInput = {
  workflowMode: WorkflowMode;
  usesCompositor: boolean;
  isStoryboardOutput: boolean;
  isUgcPresenterOutput: boolean;
  shouldCinematicStitch: boolean;
  isConceptCinematicSingleOutput: boolean;
  usesProductAssistant: boolean;
  conceptTextVideoReady: boolean;
  videoCreativeMode: VideoCreativeMode;
  useReferenceVideo: boolean;
  hasReferenceAd: boolean;
};

export function resolveVideoOutputPresentation(
  input: ResolveVideoOutputPresentationInput,
): VideoOutputPresentationId | null {
  if (input.workflowMode === "image-only") return null;
  if (input.usesCompositor) return "animate-keyframe";
  if (input.isStoryboardOutput) return "storyboard-reel";
  if (input.isUgcPresenterOutput) return "digital-presenter";
  if (input.shouldCinematicStitch || input.isConceptCinematicSingleOutput) {
    return "cinematic-reel";
  }
  if (input.usesProductAssistant) return "product-assistant";
  if (input.conceptTextVideoReady) return "text-reel";
  if (
    input.videoCreativeMode === "reference-concept" &&
    input.useReferenceVideo &&
    input.hasReferenceAd
  ) {
    return "reference-motion";
  }
  return "animate-keyframe";
}

/** Visual style / research path already picks the pipeline — hide redundant mode pickers. */
export function isVideoOutputPathLocked(id: VideoOutputPresentationId): boolean {
  return (
    id === "storyboard-reel" ||
    id === "digital-presenter" ||
    id === "cinematic-reel" ||
    id === "product-assistant" ||
    id === "text-reel"
  );
}
