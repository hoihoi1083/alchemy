import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { EMPTY_PROJECT_SNAPSHOT } from "@/lib/project-snapshot";

function httpUrlOnly(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url.trim();
  return null;
}

/** Build a Mongo-safe snapshot from live wizard state (skips blob: URLs). */
export function snapshotFromWizard(
  wizard: StudioWizardValue,
  promotionMode: PromotionMode,
): ProjectSnapshot {
  const base = EMPTY_PROJECT_SNAPSHOT(promotionMode);
  return {
    version: 1,
    inputs: {
      ...base.inputs,
      product: wizard.product,
      headline: wizard.headline,
      subline: wizard.subline,
      business: wizard.business,
      offer: wizard.offer,
      conceptIdea: wizard.conceptIdea,
      promptExtra: wizard.promptExtra,
      promptMarket: wizard.promptMarket,
      subjectFraming: wizard.subjectFraming,
      campaignTheme: wizard.campaignTheme,
      brandWebsiteUrl: wizard.brandWebsiteUrl,
      brandSocialHint: wizard.brandSocialHint,
      creativeVideoBrief: wizard.creativeVideoBrief,
      storyboardBrief: wizard.storyboardBrief,
    },
    settings: {
      workflowMode: wizard.workflowMode,
      visualStyleId: wizard.visualStyleId,
      artStyleId: wizard.artStyleId,
      templateId: wizard.templateId,
      promotionMode,
      imageCreativeMode: wizard.imageCreativeMode,
      videoCreativeMode: wizard.videoCreativeMode,
      imageOutputMode: wizard.imageOutputMode,
      imageAspectRatio: wizard.imageAspectRatio,
      imageInputMode: wizard.imageInputMode,
      stepKey: wizard.stepKey,
    },
    prompts: {
      imagePrompt: wizard.imagePrompt,
      videoPrompt: wizard.videoPrompt,
      negativePrompt: wizard.negativePrompt,
    },
    plans: {
      brandProfile: wizard.brandProfile,
      userReferenceBrief: wizard.userReferenceBrief,
      campaignPlan: wizard.campaignPlan,
      teachingCarouselPlan: null,
      storyboardPlan: wizard.storyboardPlan,
      adPackPlan: wizard.adPackPlan,
      contentResearchPlan: null,
      selectedResearchAngleId: null,
    },
    media: {
      imageUrl: httpUrlOnly(wizard.imageUrl),
      imageVariantUrls: wizard.imageVariantUrls
        .map((u) => httpUrlOnly(u))
        .filter((u): u is string => Boolean(u)),
      videoUrl: httpUrlOnly(wizard.videoUrl),
      uploadPreviewUrl: httpUrlOnly(wizard.uploadPreviewUrl),
      imageRefPreviewUrl: httpUrlOnly(wizard.imageRefPreviewUrl),
      campaignSlideUrls: (wizard.campaignSlides ?? [])
        .map((s) => httpUrlOnly(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      storyboardSceneUrls: (wizard.storyboardScenes ?? [])
        .map((s) => httpUrlOnly(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      carouselSlideUrls: [],
    },
    outputs: {
      captionLines: wizard.captionLines,
    },
  };
}
