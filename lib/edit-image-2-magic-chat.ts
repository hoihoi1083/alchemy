/**
 * Lightweight board-chat intents for Magic Layers (no LLM required).
 * Freeform leftover → region AI instruction when a layer is selected.
 */

export type MagicChatIntent =
  | { type: "split" }
  | { type: "rewrite"; text?: string }
  | { type: "ai_edit"; instruction: string }
  | { type: "erase_mode" }
  | { type: "grab_mode" }
  | { type: "brush_erase_mode" }
  | { type: "expand"; preset: "square" | "story" | "landscape" | "wider" }
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

  if (/(9\s*[:：]\s*16|竖版|豎版|story|reels?)/i.test(raw)) {
    return { type: "expand", preset: "story" };
  }
  if (/(16\s*[:：]\s*9|横版|橫版|landscape|youtube)/i.test(raw)) {
    return { type: "expand", preset: "landscape" };
  }
  if (/(1\s*[:：]\s*1|方形|square)/i.test(raw)) {
    return { type: "expand", preset: "square" };
  }
  if (/(4\s*[:：]\s*5|小红书|小紅書|wider)/i.test(raw)) {
    return { type: "expand", preset: "wider" };
  }
  if (/(扩展|擴展|expand|outpaint|加画布|加畫布)/i.test(raw)) {
    return { type: "expand", preset: "square" };
  }

  // 改成 XXX / change to XXX — must be at the start so “换成旗帜” stays AI-edit
  const rewriteMatch = raw.match(
    /^(?:改成|改為|改为|改字[为為]?|换成文字|換作文字|change\s*(?:to|text)?\s*[:=]?\s*|rewrite\s*[:=]?\s*)(.+)$/i,
  );
  if (rewriteMatch?.[1]?.trim()) {
    return { type: "rewrite", text: rewriteMatch[1].trim() };
  }
  if (/^(改文字|改字|rewrite|change\s*words?)$/i.test(raw)) {
    return { type: "rewrite" };
  }

  // Anything else with a selected-layer vibe → AI edit instruction
  if (raw.length >= 2) {
    return { type: "ai_edit", instruction: raw };
  }

  return { type: "unknown", raw };
}
