import type { StudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { applyResearchPostReferences } from "@/lib/content-research-apply-refs";
import { initialCoachTaskAfterHandoff } from "@/lib/studio-assistant-handoff-coach";
import { dispatchCoachSpotlight } from "@/lib/studio-assistant-spotlight-bus";
import type { StudioWizardValue } from "@/hooks/useStudioWizard";

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
  if (handoff.imageOutputMode) wizard.setImageOutputMode(handoff.imageOutputMode);
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
      wizard.applyCinematicStitchRecipe();
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

  wizard.setStepKey("setup");
  wizard.setError(null);

  if (handoff.analyzeBrand && handoff.brandWebsiteUrl) {
    await wizard.analyzeBrand({ websiteUrl: handoff.brandWebsiteUrl });
  }

  const spotlightTask = initialCoachTaskAfterHandoff(handoff);
  if (spotlightTask && typeof window !== "undefined") {
    window.setTimeout(() => dispatchCoachSpotlight(spotlightTask), 400);
  }
}
