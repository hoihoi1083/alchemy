import {
  coerceFieldsToScript,
  plannerOutputLanguageRule,
  resolveCopyLocale,
} from "@/lib/copy-locale";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompts";

export type ProductBriefDraft = {
  headline: string;
  subline: string;
  offer: string;
  notes: string;
};

type PlanProductBriefInput = {
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  visualStyleId?: string;
  workflowMode?: "image-only" | "video-only" | "combined";
  market?: PromptMarket;
  templateHint?: string;
};

function normalizeDraft(
  parsed: Partial<ProductBriefDraft>,
  market: PromptMarket,
): ProductBriefDraft {
  const raw = {
    headline: String(parsed.headline ?? "").trim(),
    subline: String(parsed.subline ?? "").trim(),
    offer: String(parsed.offer ?? "").trim(),
    notes: String(parsed.notes ?? "").trim(),
  };
  const coerced = coerceFieldsToScript(raw, resolveCopyLocale(market));
  return {
    headline: coerced.headline ?? "",
    subline: coerced.subline ?? "",
    offer: coerced.offer ?? "",
    notes: coerced.notes ?? "",
  };
}

export async function planProductBrief(
  input: PlanProductBriefInput,
): Promise<ProductBriefDraft> {
  const market = input.market ?? "hk";

  const system = [
    "You are a performance-marketing copywriter for short social ads.",
    plannerOutputLanguageRule(market),
    "Return ONLY a JSON object with keys: headline, subline, offer, notes.",
    "headline = scroll-stopping hook (max ~18 words).",
    "subline = 1–2 supporting benefits or proof lines.",
    "offer = short CTA or promo if relevant, else empty string.",
    "notes = optional visual direction for the image/video (one sentence).",
    "Do not invent competitor brands. Stay faithful to the product name.",
  ].join("\n");

  const user = [
    `Market: ${market}`,
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.visualStyleId ? `Visual style id: ${input.visualStyleId}` : "",
    input.templateHint ? `Template direction: ${input.templateHint}` : "",
    input.workflowMode ? `Output: ${input.workflowMode}` : "",
    input.headline ? `Existing headline: ${input.headline}` : "",
    input.subline ? `Existing subline: ${input.subline}` : "",
    input.offer ? `Existing offer: ${input.offer}` : "",
    input.promptExtra ? `Extra notes: ${input.promptExtra}` : "",
    "Fill or improve headline/subline/offer for this product ad.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, max_tokens: 700, jsonObject: true },
  );
  const parsed = parseLlmJsonObject<Partial<ProductBriefDraft>>(
    raw,
    "Product brief plan",
  );
  return normalizeDraft(parsed, market);
}
