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

/**
 * Active phase index for image/storyboard review.
 * Combined storyboard stills = intermediate (not final Done).
 */
export function imageReviewPhaseIndex(
  workflowMode: WorkflowMode | null | undefined,
  opts?: { isStoryboard?: boolean },
): number {
  if (workflowMode === "combined" && opts?.isStoryboard) return 3;
  return 4;
}

/** Final video / export review sits on the last phase. */
export function videoReviewPhaseIndex(): number {
  return 4;
}
