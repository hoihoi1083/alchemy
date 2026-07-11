import type { PromotionMode } from "@/lib/promotion-mode";
import { storePromotionMode } from "@/lib/promotion-mode";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";

export const STUDIO_ASSISTANT_HANDOFF_KEY = "alchemy-studio-assistant-handoff";

export type StudioAssistantHandoffRecipe =
  | "8s-website-reel"
  | "cinematic-stitch"
  | "website-launch-image"
  | "physical-storyboard"
  | "physical-quick"
  | "physical-image-post"
  | "reference-ad-layout"
  | "concept-cinematic";

export type StudioAssistantHandoff = {
  promotionMode: PromotionMode;
  recipe?: StudioAssistantHandoffRecipe;
  brandWebsiteUrl?: string;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  conceptIdea?: string;
  creativeVideoBrief?: string;
  analyzeBrand?: boolean;
  campaignGoal?: string;
  assistantNote?: string;
  imageOutputMode?: ImageOutputMode;
  visualStyleId?: VisualStyleId;
  workflowMode?: WorkflowMode;
  imageAspectRatio?: ImageAspectRatio;
  campaignTheme?: string;
  promptExtra?: string;
  /** Platform post cover from content research — loaded as style reference in Step 1. */
  referencePostCoverUrl?: string;
  referencePostImageUrls?: string[];
  referenceCarouselSlideCount?: number;
  /** Platform post MP4 from content research — loaded as @Video1 reference. */
  referencePostVideoUrl?: string;
  referencePostId?: string;
  referencePostUrl?: string;
  referencePostTitle?: string;
  referencePlatform?: "xiaohongshu" | "instagram" | "tiktok" | "facebook";
  /** Keeps style-only research prompt in sync when user edits product/headline in Setup. */
  contentResearchApplyRef?: import("@/lib/content-research-apply").ContentResearchApplyRef;
};

export function writeStudioAssistantHandoff(handoff: StudioAssistantHandoff): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STUDIO_ASSISTANT_HANDOFF_KEY, JSON.stringify(handoff));
  storePromotionMode(handoff.promotionMode);
}

export function readStudioAssistantHandoff(): StudioAssistantHandoff | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STUDIO_ASSISTANT_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioAssistantHandoff;
    if (parsed.promotionMode !== "physical" && parsed.promotionMode !== "concept") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearStudioAssistantHandoff(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STUDIO_ASSISTANT_HANDOFF_KEY);
}
