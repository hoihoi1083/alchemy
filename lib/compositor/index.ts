import type { CompositorId } from "@/lib/compositor/types";
import type { TemplateId } from "@/lib/templates";

const TEMPLATE_COMPOSITOR: Partial<Record<TemplateId, CompositorId>> = {
  "paper-sticker-reel": "paper-sticker",
};

export function getCompositorId(templateId: TemplateId): CompositorId | null {
  return TEMPLATE_COMPOSITOR[templateId] ?? null;
}

export function templateUsesCompositor(templateId: TemplateId): boolean {
  return getCompositorId(templateId) !== null;
}
