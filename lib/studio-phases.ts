import type { WorkflowMode } from "@/lib/workflow-mode";

type PhaseBundle = {
  phases: readonly string[];
  phasesImage: readonly string[];
  phasesVideo: readonly string[];
  phasesCombined: readonly string[];
};

/** Path-aware studio progress labels (shared across steppers). */
export function studioPhasesForMode(
  start: PhaseBundle,
  workflowMode: WorkflowMode | null | undefined,
): readonly string[] {
  if (workflowMode === "image-only") return start.phasesImage;
  if (workflowMode === "video-only") return start.phasesVideo;
  if (workflowMode === "combined") return start.phasesCombined;
  return start.phases;
}

/** Product / intake / image pre-generate — always “Set up content”. */
export function setupContentPhaseIndex(): number {
  return 2;
}

/**
 * Pre-video setup rail.
 * Video-only is still content setup (index 2).
 * Combined is “Confirm storyboard” after stills (index 3).
 */
export function videoSetupPhaseIndex(
  workflowMode: WorkflowMode | null | undefined,
): number {
  return workflowMode === "combined" ? 3 : 2;
}

/**
 * Wait screen while fal is generating.
 * Combined video run is the last phase (“Generate video”);
 * image / storyboard / video-only generate sit on index 3.
 */
export function generateWaitPhaseIndex(
  workflowMode: WorkflowMode | null | undefined,
  kind: "image" | "video" | "storyboard" = "image",
): number {
  if (kind === "video" && workflowMode === "combined") return 4;
  return 3;
}

/**
 * Active phase index for image/storyboard review.
 * Combined stills = “Confirm storyboard”; image-only = “Download & use”.
 */
export function imageReviewPhaseIndex(
  workflowMode: WorkflowMode | null | undefined,
  opts?: { isStoryboard?: boolean },
): number {
  void opts;
  if (workflowMode === "combined") return 3;
  return 4;
}

/** Final video / export review sits on the last phase. */
export function videoReviewPhaseIndex(): number {
  return 4;
}
