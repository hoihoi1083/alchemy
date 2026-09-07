/**
 * Prompt helpers for Magic Layers AI text rewrite:
 * crop image = style reference; only the wording changes.
 */

export function buildLayerTextRewritePrompt(opts: {
  newText: string;
  oldText?: string;
}): string {
  const next = opts.newText.trim().slice(0, 200);
  const prev = (opts.oldText ?? "").trim().slice(0, 200);
  const parts = [
    "Edit ONLY the text in this image crop.",
    prev
      ? `Replace the existing text (approximately: "${prev}") with exactly: "${next}".`
      : `Change the visible text so it reads exactly: "${next}".`,
    "Keep the exact same typography: font family, weight, size, letter spacing, color, opacity, stroke/outline, shadow, orientation (including vertical), alignment, and layout.",
    "Keep the same background and any non-text pixels identical.",
    "Do not add extra words, logos, watermarks, or decorations.",
    "Do not change the crop framing or aspect ratio.",
  ];
  return parts.join(" ");
}

export const LAYER_TEXT_REWRITE_SYSTEM_PROMPT =
  "You are a precise poster text editor. Change letterforms to the requested wording while preserving style and all non-text pixels.";
