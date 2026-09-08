/**
 * Prompt helpers for Magic Layers AI text rewrite:
 * crop image = style reference; only the wording changes.
 */

function spellCharacters(text: string): string {
  const chars = [...text];
  if (!chars.length) return "";
  return chars.map((c, i) => `${i + 1}.「${c}」`).join(" ");
}

export function buildLayerTextRewritePrompt(opts: {
  newText: string;
  oldText?: string;
}): string {
  const next = opts.newText.trim().slice(0, 200);
  const prev = (opts.oldText ?? "").trim().slice(0, 200);
  const charCount = [...next].length;
  const spelled = spellCharacters(next);

  const parts = [
    "Rewrite the letterforms in this crop so the readable text becomes the NEW wording only.",
    prev
      ? `OLD text (style reference only — delete every old glyph): "${prev}".`
      : "There is existing text in the crop — replace all of it.",
    `NEW text must read EXACTLY: "${next}" (${charCount} characters).`,
    spelled ? `Character sequence (in order, no extras, no omissions): ${spelled}.` : "",
    "HARD RULES:",
    `- The final image must contain exactly these ${charCount} characters and no others.`,
    "- Do NOT blend old and new text. Hybrid results like keeping one old character inside the new phrase are FORBIDDEN.",
    "- Do NOT keep leftover strokes from old characters (common failure with Chinese).",
    "- If character count would change, redraw the whole word from scratch in the same style — do not morph letter-by-letter.",
    "Keep the exact same typography style: font family, weight, size, letter spacing, color, opacity, stroke/outline, shadow, orientation (including vertical), alignment, and overall layout energy.",
    "CRITICAL: empty space must stay empty. If the plate is solid magenta (#FF00FF), keep those pixels pure magenta — that means transparent. Never invent a gray, white, black, or photo background behind the letters.",
    "Output must look like cut-out text only: glyphs + soft anti-aliased edges, no rectangular card or filled box.",
    "Do not add logos, watermarks, or decorations.",
    "Do not change the crop framing or aspect ratio.",
  ];
  return parts.filter(Boolean).join(" ");
}

export const LAYER_TEXT_REWRITE_SYSTEM_PROMPT =
  "You are a precise poster text typesetter. Output must show EXACTLY the requested new characters — never a blend of old and new glyphs. Preserve style and transparency; never invent a solid background plate.";
