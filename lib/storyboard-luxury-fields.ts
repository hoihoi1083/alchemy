/** Field keys that drive the Luxury birth storyboard planner. */
export const LUXURY_STORY_FIELD_KEYS = [
  "storyboardBrief",
  "product",
  "productPhoto",
  "headline",
  "subline",
  "promptExtra",
  "artStyle",
] as const;

export type LuxuryStoryFieldKey = (typeof LUXURY_STORY_FIELD_KEYS)[number];

export const LUXURY_FIELD_WRAP_CLASS =
  "rounded-xl border border-amber-300 bg-amber-50/60 p-3 ring-1 ring-amber-200";

export const LUXURY_FIELD_BADGE_CLASS =
  "ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900";

export type LuxuryStoryFieldLabels = {
  storyboardBrief: string;
  product: string;
  productPhoto: string;
  headline: string;
  subline: string;
  promptExtra: string;
  artStyle: string;
};

export function luxuryStoryFieldLabel(
  field: LuxuryStoryFieldKey,
  labels: LuxuryStoryFieldLabels,
): string {
  return labels[field];
}

export function luxuryFieldWrap(active: boolean, extra?: string): string | undefined {
  if (!active) return extra;
  return extra ? `${LUXURY_FIELD_WRAP_CLASS} ${extra}` : LUXURY_FIELD_WRAP_CLASS;
}
