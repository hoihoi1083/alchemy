import type {
  ContentAngleCandidate,
  ContentAngleWizardPatch,
  ContentPlatform,
  ContentResearchPlan,
  ContentResearchPost,
} from "@/lib/content-research-types";
import {
  copyFieldsFromAngle,
  promoteProductName,
  styleReferencePromptBlock,
} from "@/lib/content-research-promote";
import type { ImageCreativeMode, VideoCreativeMode } from "@/lib/creative-workflow";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { StudioAssistantHandoff } from "@/lib/studio-assistant-handoff";
import { fetchResearchImagesAsFiles } from "@/lib/fetch-research-cover";
import { fetchResearchVideoAsFile } from "@/lib/fetch-research-video";
import {
  formatLabelForAngleFormat,
  inferWizardFromPost,
  isImageCarouselAngle,
} from "@/lib/content-research-infer";
import { resolveResearchPostVideo } from "@/lib/resolve-research-video";
import type { ImageInputMode } from "@/lib/image-input-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

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
      workflowMode = "video-only";
      visualStyleId = promotionMode === "concept" ? "concept-cinematic" : "storyboard-video";
      imageOutputMode = "single";
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
): ContentAngleWizardPatch & { carouselSlideCount?: number; referenceNote?: string } {
  const productName = promoteProductName(promoteProduct, plan.topic);
  const post = postFromAngle(angle, plan);
  const imageCount = angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
  const inferred = post ? inferWizardFromPost(post, promotionMode) : null;

  const usePostInference =
    Boolean(inferred) &&
    ((imageCount >= 2 || Boolean(angle.sourceVideoUrl)) ||
      angle.format === "reel" ||
      angle.id.startsWith("post-"));

  const format =
    angle.format === "campaign" || angle.format === "reel"
      ? angle.format
      : usePostInference && inferred
        ? inferred.format
        : angle.format;
  const formatFields = patchFromAngleFormat(format, promotionMode, imageCount);

  const copy = copyFieldsFromAngle(angle, productName, plan.topic);
  let promptExtra = styleReferencePromptBlock(
    angle,
    plan,
    productName,
    usePostInference ? inferred?.referenceNote : undefined,
  );

  return {
    headline: copy.headline,
    subline: copy.subline,
    offer: copy.offer,
    conceptIdea: productName
      ? `${productName} — ${plan.platformLabel} style (from research)`
      : `${plan.topic} — ${angle.title}`,
    product: promotionMode === "physical" ? productName : "",
    promptExtra,
    imageOutputMode: formatFields.imageOutputMode,
    visualStyleId: formatFields.visualStyleId ?? inferred?.visualStyleId,
    workflowMode: formatFields.workflowMode ?? inferred?.workflowMode,
    imageAspectRatio: inferred?.imageAspectRatio ?? aspectForPlatform(plan.platform),
    campaignTheme:
      angle.format === "campaign" || format === "campaign"
        ? `${productName} series`
        : undefined,
    carouselSlideCount: inferred?.carouselSlideCount,
    referenceNote: inferred?.referenceNote,
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
): StudioAssistantHandoff {
  const patch = wizardPatchForAngle(angle, plan, promotionMode, promoteProduct);
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
    workflowMode: patch.workflowMode,
    imageAspectRatio: patch.imageAspectRatio,
    campaignTheme: patch.campaignTheme,
    assistantNote: "content-angle",
    referencePostCoverUrl: imageUrls?.[0] ?? angle.sourceCoverImageUrl,
    referencePostImageUrls: imageUrls,
    referencePostVideoUrl: angle.sourceVideoUrl,
    referencePostId: angle.id.replace(/^post-/, ""),
    referencePostUrl: angle.sourceUrl,
    referencePostTitle: angle.sourceTitle,
    referencePlatform: plan.platform,
    referenceCarouselSlideCount: patch.carouselSlideCount,
    ...(patch.workflowMode === "video-only"
      ? { recipe: promotionMode === "concept" ? "concept-cinematic" : "physical-storyboard" }
      : {}),
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
};

export async function applyContentAngleToWizard(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promotionMode: "physical" | "concept",
  wizard: ContentAngleWizardApi,
  promoteProduct?: string,
): Promise<ContentAngleWizardPatch> {
  const patch = wizardPatchForAngle(angle, plan, promotionMode, promoteProduct);
  const imageUrls =
    angle.sourceImageUrls ??
    (angle.sourceCoverImageUrl ? [angle.sourceCoverImageUrl] : undefined);
  const imageCount = imageUrls?.length ?? 0;

  wizard.setHeadline(patch.headline);
  wizard.setSubline(patch.subline);
  if (patch.offer) wizard.setOffer(patch.offer);
  wizard.setConceptIdea(patch.conceptIdea);
  if (patch.product) wizard.setProduct(patch.product);
  wizard.setPromptExtra((prev) =>
    [prev.trim(), patch.promptExtra].filter(Boolean).join(" | "),
  );
  wizard.setImageOutputMode(patch.imageOutputMode);
  if (patch.imageAspectRatio && wizard.setImageAspectRatio) {
    wizard.setImageAspectRatio(patch.imageAspectRatio);
  }
  if (patch.campaignTheme && wizard.setCampaignTheme) {
    wizard.setCampaignTheme(patch.campaignTheme);
  }
  if (patch.workflowMode && wizard.onWorkflowModeChange) {
    wizard.onWorkflowModeChange(patch.workflowMode);
  }
  if (patch.visualStyleId && wizard.selectVisualStyle) {
    wizard.selectVisualStyle(patch.visualStyleId);
  }
  if (patch.carouselSlideCount && wizard.setReferenceCarouselSlideCount) {
    wizard.setReferenceCarouselSlideCount(patch.carouselSlideCount);
  }

  if (imageUrls?.length && wizard.setImageRefPhoto && wizard.setImageCreativeMode) {
    wizard.setImageCreativeMode("reference-concept");
    if (promotionMode === "concept" && wizard.onImageInputModeChange) {
      wizard.onImageInputModeChange("reference");
    }
    const files = await fetchResearchImagesAsFiles(imageUrls, plan.platform);
    if (files[0]) wizard.setImageRefPhoto(files[0]);
    if (files.length > 1 && wizard.setExtraKitPhotos) {
      wizard.setExtraKitPhotos(files.slice(1));
    }
  }

  const wantsVideoRef =
    !isImageCarouselAngle(angle.format, imageCount) &&
    (Boolean(angle.sourceVideoUrl) || angle.format === "reel");

  if (wantsVideoRef) {
    let videoUrl = angle.sourceVideoUrl;
    if (!videoUrl && angle.sourceUrl) {
      const postId = angle.id.replace(/^post-/, "");
      videoUrl = (await resolveResearchPostVideo(plan.platform, postId, angle.sourceUrl)) ?? undefined;
    }
    if (videoUrl) {
      if (wizard.onVideoCreativeModeChange) {
        wizard.onVideoCreativeModeChange("reference-concept");
      }
      if (wizard.onReferenceAdFile) {
        const videoFile = await fetchResearchVideoAsFile(
          videoUrl,
          plan.platform,
          `${plan.platform}-reference.mp4`,
        );
        if (videoFile) wizard.onReferenceAdFile(videoFile);
      }
    }
  }

  return patch;
}

export { formatLabelForAngleFormat };
