import type {
  ContentAngleCandidate,
  ContentAngleWizardPatch,
  ContentPlatform,
  ContentResearchPlan,
  ContentResearchPost,
} from "@/lib/content-research-types";
import {
  copyFieldsFromAngle,
  contentResearchPromoteTarget,
  isProductShotReferenceAngle,
  isReferenceSourcedAngle,
  isSingleImageReferenceAngle,
  stripContentResearchStyleExtra,
  styleReferencePromptBlock,
} from "@/lib/content-research-promote";
import type { ImageCreativeMode, VideoCreativeMode } from "@/lib/creative-workflow";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { StudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { applyResearchPostReferences, type ResearchRefAttachResult, type ResearchRefDeps } from "@/lib/content-research-apply-refs";
import {
  formatLabelForAngleFormat,
  inferWizardFromPost,
  isImageCarouselAngle,
  resolveFormatForAngleApply,
  wantsResearchVideoReference,
} from "@/lib/content-research-infer";
import type { ImageInputMode } from "@/lib/image-input-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { resolveReelResearchRouting } from "@/lib/content-research-reel-routing";
import { mergeResearchIdeaRemapIntoPromptExtra } from "@/lib/research-idea-remap";
import {
  DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
  MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
  MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
} from "@/lib/teaching-carousel-types";

function postFromAngle(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
): ContentResearchPost | null {
  const imageUrls =
    angle.sourceImageUrls ??
    (angle.sourceCoverImageUrl ? [angle.sourceCoverImageUrl] : undefined);
  if (!imageUrls?.length && !angle.sourceVideoUrl && !angle.sourceUrl) return null;

  return {
    id: angle.id.replace(/^post-/, ""),
    title: angle.sourceTitle ?? angle.title,
    url: angle.sourceUrl ?? "",
    snippet: angle.hook,
    coverImageUrl: imageUrls?.[0] ?? angle.sourceCoverImageUrl,
    imageUrls,
    videoUrl: angle.sourceVideoUrl,
    mediaType: angle.sourceVideoUrl ? "video" : "image",
    platform: plan.platform,
    author: angle.sourceAuthor,
    likes: angle.sourceLikes,
    collects: angle.sourceCollects,
    comments: angle.sourceComments,
  };
}
function patchFromAngleFormat(
  format: ContentAngleCandidate["format"],
  promotionMode: "physical" | "concept",
  imageCount: number,
  userWorkflowMode?: WorkflowMode,
): Pick<
  ContentAngleWizardPatch,
  "imageOutputMode" | "visualStyleId" | "workflowMode" | "campaignTheme"
> {
  let imageOutputMode: ImageOutputMode = "single";
  let visualStyleId: VisualStyleId | undefined;
  let workflowMode: WorkflowMode | undefined;

  switch (format) {
    case "teaching-carousel":
      imageOutputMode = "teaching-carousel";
      visualStyleId = promotionMode === "concept" ? "info-poster" : "product";
      workflowMode = "image-only";
      break;
    case "campaign":
      imageOutputMode = "campaign";
      visualStyleId = promotionMode === "concept" ? "brand-campaign" : "product";
      workflowMode = "image-only";
      break;
    case "reel":
      imageOutputMode = "single";
      visualStyleId = resolveReelResearchRouting(
        promotionMode,
        userWorkflowMode ?? "video-only",
      ).visualStyleId;
      // Keep the workflow the user already picked in the studio (combined vs video-only).
      workflowMode = undefined;
      break;
    case "model-wear":
      visualStyleId = "model-wear";
      imageOutputMode = "single";
      workflowMode = "image-only";
      break;
    case "single-image":
    default:
      imageOutputMode = "single";
      workflowMode = "image-only";
      visualStyleId = promotionMode === "concept" ? "info-poster" : "product";
      break;
  }

  return {
    imageOutputMode,
    visualStyleId,
    workflowMode,
    campaignTheme: format === "campaign" ? undefined : undefined,
  };
}

function wizardPatchForAngle(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promotionMode: "physical" | "concept",
  promoteProduct?: string,
  userWorkflowMode?: WorkflowMode,
): ContentAngleWizardPatch & { carouselSlideCount?: number; referenceNote?: string } {
  const pinnedReference = isReferenceSourcedAngle(angle);
  const explicitPromoteTarget = promoteProduct?.trim() || "";
  const productName = pinnedReference
    ? explicitPromoteTarget
    : explicitPromoteTarget || plan.topic.trim();
  const post = postFromAngle(angle, plan);
  const imageCount = angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
  const inferred = post ? inferWizardFromPost(post, promotionMode) : null;

  const usePostInference =
    Boolean(inferred) &&
    ((imageCount >= 2 || Boolean(angle.sourceVideoUrl)) ||
      angle.format === "reel" ||
      angle.id.startsWith("post-"));

  const format = resolveFormatForAngleApply(angle, inferred);
  const effectiveFormat =
    isProductShotReferenceAngle(angle) && format === "teaching-carousel"
      ? "single-image"
      : isSingleImageReferenceAngle(angle)
        ? "single-image"
        : format;

  // 圖+片 research: stay on storyboard (never teaching-carousel / image-only).
  // Keep the post's real format for refs — image posts → style images; only real
  // video URLs load an MP4. Do NOT pretend every post is a reel (no fake MP4).
  const combinedLocksStoryboard = userWorkflowMode === "combined";
  const formatFields = patchFromAngleFormat(
    combinedLocksStoryboard ? "reel" : effectiveFormat,
    promotionMode,
    imageCount,
    userWorkflowMode,
  );
  // For attaching refs, use the real post format (not the locked "reel" style).
  const resolvedFormat = combinedLocksStoryboard ? effectiveFormat : effectiveFormat;

  // Concept copy rules:
  // - Planner angle (not pinned ref): headline = angle.hook; conceptIdea = topic.
  // - Pinned ref + explicit promote: rewrite for promote; never paste ref hook.
  // - Pinned ref without promote: empty conceptIdea (do not leak search topic).
  const copyTarget =
    promotionMode === "concept"
      ? explicitPromoteTarget
      : productName;
  const market = plan.market;
  const copy = copyFieldsFromAngle(angle, copyTarget, plan.topic, {
    promotionMode,
    referenceSourced: pinnedReference,
    market,
  });
  const conceptIdeaPatch =
    promotionMode === "concept"
      ? explicitPromoteTarget || (pinnedReference ? "" : plan.topic.trim())
      : isProductShotReferenceAngle(angle)
        ? ""
        : productName
          ? `${productName} — ${plan.platformLabel} style (from research)`
          : "";
  const promoteTargetRaw = contentResearchPromoteTarget(promotionMode, {
    product: promotionMode === "physical" ? copyTarget : "",
    headline: copy.headline,
    conceptIdea: conceptIdeaPatch,
    searchTopic: plan.topic,
  });
  // Pinned style-ref without an explicit promote target must not invent one
  // from search topic or a fallback headline (leaks into promptExtra).
  const promoteTarget =
    promotionMode === "concept" && pinnedReference && !explicitPromoteTarget
      ? ""
      : promoteTargetRaw;
  const styleExtra = isProductShotReferenceAngle(angle)
    ? ""
    : styleReferencePromptBlock(
        angle,
        plan,
        promoteTarget,
        usePostInference ? inferred?.referenceNote : undefined,
        market,
      );

  // Video / reel research: keep structure, remap idea onto user product/concept.
  const wantsIdeaRemap =
    effectiveFormat === "reel" ||
    Boolean(angle.sourceVideoUrl) ||
    userWorkflowMode === "video-only" ||
    userWorkflowMode === "combined";
  const promptExtra =
    wantsIdeaRemap && (promoteTarget || productName)
      ? mergeResearchIdeaRemapIntoPromptExtra(styleExtra, {
          promotionMode,
          productOrConcept:
            promoteTarget ||
            productName ||
            (promotionMode === "concept" ? conceptIdeaPatch : productName),
          headline: copy.headline,
          subline: copy.subline,
          offer: copy.offer,
          referenceHook: angle.hook,
          referenceTitle: angle.sourceTitle ?? angle.title,
          referenceStructure: [
            angle.format,
            angle.whyItWorks,
          ]
            .filter(Boolean)
            .join(" · "),
        })
      : styleExtra;

  return {
    headline: copy.headline,
    subline: copy.subline,
    offer: copy.offer,
    conceptIdea: conceptIdeaPatch,
    product: promotionMode === "physical" ? productName : "",
    promptExtra,
    imageOutputMode: combinedLocksStoryboard ? "single" : formatFields.imageOutputMode,
    visualStyleId: combinedLocksStoryboard
      ? "storyboard-video"
      : (formatFields.visualStyleId ?? inferred?.visualStyleId),
    workflowMode: combinedLocksStoryboard
      ? "combined"
      : effectiveFormat === "reel"
        ? userWorkflowMode
        : formatFields.workflowMode ?? inferred?.workflowMode,
    imageAspectRatio: combinedLocksStoryboard
      ? "9:16"
      : (inferred?.imageAspectRatio ?? aspectForPlatform(plan.platform)),
    campaignTheme:
      !combinedLocksStoryboard &&
      (angle.format === "campaign" || format === "campaign")
        ? `${productName} series`
        : undefined,
    carouselSlideCount: combinedLocksStoryboard
      ? undefined
      : format === "teaching-carousel"
        ? Math.min(
            MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
            Math.max(
              MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
              imageCount || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
            ),
          )
        : inferred?.carouselSlideCount,
    referenceNote: inferred?.referenceNote,
    resolvedFormat,
  };
}

function aspectForPlatform(platform: ContentPlatform): ImageAspectRatio {
  if (platform === "tiktok") return "9:16";
  return "4:5";
}

export function buildContentAngleHandoff(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promotionMode: "physical" | "concept",
  promoteProduct?: string,
  userWorkflowMode?: WorkflowMode,
): StudioAssistantHandoff {
  const patch = wizardPatchForAngle(angle, plan, promotionMode, promoteProduct, userWorkflowMode);
  const referenceSourced = isReferenceSourcedAngle(angle);
  const imageUrls =
    angle.sourceImageUrls ??
    (angle.sourceCoverImageUrl ? [angle.sourceCoverImageUrl] : undefined);

  return {
    promotionMode,
    headline: patch.headline,
    subline: patch.subline,
    offer: patch.offer,
    conceptIdea: patch.conceptIdea,
    product: patch.product || undefined,
    campaignGoal: patch.conceptIdea,
    promptExtra: patch.promptExtra,
    imageOutputMode: patch.imageOutputMode,
    visualStyleId: patch.visualStyleId,
    workflowMode:
      patch.resolvedFormat === "reel" ? userWorkflowMode ?? "video-only" : patch.workflowMode,
    imageAspectRatio: patch.imageAspectRatio,
    campaignTheme: patch.campaignTheme,
    assistantNote: "content-angle",
    referencePostCoverUrl: imageUrls?.[0] ?? angle.sourceCoverImageUrl,
    referencePostImageUrls: imageUrls,
    referencePostVideoUrl:
      patch.resolvedFormat === "reel" ? angle.sourceVideoUrl : undefined,
    referencePostId: angle.id.replace(/^post-/, ""),
    referencePostUrl: angle.sourceUrl,
    referencePostTitle: angle.sourceTitle,
    referencePlatform: plan.platform,
    referenceCarouselSlideCount: patch.carouselSlideCount,
    contentResearchApplyRef: referenceSourced
      ? {
          angle,
          plan: {
            platform: plan.platform,
            platformLabel: plan.platformLabel,
            topic: plan.topic,
            market: plan.market,
          },
        }
      : undefined,
  };
}

export type ContentAngleWizardApi = {
  setHeadline: (v: string) => void;
  setSubline: (v: string) => void;
  setOffer: (v: string) => void;
  setConceptIdea: (v: string) => void;
  setProduct: (v: string) => void;
  setPromptExtra: (v: string | ((prev: string) => string)) => void;
  setImageOutputMode: (v: ImageOutputMode) => void;
  setImageAspectRatio?: (v: ImageAspectRatio) => void;
  setCampaignTheme?: (v: string) => void;
  selectVisualStyle?: (id: VisualStyleId) => void;
  onWorkflowModeChange?: (mode: WorkflowMode) => void;
  setImageRefPhoto?: (file: File | null) => void;
  setImageCreativeMode?: (mode: ImageCreativeMode) => void;
  setExtraKitPhotos?: (files: File[]) => void;
  onImageInputModeChange?: (mode: ImageInputMode) => void;
  onVideoCreativeModeChange?: (mode: VideoCreativeMode) => void;
  onReferenceAdFile?: (file: File | null) => void;
  setReferenceCarouselSlideCount?: (count: number) => void;
  setCinematicSceneCount?: (count: 1 | 2 | 3 | 4 | 5 | 6) => void;
  setContentResearchApplyRef?: (ref: ContentResearchApplyRef | null) => void;
  setReferenceClipLoading?: (busy: boolean) => void;
  setError?: (message: string | null) => void;
};

export type ContentAngleApplyResult = {
  patch: ContentAngleWizardPatch;
  refs: ResearchRefAttachResult;
};

export type ContentResearchApplyRef = {
  angle: ContentAngleCandidate;
  plan: Pick<ContentResearchPlan, "platform" | "platformLabel" | "topic" | "market">;
};

export async function applyContentAngleToWizard(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promotionMode: "physical" | "concept",
  wizard: ContentAngleWizardApi,
  promoteProduct?: string,
  refDeps?: ResearchRefDeps,
  userWorkflowMode?: WorkflowMode,
): Promise<ContentAngleApplyResult & { researchRef?: ContentResearchApplyRef }> {
  const patch = wizardPatchForAngle(angle, plan, promotionMode, promoteProduct, userWorkflowMode);
  const imageUrls =
    angle.sourceImageUrls ??
    (angle.sourceCoverImageUrl ? [angle.sourceCoverImageUrl] : undefined);
  const imageCount = imageUrls?.length ?? 0;

  wizard.setHeadline(patch.headline);
  wizard.setSubline(patch.subline);
  if (patch.offer) wizard.setOffer(patch.offer);
  if (promotionMode === "concept") {
    if (patch.conceptIdea.trim()) {
      wizard.setConceptIdea(patch.conceptIdea);
    }
  } else {
    wizard.setConceptIdea(patch.conceptIdea);
  }
  if (patch.product) wizard.setProduct(patch.product);
  wizard.setPromptExtra((prev) => {
    const withoutPriorResearch = stripContentResearchStyleExtra(prev);
    return [withoutPriorResearch.trim(), patch.promptExtra].filter(Boolean).join(" | ");
  });
  if (patch.workflowMode && wizard.onWorkflowModeChange && patch.resolvedFormat !== "reel") {
    // Never demote 圖+片 research into image-only / teaching-carousel.
    if (userWorkflowMode !== "combined") {
      wizard.onWorkflowModeChange(patch.workflowMode);
    }
  }
  if (userWorkflowMode === "combined") {
    wizard.setImageOutputMode("single");
    wizard.selectVisualStyle?.("storyboard-video");
    wizard.setImageAspectRatio?.("9:16");
  } else {
    wizard.setImageOutputMode(patch.imageOutputMode);
    if (patch.imageAspectRatio && wizard.setImageAspectRatio) {
      wizard.setImageAspectRatio(patch.imageAspectRatio);
    }
    if (patch.campaignTheme && wizard.setCampaignTheme) {
      wizard.setCampaignTheme(patch.campaignTheme);
    }
    if (patch.visualStyleId && wizard.selectVisualStyle) {
      wizard.selectVisualStyle(patch.visualStyleId);
    }
  }
  if (patch.carouselSlideCount && wizard.setReferenceCarouselSlideCount) {
    wizard.setReferenceCarouselSlideCount(patch.carouselSlideCount);
  }
  // Do NOT set contentResearchApplyRef yet — unlocking Continue mid-download
  // skips wait.reel_* and dumps users on setup while analysis races.

  const loadVideo = wantsResearchVideoReference(
    patch.resolvedFormat ?? angle.format,
    imageCount,
    angle.sourceVideoUrl,
  );

  if (!loadVideo) {
    wizard.onReferenceAdFile?.(null);
  }

  let refs: ResearchRefAttachResult = {
    coverAttached: false,
    videoRequested: false,
    videoAttached: false,
  };

  if (
    wizard.setImageRefPhoto &&
    wizard.setImageCreativeMode &&
    wizard.onVideoCreativeModeChange &&
    wizard.onReferenceAdFile
  ) {
    refs = await applyResearchPostReferences(
      {
        platform: plan.platform,
        promotionMode,
        imageUrls,
        videoUrl: angle.sourceVideoUrl,
        postId: angle.id.replace(/^post-/, ""),
        postUrl: angle.sourceUrl,
        carouselSlideCount: patch.carouselSlideCount,
        loadVideo,
      },
      {
        setImageCreativeMode: wizard.setImageCreativeMode,
        setImageRefPhoto: wizard.setImageRefPhoto,
        setExtraKitPhotos: wizard.setExtraKitPhotos,
        onImageInputModeChange: wizard.onImageInputModeChange,
        onVideoCreativeModeChange: wizard.onVideoCreativeModeChange,
        onReferenceAdFile: wizard.onReferenceAdFile,
        setReferenceCarouselSlideCount: wizard.setReferenceCarouselSlideCount,
        setReferenceClipLoading: wizard.setReferenceClipLoading,
      },
      refDeps,
    );
  }

  wizard.setContentResearchApplyRef?.({ angle, plan });

  return {
    patch,
    refs,
    researchRef: { angle, plan },
  };
}

export { formatLabelForAngleFormat };
