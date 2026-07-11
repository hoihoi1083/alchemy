import type { ImageCreativeMode } from "@/lib/creative-workflow";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import type { PromotionMode } from "@/lib/promotion-mode";
import { conceptStyleRequiresHeadline } from "@/lib/promotion-styles";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

export type SetupImageGateReason =
  | "need_headline"
  | "need_product_name"
  | "need_reference_image"
  | "reference_analyzing";

export function isContentResearchImagePath(
  promptExtra: string,
  workflowMode: WorkflowMode,
): boolean {
  return (
    isContentResearchStyleExtra(promptExtra) &&
    (workflowMode === "image-only" || workflowMode === "combined")
  );
}

export function proceedsToImageStep(
  workflowMode: WorkflowMode,
  isStoryboardOutput: boolean,
): boolean {
  return workflowMode !== "video-only" || isStoryboardOutput;
}

/** Block Setup → Image when required reference / copy is not ready yet. */
export function evaluateProceedToImageGate(input: {
  promotionMode: PromotionMode;
  workflowMode: WorkflowMode;
  promptExtra: string;
  effectivePromoteName: string;
  hasReferenceImage: boolean;
  referenceAnalyzeBusy: boolean;
  imageCreativeMode: ImageCreativeMode;
  headline: string;
  visualStyleId: VisualStyleId;
  hasProductPhoto: boolean;
  isStoryboardOutput: boolean;
}): SetupImageGateReason | null {
  if (!proceedsToImageStep(input.workflowMode, input.isStoryboardOutput)) {
    return null;
  }

  if (
    input.isStoryboardOutput &&
    input.promotionMode === "concept" &&
    !input.effectivePromoteName.trim()
  ) {
    return "need_headline";
  }

  if (
    input.isStoryboardOutput &&
    input.promotionMode === "physical" &&
    !input.effectivePromoteName.trim()
  ) {
    return "need_product_name";
  }

  const researchImage = isContentResearchImagePath(
    input.promptExtra,
    input.workflowMode,
  );

  if (researchImage) {
    if (!input.effectivePromoteName.trim()) {
      return input.promotionMode === "concept" ? "need_headline" : "need_product_name";
    }
    if (!input.hasReferenceImage) {
      return "need_reference_image";
    }
    if (input.referenceAnalyzeBusy) {
      return "reference_analyzing";
    }
  }

  if (
    input.promotionMode === "concept" &&
    conceptStyleRequiresHeadline(input.visualStyleId) &&
    !input.headline.trim()
  ) {
    return "need_headline";
  }

  if (
    input.imageCreativeMode === "reference-concept" &&
    input.hasReferenceImage &&
    input.referenceAnalyzeBusy
  ) {
    return "reference_analyzing";
  }

  // Product photo is collected on the Image step (checklist marks it "next step").
  return null;
}
