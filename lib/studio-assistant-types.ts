import type { PromptMarket } from "@/lib/prompts";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { VisualStyleId } from "@/lib/visual-styles";
import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { ImageCreativeMode } from "@/lib/creative-workflow";
import type { CoachTaskKind } from "@/lib/studio-assistant-coach-profile";
import type { WorkflowMode, WorkflowStepKey } from "@/lib/workflow-mode";
import type { Locale } from "@/lib/i18n";

export type AssistantSurface = "landing" | "start" | "studio";

export type StudioAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Context sent each turn — wizard fields empty on landing/start until handoff. */
export type StudioAssistantSnapshot = {
  surface: AssistantSurface;
  promotionMode: PromotionMode | null;
  workflowMode: WorkflowMode;
  stepKey: WorkflowStepKey;
  visualStyleId: VisualStyleId;
  promptMarket: PromptMarket;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  conceptIdea: string;
  creativeVideoBrief: string;
  brandWebsiteUrl: string;
  hasBrandProfile: boolean;
  hasProductPhoto: boolean;
  hasKeyframe: boolean;
  hasStoryboardScenes: boolean;
  hasVideo: boolean;
  cinematicSceneCount: number;
  cinematicScenesCount: number;
  storyboardBrief: string;
  usesCompositor: boolean;
  error: string | null;
  voiceoverEnabled: boolean;
  captionBurnEnabled: boolean;
  imageOutputMode?: ImageOutputMode;
  imageCreativeMode?: ImageCreativeMode;
  hasStyleReference?: boolean;
  /** Client-side: coach micro-steps user acknowledged with 下一步 */
  coachAck?: CoachTaskKind[];
};

export type StudioAssistantRequest = {
  messages: StudioAssistantMessage[];
  locale: Locale;
  snapshot: StudioAssistantSnapshot;
};

export type StudioAssistantActionId =
  | "apply-8s-recipe"
  | "apply-cinematic-stitch"
  | "concept-cinematic"
  | "website-launch-image"
  | "open-captions"
  | "setup-website-reel"
  | "analyze-brand"
  | "open-concept-studio"
  | "open-physical-studio"
  | "open-reference-ad-studio"
  | "open-storyboard-studio";

export type StudioAssistantActionContext = {
  websiteUrl?: string;
  surface: AssistantSurface;
  navigate?: (path: string) => void;
  /** User's last chat message — drives campaign topic in handoff */
  campaignMessage?: string;
};
