/** Shared prompt lines: reference visual style YES, reference topic/subject NO. */

export const REFERENCE_STYLE_MATCH_LINE =
  "MATCH reference visual style: render medium (3D/cartoon/photo/UGC/meme), layout grammar, palette, typography mood, edit energy, and scene staging type — output should feel like the same ad/video family";

export const REFERENCE_CONTENT_REPLACE_LINE =
  "REPLACE with user campaign: topic, hero subject, scene props, on-image copy, and CTA — reference post topic may be completely unrelated";

export const REFERENCE_TOPIC_GUARD_LINE =
  "Do NOT copy: reference post title/hook verbatim, celebrity likeness, reference brand logos/wordmarks, or original on-image characters from the reference";

export function referenceStyleTransferPromptBlock(extra?: {
  visualDirection?: string;
  motionSummary?: string;
}): string {
  const parts = [REFERENCE_STYLE_MATCH_LINE, REFERENCE_CONTENT_REPLACE_LINE, REFERENCE_TOPIC_GUARD_LINE];
  if (extra?.visualDirection?.trim()) {
    parts.push(`Locked reference aesthetic: ${extra.visualDirection.trim()}`);
  }
  if (extra?.motionSummary?.trim()) {
    parts.push(`Reference motion/pacing: ${extra.motionSummary.trim()}`);
  }
  return parts.join(". ");
}
