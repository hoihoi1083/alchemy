/**
 * Research as idea transfer — extract structure from a reference angle/reel
 * and remap onto the user's product or concept (not a pixel/motion copy).
 */

export type ResearchIdeaRemapInput = {
  promotionMode: "physical" | "concept";
  productOrConcept: string;
  headline?: string;
  subline?: string;
  offer?: string;
  /** Angle hook / title from research. */
  referenceHook?: string;
  referenceTitle?: string;
  /** Short analysis of reference structure (from reel analysis or angle). */
  referenceStructure?: string;
  /** Motion / pacing notes from reel analysis. */
  referenceMotion?: string;
  durationSec?: number;
};

/**
 * Build DeepSeek-facing brief: keep reference BEATS, swap SUBJECT to user brand.
 * Used by plan-video-prompt / plan-storyboard promptExtra enrichment.
 */
export function buildResearchIdeaRemapBlock(input: ResearchIdeaRemapInput): string {
  const subject =
    input.promotionMode === "concept"
      ? `CONCEPT / service: ${input.productOrConcept}`
      : `PRODUCT: ${input.productOrConcept}`;
  const lines = [
    "RESEARCH IDEA REMAP (do NOT copy the reference brand, face, or product):",
    `- User ${subject}.`,
    input.headline ? `- User headline: ${input.headline}` : "",
    input.subline ? `- User selling points: ${input.subline}` : "",
    input.offer ? `- User offer: ${input.offer}` : "",
    input.referenceHook
      ? `- Reference hook (structure only): ${input.referenceHook}`
      : "",
    input.referenceTitle
      ? `- Reference title (style only): ${input.referenceTitle}`
      : "",
    input.referenceStructure
      ? `- Reference story beats / layout: ${input.referenceStructure}`
      : "",
    input.referenceMotion
      ? `- Reference camera language / pacing: ${input.referenceMotion}`
      : "",
    input.durationSec
      ? `- Target duration ~${input.durationSec}s.`
      : "",
    "Write a NEW script for the USER subject that KEPT the reference rhythm (hook → demo/turn → punchline).",
    "Never reuse reference faces, logos, SKUs, or on-video text. Similar energy, different brand.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Detect if promptExtra already has a remap block (avoid stacking on re-apply). */
export function stripResearchIdeaRemapBlock(promptExtra: string): string {
  return promptExtra
    .replace(
      /RESEARCH IDEA REMAP[\s\S]*?(?=\n\n[A-Z][A-Z ]+:|\n*$)/i,
      "",
    )
    .trim();
}

export function mergeResearchIdeaRemapIntoPromptExtra(
  promptExtra: string,
  remap: ResearchIdeaRemapInput,
): string {
  const base = stripResearchIdeaRemapBlock(promptExtra);
  const block = buildResearchIdeaRemapBlock(remap);
  return [base, block].filter(Boolean).join("\n\n").trim();
}
