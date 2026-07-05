import { readStoredPromotionMode } from "@/lib/promotion-mode";
import type { StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import type { AssistantSurface } from "@/lib/studio-assistant-types";

export function buildDefaultAssistantSnapshot(
  surface: AssistantSurface,
): StudioAssistantSnapshot {
  const stored = readStoredPromotionMode();
  return {
    surface,
    promotionMode: stored,
    workflowMode: "combined",
    stepKey: "setup",
    visualStyleId: stored === "concept" ? "concept-cinematic" : "product",
    promptMarket: "hk",
    product: "",
    business: "",
    headline: "",
    subline: "",
    offer: "",
    conceptIdea: "",
    creativeVideoBrief: "",
    brandWebsiteUrl: "",
    hasBrandProfile: false,
    hasProductPhoto: false,
    hasKeyframe: false,
    hasStoryboardScenes: false,
    hasVideo: false,
    cinematicSceneCount: 1,
    cinematicScenesCount: 0,
    storyboardBrief: "",
    usesCompositor: false,
    error: null,
    voiceoverEnabled: false,
    captionBurnEnabled: false,
  };
}
