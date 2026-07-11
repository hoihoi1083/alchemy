import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** Research reel → studio routing from promotion mode + workflow picker (combined vs video-only). */
export function resolveReelResearchRouting(
  _promotionMode: "physical" | "concept",
  workflowMode: WorkflowMode,
): { visualStyleId: VisualStyleId } {
  if (workflowMode === "combined") {
    return { visualStyleId: "storyboard-video" };
  }
  return { visualStyleId: "product" };
}
