import type { WorkflowMode } from "@/lib/workflow-mode";

/** Where a phase-rail click should send the user (only for completed / earlier steps). */
export type StudioPhaseNavTarget =
  | { type: "href"; href: string }
  | { type: "micro"; stepId: string };

/**
 * Map marketing phase-rail index → navigation target.
 * Indices match studioPhasesForMode labels (0=promote … 4=download).
 * Only call for index < activeIndex (go back).
 */
export function studioPhaseNavTarget(
  index: number,
  workflowMode: WorkflowMode | null | undefined,
): StudioPhaseNavTarget | null {
  if (index < 0) return null;
  if (index === 0) {
    return { type: "href", href: "/start" };
  }
  if (index === 1) {
    return { type: "micro", stepId: "route.output_goal" };
  }
  if (index === 2) {
    return { type: "micro", stepId: "setup.pre_generate" };
  }
  if (index === 3) {
    if (workflowMode === "combined") {
      return { type: "micro", stepId: "image.review" };
    }
    if (workflowMode === "video-only") {
      return { type: "micro", stepId: "setup.pre_video" };
    }
    return { type: "micro", stepId: "image.review" };
  }
  if (index === 4) {
    return { type: "micro", stepId: "done.export" };
  }
  return null;
}
