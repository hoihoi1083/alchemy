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
  | "designed-poster"
  | "parts-poster"
  | "gaming-cover"
  | "sports-big-words"
  | "jelly-3d"
  | "type-force"
  | "spatial-layout"
  | "photo-doodle"
  | "light-trail"
  | "screen-break"
  | "material-letters"
  | "type-interaction"
  | "product-lifestyle"
  | "product-hold-poster"
  | "mold-word-poster"
  | "deconstruct-archive-poster"
  | "orbit-type-poster"
  | "cloche-reveal-poster"
  | "brand-fit"
  | "brand-campaign"
  | "brand-video"
  | "creative-video"
  | "concept-cinematic"
  | "explosion-unbox"
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

export function isExplosionUnboxStyle(id: VisualStyleId): boolean {
  return id === "explosion-unbox";
}

export function isConceptCinematicStyle(id: VisualStyleId): boolean {
  return id === "concept-cinematic";
}

/** Single finished still — locks output to one image (no A/B / campaign / teaching). */
export function isLockedSinglePosterStyle(id: VisualStyleId): boolean {
  return (
    id === "designed-poster" ||
    id === "parts-poster" ||
    id === "gaming-cover" ||
    id === "sports-big-words" ||
    id === "jelly-3d" ||
    id === "type-force" ||
    id === "spatial-layout" ||
    id === "photo-doodle" ||
    id === "light-trail" ||
    id === "screen-break" ||
    id === "material-letters" ||
    id === "type-interaction" ||
    id === "product-hold-poster" ||
    id === "mold-word-poster" ||
    id === "deconstruct-archive-poster" ||
    id === "orbit-type-poster" ||
    id === "cloche-reveal-poster"
  );
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
  "designed-poster",
  "parts-poster",
  "gaming-cover",
  "sports-big-words",
  "jelly-3d",
  "type-force",
  "spatial-layout",
  "photo-doodle",
  "light-trail",
  "screen-break",
  "material-letters",
  "type-interaction",
  "product-lifestyle",
  "product-hold-poster",
  "mold-word-poster",
  "deconstruct-archive-poster",
  "orbit-type-poster",
  "cloche-reveal-poster",
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
  "explosion-unbox",
]);

/** Combined workflow only — cinematic keyframe → video stitch. */
const COMBINED_ONLY_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "concept-cinematic",
  "explosion-unbox",
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
  /** Square preview for wizard / landing pickers. */
  previewSrc: string;
  templateId: TemplateId;
  usesCompositor: boolean;
  /** Appended to image/video AI prompts (user extra requirements are added after). */
  promptHint: string;
};

function visualPreview(id: VisualStyleId): string {
  // Cache-bust when swapping duplicate / refreshed art.
  const ver =
    id === "storyboard-video"
      ? "2"
      : id === "designed-poster"
        ? "2"
        : id === "info-poster"
          ? "2"
          : "1";
  return `/images/studio/visual-styles/${id}.png?v=${ver}`;
}

export const VISUAL_STYLES: VisualStyleDef[] = [
  {
    id: "product",
    icon: "📦",
    previewSrc: visualPreview("product"),
    templateId: "product-reel",
    usesCompositor: false,
    promptHint:
      "Clean premium product photography: soft studio or bright lifestyle scene, neutral commercial look — suitable for any physical product category.",
  },
  {
    id: "dark-premium",
    icon: "💎",
    previewSrc: visualPreview("dark-premium"),
    templateId: "crystal-promo",
    usesCompositor: false,
    promptHint:
      "Dark luxury mood: deep gradient background, soft gold bokeh and subtle sparkle highlights. Premium boutique ad — jewelry, watches, skincare, gifts, home goods, not only crystals.",
  },
  {
    id: "warm-shop",
    icon: "🏪",
    previewSrc: visualPreview("warm-shop"),
    templateId: "shop-promo",
    usesCompositor: false,
    promptHint:
      "Warm inviting local-shop promotional mood: cozy lighting, approachable retail atmosphere. Emphasize shop name and offer when provided. Keep the exact subject from IMAGE 1 — never invent a catalog product from the product name alone.",
  },
  {
    id: "model-wear",
    icon: "🧑‍💼",
    previewSrc: visualPreview("model-wear"),
    templateId: "model-wear-reel",
    usesCompositor: false,
    promptHint:
      "Photorealistic lifestyle model wearing or using the product — premium editorial ad look, category-appropriate pose (wrist, demo, feet, etc.).",
  },
  {
    id: "ugc-presenter",
    icon: "🎙️",
    previewSrc: visualPreview("ugc-presenter"),
    templateId: "ugc-presenter-reel",
    usesCompositor: false,
    promptHint:
      "UGC talking-head digital presenter: photoreal keyframe with product on wrist/hand, then lip-sync to your ad-pack script.",
  },
  {
    id: "info-poster",
    icon: "📋",
    previewSrc: visualPreview("info-poster"),
    templateId: "info-poster",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "designed-poster",
    icon: "🪧",
    previewSrc: visualPreview("designed-poster"),
    templateId: "designed-poster",
    usesCompositor: false,
    promptHint:
      "Commercial designed poster for any category: product hero + bilingual type, circular seal, brush category word matched to the product — XHS/IG feed poster, not food-only, not a blank catalog cutout.",
  },
  {
    id: "parts-poster",
    icon: "🧩",
    previewSrc: visualPreview("parts-poster"),
    templateId: "parts-poster",
    usesCompositor: false,
    promptHint:
      "Exploded parts breakdown poster: deconstruct the product into labeled components with title + short descriptions — technical commercial still, not violent destruction.",
  },
  {
    id: "gaming-cover",
    icon: "🎮",
    previewSrc: visualPreview("gaming-cover"),
    templateId: "gaming-cover",
    usesCompositor: false,
    promptHint:
      "AAA game-cover poster: low-angle cinematic action, hero/SKU identity locked, typography baked into the 3D scene (crates, path, rocks), HUD/barcode accents — not a flat Canva flyer.",
  },
  {
    id: "sports-big-words",
    icon: "🏆",
    previewSrc: visualPreview("sports-big-words"),
    templateId: "sports-big-words",
    usesCompositor: false,
    promptHint:
      "Sports editorial poster: athlete or product-in-action, one huge layered word integrated with the photo, HUD stats/microcopy, sky/stadium energy — not a plain catalog cutout.",
  },
  {
    id: "jelly-3d",
    icon: "🫧",
    previewSrc: visualPreview("jelly-3d"),
    templateId: "jelly-3d",
    usesCompositor: false,
    promptHint:
      "Minimal jelly/glass 3D hero: single glossy translucent object or number on a clean ground, soft colored shadow, sparse brand type — no busy lifestyle scene.",
  },
  {
    id: "type-force",
    icon: "🌊",
    previewSrc: visualPreview("type-force"),
    templateId: "type-force",
    usesCompositor: false,
    promptHint:
      "Commercial / spatial type poster: giant in-scene word under one force — product impact (sound, glass, rope, shock) OR architecture install (standing wave, bend, buckle, shear). Subject stays intact.",
  },
  {
    id: "spatial-layout",
    icon: "🏙️",
    previewSrc: visualPreview("spatial-layout"),
    templateId: "spatial-layout",
    usesCompositor: false,
    promptHint:
      "Architectural spatial poster: giant type as planes / void carve / extruded mass / corner wrap on concrete under blue sky — orange accents. Product sits in the space; concept uses headline as architecture.",
  },
  {
    id: "photo-doodle",
    icon: "✏️",
    previewSrc: visualPreview("photo-doodle"),
    templateId: "photo-doodle",
    usesCompositor: false,
    promptHint:
      "Photo doodle / 实景插画风: real photographic scene + thick-outline 2D cartoon overlays (commute / city-pop / people-orbit / nature-frame). Product stays photoreal; doodles orbit and share the ground plane.",
  },
  {
    id: "light-trail",
    icon: "💫",
    previewSrc: visualPreview("light-trail"),
    templateId: "light-trail",
    usesCompositor: false,
    promptHint:
      "Light trail / 动感光轨电影风: dark cinematic still with crimson–cyan neon long-exposure streaks (cast-streak / eye-slash / mask-beam / profile-shear). Subject stays photoreal under motion light.",
  },
  {
    id: "screen-break",
    icon: "📱",
    previewSrc: visualPreview("screen-break"),
    templateId: "screen-break",
    usesCompositor: false,
    promptHint:
      "Screen break / 破屏出界: subject or product bursts through a social-profile tear or giant phone portal — forced perspective, floating 3D UI chrome. Product = SKU breaks out; concept = person/brand breaks out.",
  },
  {
    id: "material-letters",
    icon: "🧵",
    previewSrc: visualPreview("material-letters"),
    templateId: "material-letters",
    usesCompositor: false,
    promptHint:
      "Giant letters built from a real material (down, denim, tent nylon, or leather) with true material behavior at contact — not flat texture stickers.",
  },
  {
    id: "type-interaction",
    icon: "🪞",
    previewSrc: visualPreview("type-interaction"),
    templateId: "type-interaction",
    usesCompositor: false,
    promptHint:
      "Type as product expression: fold across hinge planes, peel as film, slice for motion (subject whole), or mirror-chrome TRACE reflections.",
  },
  {
    id: "product-lifestyle",
    icon: "✨",
    previewSrc: visualPreview("product-lifestyle"),
    templateId: "product-lifestyle",
    usesCompositor: false,
    promptHint:
      "High-impact lifestyle product still: SKU extreme foreground in hand, model behind, rainbow refraction light, oversized title + numeric selling points in frame — not a flat info flyer.",
  },
  {
    id: "product-hold-poster",
    icon: "🤲",
    previewSrc: visualPreview("product-hold-poster"),
    templateId: "product-hold-poster",
    usesCompositor: false,
    promptHint:
      "Talking product-hold poster: person presents the SKU in forced perspective (giant product in hand toward camera), clean white studio, punchy pain→attitude headline (A？B), brush slogan + small category pill — not a spec sheet, not product-only catalog.",
  },
  {
    id: "mold-word-poster",
    icon: "🧁",
    previewSrc: visualPreview("mold-word-poster"),
    templateId: "mold-word-poster",
    usesCompositor: false,
    promptHint:
      "Mold / clay funny-word poster: stylized 3D molded typography is the hero (pun / nickname / playful phrase). Soft cream studio, vinyl-toy / claymation look. With a product: SKU centered under/with the words. Concept: invent a whimsical scene that illustrates the wordplay — words stay major.",
  },
  {
    id: "deconstruct-archive-poster",
    icon: "📐",
    previewSrc: visualPreview("deconstruct-archive-poster"),
    templateId: "deconstruct-archive-poster",
    usesCompositor: false,
    promptHint:
      "Deconstruct archive poster: strict 50/50 split — top photoreal product hero, bottom technical watercolor isometric explode of the SAME product with numbered callouts, palette strip, scale/archive marks on warm paper — product path only.",
  },
  {
    id: "orbit-type-poster",
    icon: "🌀",
    previewSrc: visualPreview("orbit-type-poster"),
    templateId: "orbit-type-poster",
    usesCompositor: false,
    promptHint:
      "Orbit type poster: subject (model wearing SKU, product hero, or concept logo/mascot) locked center; bold kinetic type orbits / tunnels / passes behind and around them on clean white studio — graphic design that feels in motion, not flat captions.",
  },
  {
    id: "cloche-reveal-poster",
    icon: "🛎️",
    previewSrc: visualPreview("cloche-reveal-poster"),
    templateId: "cloche-reveal-poster",
    usesCompositor: false,
    promptHint:
      "Cloche reveal poster: fine-dining silver tray + white-glove service. Product path: natural ingredients / structure mess → dome cover → finished SKU reveal. Concept path: metaphor props mess → dome → brand logo / idea lockup. Warm cream studio, premium still-life.",
  },
  {
    id: "brand-fit",
    icon: "🔗",
    previewSrc: visualPreview("brand-fit"),
    templateId: "brand-fit",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "brand-campaign",
    icon: "🎯",
    previewSrc: visualPreview("brand-campaign"),
    templateId: "brand-campaign",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "brand-video",
    icon: "🎬",
    previewSrc: visualPreview("brand-video"),
    templateId: "brand-video",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "creative-video",
    icon: "✨",
    previewSrc: visualPreview("creative-video"),
    templateId: "creative-video",
    usesCompositor: false,
    promptHint: "",
  },
  {
    id: "concept-cinematic",
    icon: "🎥",
    previewSrc: visualPreview("concept-cinematic"),
    templateId: "creative-video",
    usesCompositor: false,
    promptHint:
      "Cinematic concept short: dramatic rim light, shallow depth of field, rich atmosphere, expressive camera movement, no on-screen text, trailer-like emotional pacing.",
  },
  {
    id: "explosion-unbox",
    icon: "📦✨",
    previewSrc: visualPreview("explosion-unbox"),
    templateId: "explosion-unbox-reel",
    usesCompositor: false,
    promptHint:
      "AI explosion unbox: fixed wide angle, sealed themed box opens, room assembles, props float in zero-gravity — text-to-video, no on-screen text.",
  },
  {
    id: "storyboard-video",
    icon: "🎞️",
    previewSrc: visualPreview("storyboard-video"),
    templateId: "storyboard-video",
    usesCompositor: false,
    promptHint:
      "Photorealistic multi-scene product reel: AI plans story beats and textless scene stills, then per-scene animation (stitched). Captions burn later via /captions.",
  },
  {
    id: "paper-layout",
    icon: "📄",
    previewSrc: visualPreview("paper-layout"),
    templateId: "paper-sticker-reel",
    usesCompositor: true,
    promptHint: "",
  },
  {
    id: "service-promo",
    icon: "🤝",
    previewSrc: visualPreview("service-promo"),
    templateId: "service-promo",
    usesCompositor: false,
    promptHint:
      "Professional service marketing: trust, expertise, coaching, consulting, courses, memberships — typography-led, no product packshot.",
  },
  {
    id: "pricing-offer",
    icon: "💳",
    previewSrc: visualPreview("pricing-offer"),
    templateId: "pricing-offer",
    usesCompositor: false,
    promptHint:
      "Pricing, packages, or limited-time offer graphic — clear CTA, benefit bullets, modern feed-friendly layout.",
  },
  {
    id: "website-launch",
    icon: "🌐",
    previewSrc: visualPreview("website-launch"),
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
