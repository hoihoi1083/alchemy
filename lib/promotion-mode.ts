import type { WorkflowMode } from "@/lib/workflow-mode";
import type { VisualStyleId } from "@/lib/visual-styles";

/** Whether the user promotes a physical product or a service / website / concept. */
export type PromotionMode = "physical" | "concept";

export const PROMOTION_MODE_STORAGE_KEY = "ams-promotion-mode";

export function isPromotionMode(value: string | null | undefined): value is PromotionMode {
  return value === "physical" || value === "concept";
}

export function defaultVisualStyleForPromotion(mode: PromotionMode): VisualStyleId {
  return mode === "concept" ? "info-poster" : "product";
}

/** Pick a style that matches promotion + export goal (image vs video). */
export function defaultVisualStyleForWorkflow(
  mode: PromotionMode,
  workflowMode: WorkflowMode,
): VisualStyleId {
  if (workflowMode === "video-only") {
    return mode === "concept" ? "creative-video" : "product";
  }
  if (mode === "concept" && workflowMode === "image-only") {
    return "brand-fit";
  }
  return defaultVisualStyleForPromotion(mode);
}

export function readStoredPromotionMode(): PromotionMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROMOTION_MODE_STORAGE_KEY);
  return isPromotionMode(raw) ? raw : null;
}

export function storePromotionMode(mode: PromotionMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMOTION_MODE_STORAGE_KEY, mode);
}

export function studioHref(mode: PromotionMode, template?: string): string {
  const params = new URLSearchParams({ mode });
  if (template?.trim()) params.set("template", template.trim());
  return `/studio?${params.toString()}`;
}

export function startHref(template?: string): string {
  if (!template?.trim()) return "/start";
  return `/start?template=${encodeURIComponent(template.trim())}`;
}
