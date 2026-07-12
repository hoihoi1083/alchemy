/**
 * Wizard v2 micro-step types (spec v0.5).
 * See docs/WIZARD_MICRO_STEPS.md — implementation follows review.
 */

import type { ImageOutputMode } from "@/lib/image-output-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";

/** How the user enters the funnel after picking subject. */
export type IntakePath = "research" | "direct";

/** Direct video sub-path (product + video-only). UI-only routing. */
export type VideoSubpath =
  | "product_promo"
  | "reference_reel"
  | "product_assistant"
  | "ugc_presenter";

/** Stable screen IDs for analytics, routing, and i18n. */
export type MicroStepId =
  | "entry.start"
  | "route.output_goal"
  | "route.subject"
  | "route.intake"
  | "route.video_subpath"
  | "identity.product_name"
  | "identity.concept"
  | "copy.edit"
  | "copy.storyboard_brief"
  | "copy.creative_brief"
  | "copy.image_prompt"
  | "research.platform"
  | "research.pick_angle"
  | "wait.research_apply"
  | "wait.reference_analyze"
  | "wait.reel_analyze"
  | "wait.brand_analyze"
  | "wait.concept_plan"
  | "asset.reference_image"
  | "asset.reference_video"
  | "asset.product_photo"
  | "asset.extra_kit"
  | "asset.brand_website"
  | "image.output_format"
  | "image.options"
  | "image.generate"
  | "wait.image_generate"
  | "image.review"
  | "image.storyboard_scenes"
  | "wait.storyboard_generate"
  | "video.mode"
  | "video.settings"
  | "video.product_plan"
  | "video.ai_prompt"
  | "video.ugc_pack"
  | "video.bgm"
  | "video.generate"
  | "wait.video_generate"
  | "shortcut.ship_it"
  | "done.export";

/** User choices accumulated before/during the funnel (UI router context). */
export type MicroWizardContext = {
  workflowMode?: WorkflowMode;
  promotionMode?: PromotionMode;
  intakePath?: IntakePath;
  videoSubpath?: VideoSubpath;
  imageOutputMode?: ImageOutputMode;
  /** Landing template id when entering from /start?template= */
  templateId?: string | null;
};

/** One node in a resolved step list. */
export type ResolvedMicroStep = {
  id: MicroStepId;
  /** 1-based index in the resolved path (for progress bar). */
  index: number;
  /** Estimated total steps in this path (may shrink if skippable steps skipped). */
  estimatedTotal: number;
  skippable?: boolean;
  /** Present when this step maps to a legacy wizard stepKey transition. */
  legacyStepKey?: "setup" | "image" | "video" | "done";
};

/** Reference path keys — see lib/wizard-micro-steps.graph.json */
export type MicroWizardPathId =
  | "product_image_research"
  | "product_image_direct"
  | "concept_image_research"
  | "concept_image_direct"
  | "product_video_research_reel"
  | "product_video_direct"
  | "product_combined";

export const WIZARD_V2_QUERY_FLAG = "wizard";
export const WIZARD_V2_VALUE = "v2";
export const WIZARD_CLASSIC_VALUE = "classic";

export function isWizardV2Enabled(searchParams: URLSearchParams): boolean {
  const flag = searchParams.get(WIZARD_V2_QUERY_FLAG);
  if (flag === WIZARD_V2_VALUE) return true;
  if (flag === WIZARD_CLASSIC_VALUE) return false;
  return process.env.NEXT_PUBLIC_WIZARD_V2 === "1";
}
