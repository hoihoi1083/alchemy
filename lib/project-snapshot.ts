import type { AdPackPlan, CaptionLine } from "@/lib/ad-pack-types";
import type { ArtStyleId } from "@/lib/art-style";
import type { BrandProfile } from "@/lib/brand-profile";
import type { CampaignPlan } from "@/lib/campaign-types";
import type { ContentResearchPlan } from "@/lib/content-research-types";
import type { ImageCreativeMode, VideoCreativeMode } from "@/lib/creative-workflow";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageInputMode } from "@/lib/image-input-mode";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import type { TemplateId } from "@/lib/templates";
import type { TeachingCarouselPlan } from "@/lib/teaching-carousel-types";
import type { UserReferenceBrief } from "@/lib/user-reference-brief";
import type { VideoStoryboardPlan } from "@/lib/video-storyboard-types";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";

/** Serializable wizard state — no File blobs; URLs only for media. */
export type ProjectInputs = {
  product: string;
  headline: string;
  subline: string;
  business: string;
  offer: string;
  conceptIdea: string;
  promptExtra: string;
  promptMarket: PromptMarket;
  subjectFraming: SubjectFraming;
  campaignTheme: string;
  brandWebsiteUrl: string;
  brandSocialHint: string;
  creativeVideoBrief: string;
  storyboardBrief: string;
  contentResearchTopic: string;
  contentResearchProduct: string;
};

export type ProjectSettings = {
  workflowMode: WorkflowMode;
  visualStyleId: VisualStyleId;
  artStyleId: ArtStyleId;
  templateId: TemplateId;
  promotionMode: PromotionMode;
  imageCreativeMode: ImageCreativeMode;
  videoCreativeMode: VideoCreativeMode;
  imageOutputMode: ImageOutputMode;
  imageAspectRatio: ImageAspectRatio;
  imageInputMode: ImageInputMode;
  stepKey: WorkflowStepKey;
};

export type ProjectPrompts = {
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
};

export type ProjectPlans = {
  brandProfile: BrandProfile | null;
  userReferenceBrief: UserReferenceBrief | null;
  campaignPlan: CampaignPlan | null;
  teachingCarouselPlan: TeachingCarouselPlan | null;
  storyboardPlan: VideoStoryboardPlan | null;
  adPackPlan: AdPackPlan | null;
  contentResearchPlan: ContentResearchPlan | null;
  selectedResearchAngleId: string | null;
};

export type ProjectMediaUrls = {
  imageUrl: string | null;
  imageVariantUrls: string[];
  videoUrl: string | null;
  uploadPreviewUrl: string | null;
  imageRefPreviewUrl: string | null;
  campaignSlideUrls: string[];
  storyboardSceneUrls: string[];
  carouselSlideUrls: string[];
};

export type ProjectOutputs = {
  captionLines: CaptionLine[];
};

export type ProjectSnapshot = {
  version: 1;
  inputs: ProjectInputs;
  settings: ProjectSettings;
  prompts: ProjectPrompts;
  plans: ProjectPlans;
  media: ProjectMediaUrls;
  outputs: ProjectOutputs;
};

export const EMPTY_PROJECT_SNAPSHOT = (promotionMode: PromotionMode): ProjectSnapshot => ({
  version: 1,
  inputs: {
    product: "",
    headline: "",
    subline: "",
    business: "",
    offer: "",
    conceptIdea: "",
    promptExtra: "",
    promptMarket: "hk",
    subjectFraming: "auto",
    campaignTheme: "",
    brandWebsiteUrl: "",
    brandSocialHint: "",
    creativeVideoBrief: "",
    storyboardBrief: "",
    contentResearchTopic: "",
    contentResearchProduct: "",
  },
  settings: {
    workflowMode: "combined",
    visualStyleId: promotionMode === "concept" ? "service-promo" : "product",
    artStyleId: "realistic",
    templateId: promotionMode === "concept" ? "service-promo" : "product-reel",
    promotionMode,
    imageCreativeMode: "promo-ai",
    videoCreativeMode: "product-promo",
    imageOutputMode: "single",
    imageAspectRatio: promotionMode === "concept" ? "4:5" : "9:16",
    imageInputMode: "product-ad",
    stepKey: "setup",
  },
  prompts: { imagePrompt: "", videoPrompt: "", negativePrompt: "" },
  plans: {
    brandProfile: null,
    userReferenceBrief: null,
    campaignPlan: null,
    teachingCarouselPlan: null,
    storyboardPlan: null,
    adPackPlan: null,
    contentResearchPlan: null,
    selectedResearchAngleId: null,
  },
  media: {
    imageUrl: null,
    imageVariantUrls: [],
    videoUrl: null,
    uploadPreviewUrl: null,
    imageRefPreviewUrl: null,
    campaignSlideUrls: [],
    storyboardSceneUrls: [],
    carouselSlideUrls: [],
  },
  outputs: { captionLines: [] },
});
