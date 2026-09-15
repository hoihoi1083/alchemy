import type { PromotionMode } from "@/lib/promotion-mode";
import { storePromotionMode } from "@/lib/promotion-mode";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type { CarouselIntent } from "@/lib/carousel-output";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { WorkflowMode } from "@/lib/workflow-mode";
import { writeAssistantGenerateAttribution } from "@/lib/studio-assistant-attribution";

export const STUDIO_ASSISTANT_HANDOFF_KEY = "alchemy-studio-assistant-handoff";
/** Survives consume() so /studio micro bootstrap won't wipe a just-seeded context. */
export const STUDIO_ASSISTANT_HANDOFF_PENDING_KEY =
  "alchemy-studio-assistant-handoff-pending";

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
  /** Unique id so multi-tab / double-click won't clobber the wrong payload. */
  handoffId?: string;
  /** studio-action id that created this handoff (analytics). */
  assistantActionId?: string;
  createdAt?: string;
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
  carouselIntent?: CarouselIntent;
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
  const payload: StudioAssistantHandoff = {
    ...handoff,
    handoffId:
      handoff.handoffId ??
      `ha_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: handoff.createdAt ?? new Date().toISOString(),
  };
  sessionStorage.setItem(STUDIO_ASSISTANT_HANDOFF_KEY, JSON.stringify(payload));
  sessionStorage.setItem(STUDIO_ASSISTANT_HANDOFF_PENDING_KEY, payload.handoffId ?? "1");
  writeAssistantGenerateAttribution({
    handoffId: payload.handoffId,
    assistantActionId: payload.assistantActionId,
    recipe: payload.recipe,
    createdAt: payload.createdAt,
  });
  storePromotionMode(payload.promotionMode);
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

/** True while an assistant handoff was written this navigation (even after consume). */
export function hasPendingStudioAssistantHandoff(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return Boolean(sessionStorage.getItem(STUDIO_ASSISTANT_HANDOFF_PENDING_KEY));
}

/** Read and clear payload — preferred for wizard consume so a second tab can't re-apply. */
export function consumeStudioAssistantHandoff(): StudioAssistantHandoff | null {
  const handoff = readStudioAssistantHandoff();
  if (handoff) clearStudioAssistantHandoff();
  return handoff;
}

export function clearStudioAssistantHandoff(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STUDIO_ASSISTANT_HANDOFF_KEY);
}

export function clearStudioAssistantHandoffPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STUDIO_ASSISTANT_HANDOFF_PENDING_KEY);
}
