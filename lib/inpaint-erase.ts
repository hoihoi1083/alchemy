/** Detect user intent to remove text/logo rather than replace with new content. */
export function isEraseIntent(prompt: string): boolean {
  const p = prompt.trim().toLowerCase();
  if (!p) return true;
  // Explicit replace / rewrite of text → not erase.
  if (
    /改成|改為|改为|換成|换成|改做|寫上|写上|改寫|改写|replace\s+with|change\s+(?:the\s+)?text\s+to|rewrite|write\s+/.test(
      p,
    )
  ) {
    return false;
  }
  return /消除|刪除|删除|移除|去掉|擦除|清除|去掉字|remove\s*text|erase|delete\s*text|remove\s*logo|去掉文字|clean\s*background|seamless/.test(
    p,
  );
}

/**
 * @deprecated Erase now uses fal-ai/flux-pro/v1/erase (no prompt).
 * Kept for tests / accidental fill fallbacks — keep wording short and non-instructional
 * so Fill never paints English API jargon into the image.
 */
export function buildInpaintErasePrompt(): string {
  return "empty soft blurred studio background matching the surroundings";
}

function isTextPaintIntent(prompt: string): boolean {
  const p = prompt.trim();
  if (!p) return false;
  return /改成|改為|改为|換成|换成|寫上|写上|文字|标题|標題|文案|caption|headline|write|text\s*[:=「"']|「[^」]+」|“[^”]+”|"[^"]+"/.test(
    p,
  );
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
  const wantsText = isTextPaintIntent(p);

  if (wantsText) {
    return [
      p,
      "Paint the requested text ONLY inside the white mask.",
      "Use clean, sharp, readable typography matching the surrounding ad style (size, weight, color, alignment).",
      "Do not keep any of the old wrong letters under the mask.",
      "Do not add extra slogans, prices, watermarks, or logos beyond what the user asked.",
      "Every pixel outside the mask must stay identical.",
      product ? `Product context: ${product}.` : "",
      artStyle ? `Art style: ${artStyle}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    p,
    product
      ? `Product identity: ${product} — keep the same product look outside and inside the mask when continuing the scene.`
      : "",
    headline || subline || offer
      ? `Ad context (do NOT paint new marketing captions unless the user asked for text): ${[headline, subline, offer].filter(Boolean).join(" | ")}.`
      : "",
    artStyle ? `Art style: ${artStyle}.` : "",
    "Only regenerate masked pixels; match surrounding lighting, texture, and color.",
    "If the user did not ask for text, fill with empty unmarked material only.",
  ]
    .filter(Boolean)
    .join(" ");
}
