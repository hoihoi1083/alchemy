/** Shared prompt lines: reference visual style YES, reference topic/subject NO. */

export const REFERENCE_STYLE_MATCH_LINE =
  "MATCH reference visual style: render medium (3D/cartoon/photo/UGC/meme), layout grammar, palette, typography mood, edit energy, and scene staging type — output should feel like the same ad/video family";

export const REFERENCE_CONTENT_REPLACE_LINE =
  "REPLACE with user campaign: topic, hero subject, scene props, on-image copy in the user's UI language only, and CTA — reference post topic/language may be completely unrelated";

/** Storyboard → video stills: keep style, never bake campaign/reference marketing type. */
export const REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE =
  "REPLACE with user campaign: topic, hero subject, and scene props only — leave campaign typography areas BLANK (no overlaid headlines, captions, title bars, or CTA stickers). Captions are burned onto the video later. KEEP any brand/label text that is printed ON the user's product packaging when a product photo is the identity lock.";

export const REFERENCE_TOPIC_GUARD_LINE =
  "Do NOT copy: reference post title/hook verbatim, celebrity likeness, reference brand logos/wordmarks, or original on-image characters from the reference";

/**
 * Erase campaign / reference marketing type only.
 * Do NOT blank product packaging labels from the user's uploaded SKU photo — that is identity.
 */
export const REFERENCE_ERASE_TEXT_LINE =
  "CRITICAL — erase overlaid marketing copy only (campaign headlines, captions, title bars, watermarks, fake UI labels, reference-ad typography). KEEP readable brand/label text printed ON the user's product packaging (bottle/jar/box) when that product is the identity reference — blank packaging is a FAIL.";

/** Dual refs: product = IMAGE 1, style shell = IMAGE 2. */
export const REFERENCE_ERASE_STYLE_KEEP_PRODUCT_LABELS_LINE =
  "CRITICAL — keep exact packaging/label text from IMAGE 1 (the user's product). Erase marketing typography borrowed from IMAGE 2 (reference ad headlines/captions only) — do not blank the product label.";

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
