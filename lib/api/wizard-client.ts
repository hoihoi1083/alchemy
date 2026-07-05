import { apiPostForm, apiPostJson } from "@/lib/api/studio-api";
import type { CampaignPlan } from "@/lib/campaign-types";
import type {
  StoryboardSceneResult,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";

export type GenerateImageJsonBody = {
  prompt: string;
  endpoint: string;
  aspect_ratio: string;
  num_images?: number;
  image_urls?: string[];
  mode?: "refine" | "text";
};

export type GenerateImageResult = {
  imageUrl?: string;
  imageUrls?: string[];
  endpoint?: string;
};

export type StoryboardImagesResult = {
  scenes: StoryboardSceneResult[];
  plan: VideoStoryboardPlan;
  seedancePrompt: string;
  endpoint?: string;
};

export type CampaignGenerateResult = {
  slides: Array<{
    role: string;
    title: string;
    headline: string;
    subline: string;
    imageUrl: string;
  }>;
  plan: CampaignPlan;
  endpoint?: string;
};

export type ComposeResult = {
  imageUrl?: string;
  videoUrl?: string;
  bgmAdded?: boolean;
};

export type GenerateVideoResult = {
  videoUrl: string;
  generationMode?: string;
  endpoint?: string;
  note?: string;
  referenceVideoCount?: number;
  referenceImageCount?: number;
};

export type PlanVideoPromptResult = {
  prompt: string;
  note?: string;
};

export type AnalyzeBrandResult = {
  profile: unknown;
  note?: string;
};

export async function postGenerateImage(fd: FormData): Promise<GenerateImageResult> {
  return apiPostForm("/api/generate-image", fd);
}

export async function postGenerateImageJson(
  body: GenerateImageJsonBody,
): Promise<GenerateImageResult> {
  return apiPostJson("/api/generate-image", body);
}

export async function postStoryboardImages(fd: FormData): Promise<StoryboardImagesResult> {
  return apiPostForm("/api/generate-storyboard-images", fd);
}

export async function postCampaign(fd: FormData): Promise<CampaignGenerateResult> {
  return apiPostForm("/api/generate-campaign", fd);
}

export async function postCompose(fd: FormData): Promise<ComposeResult> {
  return apiPostForm("/api/compose", fd);
}

export async function postGenerateVideo(fd: FormData): Promise<GenerateVideoResult> {
  return apiPostForm("/api/generate", fd);
}

export async function postAddBgm(body: {
  video_url: string;
  bgm_track: string;
}): Promise<{ videoUrl: string }> {
  return apiPostJson("/api/add-bgm", body);
}

export type PlanProductVideoResult = {
  plan: import("@/lib/product-video-types").ProductVideoPlan;
  sourceNote?: string;
};

export async function postPlanProductVideo(fd: FormData): Promise<PlanProductVideoResult> {
  return apiPostForm("/api/plan-product-video", fd);
}

export async function postPlanVideoPrompt(body: Record<string, unknown>): Promise<PlanVideoPromptResult> {
  return apiPostJson("/api/plan-video-prompt", body);
}

export async function postAnalyzeBrand(body: {
  websiteUrl: string;
  socialHint?: string;
}): Promise<AnalyzeBrandResult> {
  return apiPostJson("/api/analyze-brand", body);
}

export async function postExportEditPack(payload: unknown): Promise<{
  content: string;
  filename: string;
}> {
  return apiPostJson("/api/export-edit-pack", payload);
}
