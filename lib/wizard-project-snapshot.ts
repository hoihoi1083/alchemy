import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import { EMPTY_PROJECT_SNAPSHOT } from "@/lib/project-snapshot";
import { isLibraryAssetUrl } from "@/lib/storage/library-asset-url";

/**
 * Keep URLs that survive a page reload. Drop blob:/data: and ephemeral
 * /api/pipeline-files/ (Vercel /tmp). Keep absolute http(s) and durable
 * /api/library/download/:id (relative — what persistAndDurablize returns).
 */
function persistableMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("blob:") || u.startsWith("data:")) return null;
  if (u.startsWith("/api/pipeline-files/")) return null;
  if (isLibraryAssetUrl(u) || u.startsWith("/api/library/download/")) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
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
      imageUrl: persistableMediaUrl(wizard.imageUrl),
      imageVariantUrls: wizard.imageVariantUrls
        .map((u) => persistableMediaUrl(u))
        .filter((u): u is string => Boolean(u)),
      videoUrl: persistableMediaUrl(wizard.videoUrl),
      uploadPreviewUrl: persistableMediaUrl(wizard.uploadPreviewUrl),
      imageRefPreviewUrl: persistableMediaUrl(wizard.imageRefPreviewUrl),
      campaignSlideUrls: (wizard.campaignSlides ?? [])
        .map((s) => persistableMediaUrl(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      storyboardSceneUrls: (wizard.storyboardScenes ?? [])
        .map((s) => persistableMediaUrl(s.imageUrl))
        .filter((u): u is string => Boolean(u)),
      carouselSlideUrls: [],
    },
    outputs: {
      captionLines: wizard.captionLines,
    },
  };
}
