import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

export const CONTENT_PLATFORMS = [
  "xiaohongshu",
  "instagram",
  "tiktok",
  "facebook",
] as const;

export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_ANGLE_FORMATS = [
  "teaching-carousel",
  "single-image",
  "campaign",
  "reel",
  "model-wear",
] as const;

export type ContentAngleFormat = (typeof CONTENT_ANGLE_FORMATS)[number];

export type ContentAngleCandidate = {
  id: string;
  title: string;
  hook: string;
  scriptOutline: string;
  format: ContentAngleFormat;
  formatLabel: string;
  whyItWorks: string;
  bulletPoints: string[];
  cta: string;
  score: number;
  /** Real post/article this angle was inferred from (live web research). */
  sourceUrl?: string;
  sourceTitle?: string;
  /** Matched platform post preview (when Just One API returns posts). */
  sourceCoverImageUrl?: string;
  /** All image URLs from the source post (carousel / multi-image). */
  sourceImageUrls?: string[];
  sourceVideoUrl?: string;
  sourceAuthor?: string;
  sourceLikes?: number;
  sourceCollects?: number;
  sourceComments?: number;
};

export type ContentResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

/** Visual post card from live platform search (e.g. Xiaohongshu via Just One API). */
export type ContentResearchPost = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  coverImageUrl?: string;
  /** All still images when the post is a carousel or multi-image note. */
  imageUrls?: string[];
  /** Direct MP4 URL when the post is a video/reel. */
  videoUrl?: string;
  mediaType?: "image" | "video";
  author?: string;
  likes?: number;
  collects?: number;
  comments?: number;
  platform: ContentPlatform;
};

export type ContentResearchSearchProvider =
  | "tavily"
  | "serper"
  | "justoneapi";

export type ContentResearchMode = "live-web" | "playbook";

/** Narrow research to still-image posts or video/reels. */
export type ContentResearchMediaFilter = "image" | "video";

export type ContentResearchPlan = {
  platform: ContentPlatform;
  platformLabel: string;
  topic: string;
  summary: string;
  researchMode: ContentResearchMode;
  searchProvider?: ContentResearchSearchProvider;
  sources?: ContentResearchSource[];
  /** Rich post previews when platform search returns media + engagement. */
  posts?: ContentResearchPost[];
  /** Why post cards are missing (e.g. API fell back to Tavily). */
  researchWarning?: string;
  /** image = carousel/stills only; video = reels/clips only */
  mediaFilter?: ContentResearchMediaFilter;
  candidates: ContentAngleCandidate[];
  topPicks: ContentAngleCandidate[];
};

export type ContentResearchRequest = {
  topic: string;
  platform: ContentPlatform;
  market?: PromptMarket;
  promotionMode?: "physical" | "concept";
  product?: string;
  business?: string;
  /** When set, only return image/carousel or video/reel posts. */
  mediaFilter?: ContentResearchMediaFilter;
};

export type ContentAngleWizardPatch = {
  headline: string;
  subline: string;
  offer: string;
  conceptIdea: string;
  product: string;
  promptExtra: string;
  imageOutputMode: ImageOutputMode;
  visualStyleId?: VisualStyleId;
  workflowMode?: WorkflowMode;
  imageAspectRatio?: ImageAspectRatio;
  campaignTheme?: string;
  /** Format after resolveFormatForAngleApply (may differ from angle.format when post inference overrides). */
  resolvedFormat?: ContentAngleFormat;
};
