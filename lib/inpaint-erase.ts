/** Detect user intent to remove text/logo rather than replace with new content. */
export function isEraseIntent(prompt: string): boolean {
  const p = prompt.trim().toLowerCase();
  if (!p) return true;
  return /消除|刪除|删除|移除|去掉|擦除|清除|去掉字|remove\s*text|erase|delete\s*text|remove\s*logo|去掉文字|把字/.test(
    p,
  );
}

/** Strong fill prompt when user wants replacement (not erase). */
export function buildInpaintFillPrompt(userPrompt: string): string {
  const p = userPrompt.trim();
  if (isEraseIntent(p)) {
    return [
      "Seamless continuation of the surrounding background.",
      "Plain clean infographic panel, no text, no letters, no words, no typography.",
      "Match adjacent colors and layout exactly.",
    ].join(" ");
  }
  return p;
}
