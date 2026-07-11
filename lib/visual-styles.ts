import type { TemplateId } from "@/lib/templates";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  visualStyleAllowedForPromotion,
} from "@/lib/promotion-styles";

/** Beginner-facing look — maps to template tuning + auto style hints for AI prompts. */
export type VisualStyleId =
  | "product"
  | "dark-premium"
  | "warm-shop"
  | "info-poster"
  | "brand-fit"
  | "brand-campaign"
  | "brand-video"
  | "creative-video"
  | "concept-cinematic"
  | "storyboard-video"
  | "model-wear"
  | "ugc-presenter"
  | "paper-layout"
  | "service-promo"
  | "pricing-offer"
  | "website-launch";

export function isBrandVisualStyle(id: VisualStyleId): boolean {
  return id === "brand-fit" || id === "brand-campaign" || id === "brand-video";
}

export function isBrandVideoStyle(id: VisualStyleId): boolean {
  return id === "brand-video";
}

export function isCreativeVideoStyle(id: VisualStyleId): boolean {
  return id === "creative-video" || id === "concept-cinematic";
}

export function isStoryboardVideoStyle(id: VisualStyleId): boolean {
  return id === "storyboard-video";
}

export function isUgcPresenterStyle(id: VisualStyleId): boolean {
  return id === "ugc-presenter";
}

export function isConceptCinematicStyle(id: VisualStyleId): boolean {
  return id === "concept-cinematic";
}

/** Video styles where DeepSeek writes the Seedance prompt (storyboard, brand, creative). */
export function isAiPlannedVideoStyle(id: VisualStyleId): boolean {
  return (
    id === "brand-video" ||
    id === "creative-video" ||
    id === "concept-cinematic" ||
    id === "storyboard-video"
  );
}

/** Image campaign / brand-fit — needs analyze-brand before generate. */
export function requiresBrandProfileForImages(id: VisualStyleId): boolean {
  return id === "brand-fit" || id === "brand-campaign";
}

export function isCampaignVisualStyle(id: VisualStyleId): boolean {
  return id === "brand-campaign";
}

/** Image-step styles — hidden in video-only workflow. */
const IMAGE_FIRST_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "info-poster",
  "brand-fit",
  "brand-campaign",
  "model-wear",
  "ugc-presenter",
  "service-promo",
  "pricing-offer",
  "website-launch",
]);

/** Video-step brand AI prompt — hidden in image-only workflow. */
const VIDEO_FIRST_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "brand-video",
  "creative-video",
]);

/** Combined workflow only — cinematic keyframe → video stitch. */
const COMBINED_ONLY_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "concept-cinematic",
]);

export function isVisualStyleAllowedForWorkflow(
  id: VisualStyleId,
  mode: WorkflowMode,
): boolean {
  if (mode === "video-only" && IMAGE_FIRST_VISUAL_STYLE_IDS.has(id)) return false;
  if (
    (mode === "image-only" || mode === "combined") &&
    VIDEO_FIRST_VISUAL_STYLE_IDS.has(id)
  ) {
    return false;
  }
  if (mode !== "combined" && COMBINED_ONLY_VISUAL_STYLE_IDS.has(id)) return false;
  return true;
}

export function visualStylesForWorkflow(
  mode: WorkflowMode,
  promotionMode: PromotionMode = "physical",
): VisualStyleDef[] {
  return VISUAL_STYLES.filter(
    (s) =>
      isVisualStyleAllowedForWorkflow(s.id, mode) &&
      visualStyleAllowedForPromotion(s.id, promotionMode),
  );
}

export type VisualStyleDef = {
  id: VisualStyleId;
  icon: string;
  templateId: TemplateId;
  usesCompositor: boolean;
  /** Appended to image/video AI prompts (user extra requirements are added after). */
  promptHint: string;
};

export const VISUAL_STYLES: VisualStyleDef[] = [
  {
    id: "product",
    icon: "📦",
    templateId: "product-reel",
    usesCompositor: false,
    promptHint:
      "Clean premium product photography: soft studio or bright lifestyle scene, neutral commercial look — suitable for any physical product category.",
  },
  {
    id: "dark-premium",
    icon: "💎",
    templateId: "crystal-promo",
    usesCompositor: false,
    promptHint:
      "Dark luxury mood: deep gradient background, soft gold bokeh and subtle sparkle highlights. Premium boutique ad — jewelry, watches, skincare, gifts, home goods, not only crystals.",
  },
  {
    id: "warm-shop",
    icon: "🏪",
    templateId: "shop-promo",
    usesCompositor: false,
    promptHint:
      "Warm inviting local-shop promotional mood: cozy lighting, approachable retail atmosphere. Emphasize shop name and offer when provided.",
  },
  {
    id: "model-wear",
    icon: "🧑‍💼",
    templateId: "model-wear-reel",
    usesCompositor: false,
    promptHint:
      "Photorealistic lifestyle model wearing or using the product — premium editorial ad look, category-appropriate pose (wrist, demo, feet, etc.).",
  },
  {
    id: "ugc-presenter",
    icon: "🎙️",
    templateId: "ugc-presenter-reel",
    usesCompositor: false,
    promptHint:
      "UGC talking-head digital presenter: photoreal keyframe with product on wrist/hand, then HeyGen lip-sync to your ad-pack script (~$0.10/s).",
  },
  {
    id: "info-poster",
    icon: "📋",
    templateId: "info-poster",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "brand-fit",
    icon: "🔗",
    templateId: "brand-fit",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "brand-campaign",
    icon: "🎯",
    templateId: "brand-campaign",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "brand-video",
    icon: "🎬",
    templateId: "brand-video",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "creative-video",
    icon: "✨",
    templateId: "creative-video",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "concept-cinematic",
    icon: "🎥",
    templateId: "creative-video",
    usesCompositor: false,
    promptHint:
      "Cinematic concept short: dramatic rim light, shallow depth of field, rich atmosphere, expressive camera movement, no on-screen text, trailer-like emotional pacing.",
  },
  {
    id: "storyboard-video",
    icon: "🎞️",
    templateId: "storyboard-video",
    usesCompositor: false,
    promptHint:
      "Photorealistic multi-scene product reel: DeepSeek plans story beats and scene stills for any product category, then Seedance reference-to-video with @Image tags.",
  },
  {
    id: "paper-layout",
    icon: "📄",
    templateId: "paper-sticker-reel",
    usesCompositor: true,
    promptHint: "",
  },
  {
    id: "service-promo",
    icon: "🤝",
    templateId: "service-promo",
    usesCompositor: false,
    promptHint:
      "Professional service marketing: trust, expertise, coaching, consulting, courses, memberships — typography-led, no product packshot.",
  },
  {
    id: "pricing-offer",
    icon: "💳",
    templateId: "pricing-offer",
    usesCompositor: false,
    promptHint:
      "Pricing, packages, or limited-time offer graphic — clear CTA, benefit bullets, modern feed-friendly layout.",
  },
  {
    id: "website-launch",
    icon: "🌐",
    templateId: "website-launch",
    usesCompositor: false,
    promptHint:
      "Website or app launch promo — device/browser mockup mood, clean tech marketing, logo or screenshot optional.",
  },
];

export const DEFAULT_VISUAL_STYLE: VisualStyleId = "product";

export function getVisualStyle(id: VisualStyleId): VisualStyleDef {
  return VISUAL_STYLES.find((s) => s.id === id) ?? VISUAL_STYLES[0];
}

export function visualStylePromptHint(id: VisualStyleId): string {
  return getVisualStyle(id).promptHint.trim();
}

/** Merge auto style hint with optional user-written extra requirements. */
export function mergePromptExtra(styleId: VisualStyleId, userExtra: string): string {
  const hint = visualStylePromptHint(styleId);
  const user = userExtra.trim();
  if (hint && user) return `${hint}. ${user}`;
  return hint || user;
}
