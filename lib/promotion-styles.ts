import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import {
  VISUAL_STYLES,
  type VisualStyleDef,
  type VisualStyleId,
  isVisualStyleAllowedForWorkflow,
} from "@/lib/visual-styles";

/** Product-photo-first styles — hidden in concept promotion mode. */
export const PHYSICAL_ONLY_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "product",
  "dark-premium",
  "model-wear",
  "ugc-presenter",
  // Exploded SKU diagram — logo-only does not work.
  "parts-poster",
  // Lifestyle impact needs a real SKU in extreme foreground.
  "product-lifestyle",
]);

/** Service / website / plan styles — hidden in physical promotion mode. */
export const CONCEPT_ONLY_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "service-promo",
  "pricing-offer",
  "website-launch",
  "concept-cinematic",
  "explosion-unbox",
]);

/** Works well for both physical goods and non-physical promos. */
export const SHARED_VISUAL_STYLE_IDS = new Set<VisualStyleId>([
  "warm-shop",
  "info-poster",
  "designed-poster",
  "gaming-cover",
  "sports-big-words",
  "jelly-3d",
  "type-force",
  "material-letters",
  "type-interaction",
  "brand-fit",
  "brand-campaign",
  "brand-video",
  "creative-video",
  "paper-layout",
  "storyboard-video",
]);

export function isConceptOnlyVisualStyle(id: VisualStyleId): boolean {
  return CONCEPT_ONLY_VISUAL_STYLE_IDS.has(id);
}

export function visualStyleAllowedForPromotion(
  id: VisualStyleId,
  promotionMode: PromotionMode,
): boolean {
  if (promotionMode === "physical" && CONCEPT_ONLY_VISUAL_STYLE_IDS.has(id)) return false;
  if (promotionMode === "concept" && PHYSICAL_ONLY_VISUAL_STYLE_IDS.has(id)) return false;
  return true;
}

export function visualStylesForPromotion(
  promotionMode: PromotionMode,
  workflowMode: WorkflowMode,
): VisualStyleDef[] {
  return VISUAL_STYLES.filter(
    (s) =>
      visualStyleAllowedForPromotion(s.id, promotionMode) &&
      isVisualStyleAllowedForWorkflow(s.id, workflowMode),
  );
}

export function conceptPrimaryVisualStyleIds(): VisualStyleId[] {
  return ["brand-fit", "service-promo", "pricing-offer", "website-launch", "concept-cinematic", "explosion-unbox"];
}

export function physicalPrimaryVisualStyleIds(): VisualStyleId[] {
  return ["product", "model-wear", "ugc-presenter", "storyboard-video"];
}

/** Concept styles that can generate from copy alone (no upload). */
export function conceptStyleAllowsTextOnlyImage(id: VisualStyleId): boolean {
  if (id === "concept-cinematic") return false;
  return (
    CONCEPT_ONLY_VISUAL_STYLE_IDS.has(id) ||
    id === "info-poster" ||
    id === "designed-poster" ||
    id === "gaming-cover" ||
    id === "sports-big-words" ||
    id === "jelly-3d" ||
    id === "type-force" ||
    id === "material-letters" ||
    id === "type-interaction" ||
    id === "warm-shop" ||
    id === "brand-fit" ||
    id === "brand-campaign"
  );
}

export function conceptStyleRequiresHeadline(id: VisualStyleId): boolean {
  return (
    isConceptOnlyVisualStyle(id) ||
    id === "info-poster" ||
    id === "designed-poster" ||
    id === "gaming-cover" ||
    id === "sports-big-words" ||
    id === "jelly-3d" ||
    id === "type-force" ||
    id === "material-letters" ||
    id === "type-interaction" ||
    id === "brand-fit" ||
    id === "brand-campaign"
  );
}
