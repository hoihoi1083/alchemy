import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** Research reel → studio routing from promotion mode + workflow picker (combined vs video-only). */
export function resolveReelResearchRouting(
  promotionMode: "physical" | "concept",
  workflowMode: WorkflowMode,
): { visualStyleId: VisualStyleId } {
  if (workflowMode === "combined") {
    return { visualStyleId: "storyboard-video" };
  }
  // Concept video-only must stay on an allowed concept style (not physical-only "product").
  if (promotionMode === "concept") {
    return { visualStyleId: "creative-video" };
  }
  return { visualStyleId: "product" };
}
