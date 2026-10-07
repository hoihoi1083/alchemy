/** How on-image marketing copy is produced for promo stills. */
export type ImageTextMode = "integrated" | "textless";

export const IMAGE_TEXT_MODES: ImageTextMode[] = ["integrated", "textless"];

export function isImageTextMode(value: string): value is ImageTextMode {
  return value === "integrated" || value === "textless";
}

/** Storyboard APIs default textless; pass fallback "integrated" for single-image ads. */
export function parseImageTextMode(
  raw: string | null | undefined,
  fallback: ImageTextMode = "textless",
): ImageTextMode {
  const v = String(raw ?? "").trim();
  return isImageTextMode(v) ? v : fallback;
}

export function imageTextPreviewSrc(id: ImageTextMode): string {
  return `/images/studio/image-text/${id}.png?v=1`;
}

/**
 * Hard lock for Textless background mode.
 * Nano Banana has no negative_prompt API — this must be blunt and repeated in
 * prompt + system_prompt. Packaging text already printed on IMAGE 1 may stay;
 * everything else (headlines, CTAs, watermarks, invented logos) must not.
 */
export const TEXTLESS_IMAGE_GUARD =
  "TEXTLESS HARD LOCK (mandatory): ZERO overlaid marketing typography. " +
  "Do NOT paint headlines, sublines, slogans, CTAs, price tags, hashtags, " +
  "@handles, watermarks, stamps, badges, title bars, speech bubbles, or UI chrome. " +
  "Do NOT invent brand logos or wordmarks. " +
  "Do NOT render Chinese, English, or any other written characters as campaign type. " +
  "KEEP only real product packaging / label text that is already printed ON the product in IMAGE 1 (if attached). " +
  "Blank unlabeled packaging is a FAIL when IMAGE 1 has a readable label. " +
  "Marketing copy is added later in the canvas / Captions — leave clean empty margin for that.";

/** Semantic avoid-list appended to the prompt (Nano Banana has no negative_prompt field). */
export const TEXTLESS_IMAGE_AVOID =
  "Avoid: on-image text, captions, subtitles, typography overlays, title cards, CTA buttons, " +
  "watermarks, QR codes, social UI, gibberish letters, fake logos, poster mastheads.";

/**
 * Last-word override appended after any style/reference prompt that may still
 * ask to paint headlines (type-force, reference-concept, sports-big-words, etc.).
 */
export const TEXTLESS_IMAGE_OVERRIDE =
  "OVERRIDE (wins over earlier instructions): Do NOT paint headlines, body copy, CTAs, " +
  "title bars, mastheads, speech bubbles, or any campaign typography. " +
  "Output a TEXTLESS background plate. Keep only real product packaging labels from IMAGE 1 if attached.";

/** Append hard textless lock when mode is textless; pass-through otherwise. */
export function enforceTextlessPrompt(
  prompt: string,
  imageTextMode: ImageTextMode | null | undefined,
): string {
  if (imageTextMode !== "textless") return prompt;
  const parts = [prompt.trim(), TEXTLESS_IMAGE_GUARD, TEXTLESS_IMAGE_AVOID, TEXTLESS_IMAGE_OVERRIDE];
  return parts.filter(Boolean).join(" ");
}

/** Extra lock for a one-shot regenerate after vision catches painted campaign type. */
export const TEXTLESS_RETRY_SUFFIX =
  "RETRY (textless QA failed): The previous still had campaign headlines, slogans, or gibberish letters. " +
  "This remake must be a TEXTLESS background plate — ZERO overlaid characters in any language. " +
  "Keep only real packaging labels already printed on the product in IMAGE 1 if attached. " +
  "Leave clean empty margin for Captions later.";
