import type { TemplateId } from "@/lib/templates";
import type { VisualStyleId } from "@/lib/visual-styles";
import { VISUAL_STYLES } from "@/lib/visual-styles";

/** Map landing-gallery template cards → default wizard visual style. */
export const TEMPLATE_PREF_KEY = "alchemy-studio-template-pref";

const TEMPLATE_STYLE_OVERRIDES: Partial<Record<TemplateId, VisualStyleId>> = {
  testimonial: "model-wear",
};

export function isTemplateId(value: string | null | undefined): value is TemplateId {
  if (!value) return false;
  return VISUAL_STYLES.some((s) => s.templateId === value) || value in TEMPLATE_STYLE_OVERRIDES;
}

export function visualStyleForTemplate(templateId: TemplateId): VisualStyleId | null {
  if (TEMPLATE_STYLE_OVERRIDES[templateId]) {
    return TEMPLATE_STYLE_OVERRIDES[templateId]!;
  }
  return VISUAL_STYLES.find((s) => s.templateId === templateId)?.id ?? null;
}
