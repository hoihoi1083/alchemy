import type { StudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { applyResearchPostReferences } from "@/lib/content-research-apply-refs";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";
import { requestMicroWizardRestart } from "@/lib/wizard-micro-steps.types";
import { seedMicroWizardContextFromHandoff } from "@/lib/wizard-project-snapshot";

export async function applyStudioAssistantHandoff(
  handoff: StudioAssistantHandoff,
  wizard: StudioWizardValue,
): Promise<void> {
  if (handoff.campaignGoal && handoff.promotionMode === "concept") {
    wizard.setConceptIdea(handoff.campaignGoal);
    wizard.setCreativeVideoBrief(handoff.campaignGoal);
  }
  if (handoff.brandWebsiteUrl) wizard.setBrandWebsiteUrl(handoff.brandWebsiteUrl);
  if (handoff.product) wizard.setProduct(handoff.product);
  if (handoff.business) wizard.setBusiness(handoff.business);
  if (handoff.headline) wizard.setHeadline(handoff.headline);
  if (handoff.subline) wizard.setSubline(handoff.subline);
  if (handoff.offer) wizard.setOffer(handoff.offer);
  if (handoff.conceptIdea) wizard.setConceptIdea(handoff.conceptIdea);
  if (handoff.creativeVideoBrief) wizard.setCreativeVideoBrief(handoff.creativeVideoBrief);
  if (handoff.promptExtra) {
    wizard.setPromptExtra((prev) =>
      [prev.trim(), handoff.promptExtra!.trim()].filter(Boolean).join(" | "),
    );
  }
  if (handoff.imageOutputMode) {
    const legacy =
      handoff.imageOutputMode === "campaign"
        ? { mode: "carousel" as const, intent: "promo" as const, slideCount: 3 }
        : handoff.imageOutputMode === "teaching-carousel"
          ? {
              mode: "carousel" as const,
              intent: "teaching" as const,
              slideCount: handoff.referenceCarouselSlideCount ?? 5,
            }
          : null;
    if (legacy) {
      wizard.setImageOutputMode(legacy.mode);
      wizard.setCarouselIntent(legacy.intent);
      wizard.setReferenceCarouselSlideCount(legacy.slideCount);
    } else {
      wizard.setImageOutputMode(handoff.imageOutputMode);
    }
  }
  if (handoff.carouselIntent) wizard.setCarouselIntent(handoff.carouselIntent);
  if (handoff.imageAspectRatio) wizard.setImageAspectRatio(handoff.imageAspectRatio);
  if (handoff.campaignTheme) wizard.setCampaignTheme(handoff.campaignTheme);
  if (handoff.workflowMode) wizard.onWorkflowModeChange(handoff.workflowMode);
  if (handoff.visualStyleId) wizard.selectVisualStyle(handoff.visualStyleId);
  if (handoff.contentResearchApplyRef && wizard.setContentResearchApplyRef) {
    wizard.setContentResearchApplyRef(handoff.contentResearchApplyRef);
  }

  if (handoff.referencePlatform) {
    const imageUrls =
      handoff.referencePostImageUrls ??
      (handoff.referencePostCoverUrl ? [handoff.referencePostCoverUrl] : undefined);
    const loadVideo =
      handoff.workflowMode === "video-only" ||
      Boolean(handoff.referencePostVideoUrl);

    await applyResearchPostReferences(
      {
        platform: handoff.referencePlatform,
        promotionMode: handoff.promotionMode,
        imageUrls,
        coverUrl: handoff.referencePostCoverUrl,
        videoUrl: handoff.referencePostVideoUrl,
        postId: handoff.referencePostId,
        postUrl: handoff.referencePostUrl,
        carouselSlideCount: handoff.referenceCarouselSlideCount,
        loadVideo,
      },
      wizard,
    );
  }

  switch (handoff.recipe) {
    case "8s-website-reel":
      wizard.applyQuickTest8sRecipe();
      break;
    case "cinematic-stitch":
      // Multi-scene stitch out of scope — same as quick 8s.
      wizard.applyQuickTest8sRecipe();
      break;
    case "website-launch-image":
      wizard.onWorkflowModeChange("image-only");
      wizard.applyPrimaryPathConcept("website");
      break;
    case "physical-storyboard":
      wizard.applyPrimaryPath("storyboard");
      break;
    case "physical-image-post":
      wizard.onWorkflowModeChange("image-only");
      wizard.selectVisualStyle("product");
      break;
    case "reference-ad-layout":
      wizard.onWorkflowModeChange("image-only");
      wizard.selectVisualStyle("product");
      wizard.setImageCreativeMode("reference-concept");
      break;
    case "physical-quick":
      wizard.applyPrimaryPath("quick");
      break;
    case "concept-cinematic":
      wizard.applyPrimaryPathConceptVideo("cinematic");
      break;
    default:
      break;
  }

  seedMicroWizardContextFromHandoff(handoff);
  requestMicroWizardRestart();
  wizard.setStepKey("setup");
  wizard.setError(null);

  if (handoff.analyzeBrand && handoff.brandWebsiteUrl) {
    await wizard.analyzeBrand({ websiteUrl: handoff.brandWebsiteUrl });
  }
}
