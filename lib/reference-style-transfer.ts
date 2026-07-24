/** Shared prompt lines: reference visual style YES, reference topic/subject NO. */

export const REFERENCE_STYLE_MATCH_LINE =
  "MATCH reference visual style: render medium (3D/cartoon/photo/UGC/meme), layout grammar, palette, typography mood, edit energy, and scene staging type — output should feel like the same ad/video family";

export const REFERENCE_CONTENT_REPLACE_LINE =
  "REPLACE with user campaign: topic, hero subject, scene props, on-image copy in the user's UI language only, and CTA — reference post topic/language may be completely unrelated";

/** Storyboard → video stills: keep style, never bake reference (or any) readable text. */
export const REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE =
  "REPLACE with user campaign: topic, hero subject, and scene props only — leave all typography areas BLANK (no Chinese/Latin characters, no numbers-as-copy). Captions are burned onto the video later.";

export const REFERENCE_TOPIC_GUARD_LINE =
  "Do NOT copy: reference post title/hook verbatim, celebrity likeness, reference brand logos/wordmarks, or original on-image characters from the reference";

export const REFERENCE_ERASE_TEXT_LINE =
  "CRITICAL — erase every readable character from IMAGE 1 (Chinese, English, numbers used as copy). Do not redraw, translate, or invent replacement text on this still.";

export function referenceStyleTransferPromptBlock(extra?: {
  visualDirection?: string;
  motionSummary?: string;
  textless?: boolean;
}): string {
  const parts = [
    REFERENCE_STYLE_MATCH_LINE,
    extra?.textless ? REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE : REFERENCE_CONTENT_REPLACE_LINE,
    REFERENCE_TOPIC_GUARD_LINE,
  ];
  if (extra?.textless) parts.push(REFERENCE_ERASE_TEXT_LINE);
  if (extra?.visualDirection?.trim()) {
    parts.push(`Locked reference aesthetic: ${extra.visualDirection.trim()}`);
  }
  if (extra?.motionSummary?.trim()) {
    parts.push(`Reference motion/pacing: ${extra.motionSummary.trim()}`);
  }
  return parts.join(". ");
}
