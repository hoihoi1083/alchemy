import type { VisualStyleId } from "@/lib/visual-styles";

/** Per-template copy-field labels shown on Step 5 (and Step 4 product assistant). */
export type ConceptCopyFocusEntry = {
  title: string;
  body: string;
  hookLabel?: string;
  hookPlaceholder?: string;
  supportingLabel: string;
  supportingPlaceholder: string;
  offerLabel?: string;
  offerPlaceholder?: string;
};

export type ConceptCopyFocusMap = {
  info: ConceptCopyFocusEntry;
  designed: ConceptCopyFocusEntry;
  parts: ConceptCopyFocusEntry;
  "gaming-cover": ConceptCopyFocusEntry;
  "sports-big-words": ConceptCopyFocusEntry;
  "jelly-3d": ConceptCopyFocusEntry;
  brand: ConceptCopyFocusEntry;
  pricing: ConceptCopyFocusEntry;
  website: ConceptCopyFocusEntry;
};

export type ConceptCopyFocusKey = keyof ConceptCopyFocusMap;

/** Maps visual style → conceptCopyFocus key (same rules as PreGenerateSetupPanel). */
export function conceptCopyFocusKeyForStyle(
  visualStyleId: VisualStyleId | null | undefined,
): ConceptCopyFocusKey | null {
  switch (visualStyleId) {
    case "info-poster":
      return "info";
    case "designed-poster":
      return "designed";
    case "parts-poster":
      return "parts";
    case "gaming-cover":
      return "gaming-cover";
    case "sports-big-words":
      return "sports-big-words";
    case "jelly-3d":
      return "jelly-3d";
    case "brand-fit":
    case "brand-campaign":
      return "brand";
    case "pricing-offer":
      return "pricing";
    case "website-launch":
      return "website";
    default:
      return null;
  }
}

export function resolveConceptCopyFocus(
  visualStyleId: VisualStyleId | null | undefined,
  map: ConceptCopyFocusMap,
): ConceptCopyFocusEntry | null {
  const key = conceptCopyFocusKeyForStyle(visualStyleId);
  return key ? map[key] : null;
}

/** Which on-image fields to emphasize for this template (violet highlight). */
export function conceptCopyFieldEmphasis(
  visualStyleId: VisualStyleId | null | undefined,
): { hook: boolean; supporting: boolean; offer: boolean } {
  const key = conceptCopyFocusKeyForStyle(visualStyleId);
  if (!key) {
    // Generic product / lifestyle stills — both lines print on image.
    return { hook: true, supporting: true, offer: true };
  }
  switch (key) {
    case "info":
      return { hook: true, supporting: true, offer: false };
    case "designed":
    case "parts":
    case "gaming-cover":
    case "sports-big-words":
    case "jelly-3d":
      return { hook: true, supporting: true, offer: false };
    case "brand":
    case "website":
      return { hook: true, supporting: true, offer: false };
    case "pricing":
      return { hook: true, supporting: true, offer: true };
    default:
      return { hook: true, supporting: true, offer: true };
  }
}
