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
export function buildInpaintFillPrompt(userPrompt: string): string {
  const p = userPrompt.trim();
  if (isEraseIntent(p)) {
    return buildInpaintErasePrompt();
  }
  return p;
}
