import type { Locale } from "@/lib/i18n";
import type { AssistantKnowledgeChunk } from "@/lib/studio-assistant-knowledge";
import { knowledgeLocaleFromApp } from "@/lib/studio-assistant-knowledge";
import {
  assistantPlanGateFacts,
  assistantTokenCostFacts,
} from "@/lib/studio-assistant-billing-facts";

/** Offline / DeepSeek-down reply from retrieved knowledge only. */
export function buildDegradedKnowledgeReply(
  chunks: AssistantKnowledgeChunk[],
  locale: Locale,
): string {
  const kl = knowledgeLocaleFromApp(locale);
  const pick = (c: AssistantKnowledgeChunk) => {
    if (c.id === "tokens") return assistantTokenCostFacts(kl);
    if (c.id === "plan-gates") return assistantPlanGateFacts(kl);
    if (kl === "zh-cn") return c.zhCn || c.zh;
    if (kl === "zh-tw") return c.zhTw || c.zh;
    if (kl === "zh") return c.zh;
    return c.en;
  };
  const lines = chunks.slice(0, 3).map((c) => pick(c).trim()).filter(Boolean);
  if (lines.length === 0) {
    return locale === "en"
      ? "AI planning is briefly unavailable. Try again in a moment, or open [/pricing](/pricing) / [/studio](/studio) from the menu."
      : locale === "zh-cn"
        ? "AI 规划暂时不可用。请稍后再试，或从菜单打开 [/pricing](/pricing) / [/studio](/studio)。"
        : "AI 規劃暫時唔用得。請稍後再試，或者喺選單開 [/pricing](/pricing) / [/studio](/studio)。";
  }
  const header =
    locale === "en"
      ? "AI planning is briefly unavailable — here are the closest product facts:"
      : locale === "zh-cn"
        ? "AI 规划暂时不可用 — 先给你最相关的产品说明："
        : "AI 規劃暫時唔用得 — 先畀你最相關嘅產品說明：";
  return `${header}\n\n${lines.join("\n\n")}`;
}
