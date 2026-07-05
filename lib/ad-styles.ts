import type { WorkflowMode } from "@/lib/workflow-mode";
import type { TemplateId } from "@/lib/templates";

/** Beginner-facing ad style — maps to template + workflow internally. */
export type AdStyleId =
  | "paper-sticker"
  | "product-showcase"
  | "copy-reference-ad"
  | "shop-promo";

export type AdStyleDef = {
  id: AdStyleId;
  icon: string;
  templateId: TemplateId;
  /** Default workflow when user picks this style. */
  workflowMode: WorkflowMode;
  /** Show built-in / upload reference clip picker on video step. */
  emphasizeReferenceVideo: boolean;
  /** Expected quality band for user-facing copy. */
  qualityHint: "90" | "80" | "75";
};

export const AD_STYLES: AdStyleDef[] = [
  {
    id: "paper-sticker",
    icon: "📄",
    templateId: "paper-sticker-reel",
    workflowMode: "combined",
    emphasizeReferenceVideo: false,
    qualityHint: "90",
  },
  {
    id: "product-showcase",
    icon: "📦",
    templateId: "product-reel",
    workflowMode: "combined",
    emphasizeReferenceVideo: false,
    qualityHint: "80",
  },
  {
    id: "copy-reference-ad",
    icon: "🎬",
    templateId: "product-reel",
    workflowMode: "combined",
    emphasizeReferenceVideo: true,
    qualityHint: "80",
  },
  {
    id: "shop-promo",
    icon: "🏪",
    templateId: "shop-promo",
    workflowMode: "combined",
    emphasizeReferenceVideo: false,
    qualityHint: "80",
  },
];

export const DEFAULT_AD_STYLE: AdStyleId = "product-showcase";

export function getAdStyle(id: AdStyleId): AdStyleDef {
  return AD_STYLES.find((s) => s.id === id) ?? AD_STYLES[0];
}

export function adStyleForTemplate(templateId: TemplateId): AdStyleId {
  const match = AD_STYLES.find((s) => s.templateId === templateId && !s.emphasizeReferenceVideo);
  if (match) return match.id;
  if (templateId === "product-reel") return "product-showcase";
  return DEFAULT_AD_STYLE;
}
