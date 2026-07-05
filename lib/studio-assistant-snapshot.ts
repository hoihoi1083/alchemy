import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { AssistantSurface, StudioAssistantSnapshot } from "@/lib/studio-assistant-types";
import { getVisualStyle } from "@/lib/visual-styles";

export function buildStudioAssistantSnapshot(
  w: StudioWizardValue,
  surface: AssistantSurface = "studio",
): StudioAssistantSnapshot {
  return {
    surface,
    promotionMode: w.promotionMode,
    workflowMode: w.workflowMode,
    stepKey: w.stepKey,
    visualStyleId: w.visualStyleId,
    promptMarket: w.promptMarket,
    product: w.product.trim(),
    business: w.business.trim(),
    headline: w.headline.trim(),
    subline: w.subline.trim(),
    offer: w.offer.trim(),
    conceptIdea: w.conceptIdea.trim(),
    creativeVideoBrief: w.creativeVideoBrief.trim(),
    brandWebsiteUrl: w.brandWebsiteUrl.trim(),
    hasBrandProfile: Boolean(w.brandProfile?.businessName),
    hasProductPhoto: Boolean(w.productPhoto),
    hasKeyframe: w.hasFinalImage,
    hasStoryboardScenes: (w.storyboardScenes?.length ?? 0) > 0,
    hasVideo: Boolean(w.videoUrl),
    cinematicSceneCount: w.cinematicSceneCount,
    cinematicScenesCount: w.cinematicScenes?.length ?? 0,
    storyboardBrief: w.storyboardBrief?.trim() ?? "",
    usesCompositor: getVisualStyle(w.visualStyleId).usesCompositor,
    error: w.error,
    voiceoverEnabled: w.voiceoverEnabled,
    captionBurnEnabled: w.captionBurnEnabled,
    imageOutputMode: w.imageOutputMode as ImageOutputMode,
    imageCreativeMode: w.imageCreativeMode,
    hasStyleReference: Boolean(w.imageRefPhoto),
  };
}
