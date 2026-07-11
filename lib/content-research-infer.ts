import type {
  ContentAngleCandidate,
  ContentAngleFormat,
  ContentPlatform,
  ContentResearchPost,
} from "@/lib/content-research-types";
import {
  DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
  MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
} from "@/lib/teaching-carousel-types";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { resolveReelResearchRouting } from "@/lib/content-research-reel-routing";

const MODEL_WEAR_RE =
  /穿搭|上身|試穿|ootd|outfit|model.?wear|try.?on|wearable|styling look|搭配/i;

const EDU_CAROUSEL_RE =
  /教程|攻略|避雷|干货|tips|how to|guide|checklist|步驟|步骤|懶人包|懒人包|carousel|輪播|轮播/i;

export type InferredPostWizard = {
  format: ContentAngleFormat;
  formatLabel: string;
  imageOutputMode: ImageOutputMode;
  visualStyleId?: VisualStyleId;
  workflowMode?: WorkflowMode;
  imageAspectRatio: ImageAspectRatio;
  imageCreativeMode: ImageCreativeMode;
  carouselSlideCount?: number;
  referenceNote?: string;
};

function aspectForPlatform(platform: ContentPlatform): ImageAspectRatio {
  if (platform === "tiktok") return "9:16";
  return "4:5";
}

function imageCountOf(post: Pick<ContentResearchPost, "imageUrls" | "coverImageUrl">): number {
  if (post.imageUrls?.length) return post.imageUrls.length;
  return post.coverImageUrl ? 1 : 0;
}

function isModelWearPost(post: ContentResearchPost): boolean {
  const blob = `${post.title} ${post.snippet}`;
  return MODEL_WEAR_RE.test(blob);
}

function isEduCarouselPost(post: ContentResearchPost): boolean {
  const blob = `${post.title} ${post.snippet}`;
  return EDU_CAROUSEL_RE.test(blob) || imageCountOf(post) >= 3;
}

export function inferFormatFromPost(post: ContentResearchPost): ContentAngleFormat {
  const count = imageCountOf(post);
  if (isModelWearPost(post)) return "model-wear";
  // Multi-image edu carousels stay carousels even when the scraper also exposes a videoUrl.
  if (count >= 3 || (count >= 2 && isEduCarouselPost(post))) return "teaching-carousel";
  if (post.mediaType === "video" || post.videoUrl) return "reel";
  if (count === 2 && post.platform === "facebook") return "campaign";
  return "single-image";
}

/** Formats chosen by research cards should not be overridden by post inference. */
const PINNED_ANGLE_FORMATS = new Set<ContentAngleFormat>([
  "teaching-carousel",
  "campaign",
  "model-wear",
  "single-image",
  "reel",
]);

export function resolveFormatForAngleApply(
  angle: Pick<
    ContentAngleCandidate,
    "format" | "id" | "sourceVideoUrl" | "sourceImageUrls" | "sourceCoverImageUrl"
  >,
  inferred: InferredPostWizard | null,
): ContentAngleFormat {
  if (PINNED_ANGLE_FORMATS.has(angle.format)) return angle.format;

  const imageCount =
    angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
  const usePostInference =
    Boolean(inferred) &&
    ((imageCount >= 2 || Boolean(angle.sourceVideoUrl)) || angle.id.startsWith("post-"));

  if (usePostInference && inferred) return inferred.format;
  return angle.format;
}

export function inferWizardFromPost(
  post: ContentResearchPost,
  promotionMode: "physical" | "concept",
): InferredPostWizard {
  const format = inferFormatFromPost(post);
  const count = imageCountOf(post);
  const aspect = aspectForPlatform(post.platform);

  let imageOutputMode: ImageOutputMode = "single";
  let visualStyleId: VisualStyleId | undefined;
  let workflowMode: WorkflowMode | undefined;
  let formatLabel = "Single image";
  let carouselSlideCount: number | undefined;
  let referenceNote: string | undefined;

  switch (format) {
    case "reel":
      imageOutputMode = "single";
      workflowMode = promotionMode === "physical" ? "combined" : "video-only";
      visualStyleId = resolveReelResearchRouting(promotionMode, workflowMode).visualStyleId;
      formatLabel = "Reel / short video";
      break;
    case "teaching-carousel":
      imageOutputMode = "teaching-carousel";
      workflowMode = "image-only";
      visualStyleId = promotionMode === "concept" ? "info-poster" : "product";
      formatLabel = count > 1 ? `Carousel · ${count} slides` : "Teaching carousel";
      carouselSlideCount = Math.min(
        MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
        Math.max(DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT, count || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
      );
      referenceNote =
        count > 1
          ? `Reference post is a ${count}-image carousel — match palette, typography rhythm, and slide pacing (style-only; new layouts per slide).`
          : undefined;
      break;
    case "campaign":
      imageOutputMode = "campaign";
      workflowMode = "image-only";
      visualStyleId = promotionMode === "concept" ? "brand-campaign" : "product";
      formatLabel = count > 1 ? `Campaign · ${count} images` : "Campaign series";
      referenceNote =
        count > 1 ? `Reference post has ${count} promo frames — adapt series structure for your product.` : undefined;
      break;
    case "model-wear":
      imageOutputMode = "single";
      workflowMode = "image-only";
      visualStyleId = "model-wear";
      formatLabel = "Model wear";
      break;
    case "single-image":
    default:
      imageOutputMode = "single";
      workflowMode = post.platform === "tiktok" ? "video-only" : "image-only";
      visualStyleId = promotionMode === "concept" ? "info-poster" : "product";
      formatLabel = "Single image";
      break;
  }

  return {
    format,
    formatLabel,
    imageOutputMode,
    visualStyleId,
    workflowMode,
    imageAspectRatio: aspect,
    imageCreativeMode: "reference-concept",
    carouselSlideCount,
    referenceNote,
  };
}

export function formatLabelForAngleFormat(format: ContentAngleFormat, imageCount?: number): string {
  switch (format) {
    case "teaching-carousel":
      return imageCount && imageCount > 1 ? `Carousel · ${imageCount} slides` : "Teaching carousel";
    case "campaign":
      return imageCount && imageCount > 1 ? `Campaign · ${imageCount} images` : "Campaign series";
    case "reel":
      return "Reel / short video";
    case "model-wear":
      return "Model wear";
    default:
      return "Single image";
  }
}

export function isImageCarouselAngle(
  format: ContentAngleFormat,
  imageCount: number,
): boolean {
  return (
    format === "teaching-carousel" ||
    format === "campaign" ||
    imageCount >= 2
  );
}

/** Reel / video posts: attach reference MP4 for reference-to-video (not carousel stills). */
export function wantsResearchVideoReference(
  format: ContentAngleFormat,
  imageCount: number,
  sourceVideoUrl?: string,
): boolean {
  return (
    !isImageCarouselAngle(format, imageCount) &&
    (Boolean(sourceVideoUrl?.trim()) || format === "reel")
  );
}
