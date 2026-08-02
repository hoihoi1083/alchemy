/** Detect user intent to remove text/logo rather than replace with new content. */
export function isEraseIntent(prompt: string): boolean {
  const p = prompt.trim().toLowerCase();
  if (!p) return true;
  return /消除|刪除|删除|移除|去掉|擦除|清除|去掉字|remove\s*text|erase|delete\s*text|remove\s*logo|去掉文字|把字/.test(
    p,
  );
}

/**
 * Local heal prompt — only regenerate masked pixels (phone-editor style).
 * Prefer this over FLUX Erase, which often removes the whole semantic object
 * the mask touches (e.g. an entire floating UI card).
 */
export function buildInpaintErasePrompt(): string {
  return [
    "Local heal only inside the mask.",
    "Seamless continuation of the immediately surrounding pixels.",
    "Do not change, move, or remove any unmasked content.",
    "Do not erase neighboring text, UI cards, logos, or people outside the mask.",
    "Match adjacent colors, texture, and lighting exactly.",
    "No new text, letters, logos, or invented objects inside the mask.",
  ].join(" ");
}

/** Strong fill prompt when user wants replacement (not erase). */
export function buildInpaintFillPrompt(
  userPrompt: string,
  ctx?: {
    product?: string;
    headline?: string;
    subline?: string;
    offer?: string;
    artStyle?: string;
  },
): string {
  const p = userPrompt.trim();
  if (isEraseIntent(p)) {
    return buildInpaintErasePrompt();
  }
  const product = ctx?.product?.trim() ?? "";
  const headline = ctx?.headline?.trim() ?? "";
  const subline = ctx?.subline?.trim() ?? "";
  const offer = ctx?.offer?.trim() ?? "";
  const artStyle = ctx?.artStyle?.trim() ?? "";
  return [
    p,
    product ? `Product identity: ${product} — keep the same product look outside and inside the mask when continuing the scene.` : "",
    headline || subline || offer
      ? `Ad context (do NOT paint new marketing captions unless the user asked for text): ${[headline, subline, offer].filter(Boolean).join(" | ")}.`
      : "",
    artStyle ? `Art style: ${artStyle}.` : "",
    "Only regenerate masked pixels; match surrounding lighting, texture, and color.",
    "CRITICAL: do not invent readable Chinese/Latin captions, watermarks, prices, or logos unless the user prompt explicitly asks for text.",
  ]
    .filter(Boolean)
    .join(" ");
}
