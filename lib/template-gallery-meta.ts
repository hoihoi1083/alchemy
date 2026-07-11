import type { TemplateId } from "@/lib/templates";
import { getTemplateConfig } from "@/lib/template-slots";

/** Gallery badge: image-first poster vs video reel output. */
export type TemplateGalleryOutput = "image" | "video";

const VIDEO_FIRST: Set<TemplateId> = new Set([
  "product-reel",
  "shop-promo",
  "crystal-promo",
  "testimonial",
  "paper-sticker-reel",
]);

export function templateGalleryOutput(id: TemplateId): TemplateGalleryOutput {
  if (VIDEO_FIRST.has(id)) return "video";
  if (getTemplateConfig(id).compositor) return "video";
  return "image";
}
