import type { ImageInputMode } from "@/lib/image-input-mode";
import type { CompositorId } from "@/lib/compositor/types";
import type { TemplateId } from "@/lib/templates";

/** Fields / uploads a template can use — filled across setup + image + video steps. */
export type TemplateSlotId =
  | "product"
  | "headline"
  | "subline"
  | "productPhoto"
  | "styleRef"
  | "referenceVideo"
  | "business"
  | "offer";

export type TemplateSlotDef = {
  id: TemplateSlotId;
  /** Shown on setup step (text inputs). Uploads are on image/video steps. */
  onSetup: boolean;
  required: boolean;
};

export type AdTemplateConfig = {
  slots: TemplateSlotDef[];
  /** Default image creation mode when this template is selected. */
  defaultImageInputMode: ImageInputMode;
  /** In-app layout compositor — exact text/layers, not full AI image. */
  compositor?: CompositorId;
};

export const TEMPLATE_CONFIG: Record<TemplateId, AdTemplateConfig> = {
  "paper-sticker-reel": {
    compositor: "paper-sticker",
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "offer", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
    ],
  },
  "product-reel": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "crystal-promo": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "styleRef", onSetup: false, required: false },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "shop-promo": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "offer", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "info-poster": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "brand-fit": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "brand-campaign": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "brand-video": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: false },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "creative-video": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: false },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "storyboard-video": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: true },
      { id: "headline", onSetup: true, required: false },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "offer", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
    ],
  },
  "model-wear-reel": {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: false },
      { id: "subline", onSetup: true, required: false },
      { id: "business", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
    ],
  },
  testimonial: {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: true },
    ],
  },
  custom: {
    defaultImageInputMode: "product-ad",
    slots: [
      { id: "product", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: false },
      { id: "subline", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: false },
      { id: "styleRef", onSetup: false, required: false },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "service-promo": {
    defaultImageInputMode: "describe",
    slots: [
      { id: "business", onSetup: true, required: true },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "offer", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: false },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "pricing-offer": {
    defaultImageInputMode: "describe",
    slots: [
      { id: "business", onSetup: true, required: false },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "offer", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: false },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
  "website-launch": {
    defaultImageInputMode: "describe",
    slots: [
      { id: "business", onSetup: true, required: true },
      { id: "headline", onSetup: true, required: true },
      { id: "subline", onSetup: true, required: false },
      { id: "productPhoto", onSetup: false, required: false },
      { id: "referenceVideo", onSetup: false, required: false },
    ],
  },
};

export function getTemplateConfig(id: TemplateId): AdTemplateConfig {
  return TEMPLATE_CONFIG[id] ?? TEMPLATE_CONFIG["product-reel"];
}

export function templateHasSlot(id: TemplateId, slot: TemplateSlotId): boolean {
  return getTemplateConfig(id).slots.some((s) => s.id === slot);
}

export function setupSlotsFor(id: TemplateId): TemplateSlotDef[] {
  return getTemplateConfig(id).slots.filter((s) => s.onSetup);
}

export function isSlotRequired(id: TemplateId, slot: TemplateSlotId): boolean {
  return getTemplateConfig(id).slots.some((s) => s.id === slot && s.required);
}
