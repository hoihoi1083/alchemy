/**
 * Lightweight board-chat intents for Magic Layers (no LLM required).
 * Default freeform → full-image AI edit (no split required).
 * Layer rewrite / layer AI edit only when user explicitly targets a selection.
 */

export type MagicChatIntent =
  | { type: "split" }
  | { type: "rewrite"; text?: string }
  | { type: "ai_edit"; instruction: string }
  | { type: "full_edit"; instruction: string }
  | { type: "erase_mode" }
  | { type: "grab_mode" }
  | { type: "brush_erase_mode" }
  | { type: "help" }
  | { type: "unknown"; raw: string };

export function parseMagicChatIntent(rawIn: string): MagicChatIntent {
  const raw = rawIn.trim();
  if (!raw) return { type: "unknown", raw: "" };
  const lower = raw.toLowerCase();

  if (
    /^(help|帮助|幫助|\?|怎么用|怎麼用|能做什么|能做什麼)/i.test(raw) ||
    lower === "help"
  ) {
    return { type: "help" };
  }

  // Kept for power users who type it — not advertised in Magic UI.
  if (
    /(拆层|拆層|split\s*layers?|magic\s*layers?|重新拆|再拆)/i.test(raw) ||
    /^(split|decompose)$/i.test(raw)
  ) {
    return { type: "split" };
  }

  if (/(点选提起|點選提起|click\s*grab|magic\s*grab|提起|抓取|grab)/i.test(raw)) {
    return { type: "grab_mode" };
  }

  if (/(笔刷擦除|筆刷擦除|brush\s*erase|涂抹擦除|塗抹擦除)/i.test(raw)) {
    return { type: "brush_erase_mode" };
  }

  if (/(擦除|erase|去掉|移除|删掉|刪掉)/i.test(raw) && !/(文字|字)/i.test(raw)) {
    return { type: "erase_mode" };
  }

  // Explicitly target the selected layer (optional).
  const layerEdit = raw.match(
    /^(?:改这层|改這層|对选中|對選中|选中图层|選中圖層|this\s*layer|on\s*(?:the\s*)?layer)\s*[:：]?\s*(.+)$/i,
  );
  if (layerEdit?.[1]?.trim()) {
    return { type: "ai_edit", instruction: layerEdit[1].trim() };
  }

  // 改成 XXX — selected-layer wording rewrite
  const rewriteMatch = raw.match(
    /^(?:改成|改為|改为|改字[为為]?|换成文字|換作文字|change\s*(?:to|text)?\s*[:=]?\s*|rewrite\s*[:=]?\s*)(.+)$/i,
  );
  if (rewriteMatch?.[1]?.trim()) {
    return { type: "rewrite", text: rewriteMatch[1].trim() };
  }
  if (/^(改文字|改字|rewrite|change\s*words?)$/i.test(raw)) {
    return { type: "rewrite" };
  }

  // Default: describe the whole-image change — no split required.
  if (raw.length >= 2) {
    return { type: "full_edit", instruction: raw };
  }

  return { type: "unknown", raw };
}
