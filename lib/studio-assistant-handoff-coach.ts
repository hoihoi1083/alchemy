import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type { StudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import {
  detectStudioCoachMode,
  nextTaskFromSequence,
  setupSequenceForMode,
} from "@/lib/studio-assistant-coach-modes";

function handoffToSnapshot(handoff: StudioAssistantHandoff): StudioAssistantSnapshot {
  const imageOnlyRecipe =
    handoff.recipe === "physical-image-post" ||
    handoff.recipe === "reference-ad-layout" ||
    handoff.recipe === "website-launch-image";
  const workflowMode =
    handoff.workflowMode ?? (imageOnlyRecipe ? "image-only" : "combined");

  return {
    surface: "studio",
    promotionMode: handoff.promotionMode,
    workflowMode,
    stepKey: "setup",
    visualStyleId: handoff.visualStyleId ?? "product",
    promptMarket: "hk",
    product: handoff.product?.trim() ?? "",
    business: handoff.business?.trim() ?? "",
    headline: handoff.headline?.trim() ?? "",
    subline: handoff.subline?.trim() ?? "",
    offer: handoff.offer?.trim() ?? "",
    conceptIdea: handoff.conceptIdea?.trim() ?? handoff.campaignGoal?.trim() ?? "",
    creativeVideoBrief:
      handoff.creativeVideoBrief?.trim() ?? handoff.campaignGoal?.trim() ?? "",
    brandWebsiteUrl: handoff.brandWebsiteUrl?.trim() ?? "",
    hasBrandProfile: false,
    hasProductPhoto: false,
    hasStyleReference: Boolean(handoff.referencePostCoverUrl),
    hasKeyframe: false,
    hasStoryboardScenes: false,
    hasVideo: false,
    cinematicSceneCount: 1,
    cinematicScenesCount: 0,
    storyboardBrief: "",
    usesCompositor: false,
    error: null,
    voiceoverEnabled: true,
    captionBurnEnabled: true,
    imageOutputMode: handoff.imageOutputMode,
    imageCreativeMode:
      handoff.recipe === "reference-ad-layout" ? "reference-concept" : undefined,
    coachAck: [],
  };
}

/** First wizard field to spotlight after assistant opens studio from landing. */
export function initialCoachTaskAfterHandoff(handoff: StudioAssistantHandoff): CoachTaskKind | null {
  if (handoff.recipe === "8s-website-reel" || handoff.recipe === "concept-cinematic") {
    if (handoff.conceptIdea?.trim()) {
      return handoff.brandWebsiteUrl?.trim() ? "analyze-brand" : "continue-setup";
    }
    return "fill-concept";
  }
  if (handoff.recipe === "cinematic-stitch") {
    return handoff.conceptIdea?.trim() ? "continue-setup" : "fill-concept";
  }
  if (handoff.recipe === "website-launch-image") {
    return handoff.brandWebsiteUrl?.trim() ? "analyze-brand" : "enter-brand-url";
  }

  const snapshot = handoffToSnapshot(handoff);
  const mode = detectStudioCoachMode(snapshot);
  const sequenced = nextTaskFromSequence(setupSequenceForMode(mode, snapshot), snapshot);
  if (sequenced) return sequenced;

  if (handoff.promotionMode === "physical") return "fill-product-name";
  if (handoff.promotionMode === "concept") return "fill-concept";
  return null;
}
