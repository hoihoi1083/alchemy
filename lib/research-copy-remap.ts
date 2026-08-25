import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompts";

export type ResearchCopyRemapDraft = {
  headline: string;
  subline: string;
  offer: string;
  audience: string;
  topic: string;
};

type RemapInput = {
  promotionMode: "physical" | "concept";
  productOrConcept: string;
  market?: PromptMarket;
  referenceTitle?: string;
  referenceHook?: string;
  referenceBullets?: string[];
  referenceCta?: string;
  referenceSnippet?: string;
  existingHeadline?: string;
  existingSubline?: string;
  existingOffer?: string;
};

function normalizeDraft(parsed: Partial<ResearchCopyRemapDraft>): ResearchCopyRemapDraft {
  return {
    headline: String(parsed.headline ?? "").trim(),
    subline: String(parsed.subline ?? "").trim(),
    offer: String(parsed.offer ?? "").trim(),
    audience: String(parsed.audience ?? "").trim(),
    topic: String(parsed.topic ?? "").trim(),
  };
}

/**
 * Rewrite research-inspired copy onto the user's product/concept.
 * Keeps direction/energy; never copies reference brand or SKU text.
 */
export async function remapResearchCopyToSubject(
  input: RemapInput,
): Promise<ResearchCopyRemapDraft> {
  const market = input.market ?? "hk";
  const lang =
    market === "en"
      ? "English"
      : market === "cn"
        ? "Simplified Chinese"
        : "Traditional Chinese (Hong Kong / Taiwan)";

  const subjectLabel =
    input.promotionMode === "concept" ? "concept / service" : "product";

  const system = [
    "You adapt viral social-post STRUCTURE into original ad copy for the user's brand.",
    `Write ALL fields in ${lang}.`,
    "Return ONLY JSON with keys: headline, subline, offer, audience, topic.",
    "headline = hook rewritten for the USER subject (not the reference brand).",
    "subline = supporting points (can join with · or |).",
    "offer = CTA if natural, else empty string.",
    "audience = who this ad speaks to (short).",
    "topic = short topic label for the user's offer.",
    "Keep the reference energy/angle; NEVER reuse competitor names, faces, or SKUs.",
  ].join("\n");

  const user = [
    `User ${subjectLabel}: ${input.productOrConcept}`,
    input.referenceTitle ? `Reference title (structure only): ${input.referenceTitle}` : "",
    input.referenceHook ? `Reference hook (structure only): ${input.referenceHook}` : "",
    input.referenceBullets?.length
      ? `Reference bullets: ${input.referenceBullets.join(" · ")}`
      : "",
    input.referenceCta ? `Reference CTA: ${input.referenceCta}` : "",
    input.referenceSnippet
      ? `Reference snippet (do not copy): ${input.referenceSnippet.slice(0, 400)}`
      : "",
    input.existingHeadline ? `Draft headline: ${input.existingHeadline}` : "",
    input.existingSubline ? `Draft subline: ${input.existingSubline}` : "",
    input.existingOffer ? `Draft offer: ${input.existingOffer}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callDeepSeekChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.5, max_tokens: 800, jsonObject: true },
  );
  const parsed = parseLlmJsonObject<Partial<ResearchCopyRemapDraft>>(
    raw,
    "Research copy remap",
  );
  return normalizeDraft(parsed ?? {});
}
