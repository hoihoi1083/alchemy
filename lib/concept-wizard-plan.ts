import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket } from "@/lib/prompts";
import {
  isInfographicLikeBrief,
  userReferencePromptBlock,
  type UserReferenceBrief,
} from "@/lib/user-reference-brief";

export type ConceptWizardDraft = {
  audience: string;
  painPoint: string;
  promise: string;
  proof: string;
  cta: string;
  visualMetaphor: string;
};

type PlanConceptInput = {
  conceptIdea?: string;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  visualStyleId?: string;
  workflowMode?: "image-only" | "video-only" | "combined";
  market?: PromptMarket;
  referenceImageVision?: string;
  userReferenceBrief?: UserReferenceBrief;
  hasReferenceImage?: boolean;
};

function normalizeDraft(parsed: Partial<ConceptWizardDraft>): ConceptWizardDraft {
  return {
    audience: String(parsed.audience ?? "").trim(),
    painPoint: String(parsed.painPoint ?? "").trim(),
    promise: String(parsed.promise ?? "").trim(),
    proof: String(parsed.proof ?? "").trim(),
    cta: String(parsed.cta ?? "").trim(),
    visualMetaphor: String(parsed.visualMetaphor ?? "").trim(),
  };
}

function styleSpecificRules(input: PlanConceptInput): string[] {
  if (input.visualStyleId === "concept-cinematic") {
    return [
      "- CONCEPT CINEMATIC mode: visualMetaphor must be ONE photorealistic scene (location, people, lighting, mood) for a movie still.",
      "- Do NOT describe poster layout, white background infographic, headline at top, bullet points, or any on-image text.",
      "- promise / pain / cta are for voiceover and captions LATER — never as typography on the image.",
      "- Prefer vivid, specific scene direction (e.g. Hong Kong sports bar at night, fans watching World Cup, warm rim light) over abstract marketing slogans.",
    ];
  }
  if (
    input.workflowMode === "image-only" ||
    (!input.workflowMode && input.visualStyleId !== "concept-cinematic")
  ) {
    return [
      "- CONCEPT SOCIAL POST (image-only): visualMetaphor describes a bold, scroll-stopping IG/FB creative — editorial photo, lifestyle scene, or visual metaphor with mood and color direction.",
      "- Copy (promise, pain, cta) will appear ON the image but integrated creatively — NOT a white infographic template, NOT a bullet-list flyer, NOT plain Canva layout.",
      "- Prefer: dramatic lighting, color wash, split composition, magazine-cover energy, metaphorical scene with overlay type — like top social agencies, not corporate PowerPoint.",
      "- promise = main hook line; pain/proof = supporting caption; cta = CTA badge or footer — describe how the VISUAL supports these, not a text-only layout.",
    ];
  }
  if (input.visualStyleId === "info-poster") {
    return [
      "- INFO POSTER mode: visualMetaphor may suggest category props and clean white/off-white mood — typography is added in a separate image step.",
    ];
  }
  if (input.visualStyleId === "service-promo" || input.visualStyleId === "pricing-offer") {
    return [
      "- SERVICE/OFFER graphic mode: visualMetaphor may suggest professional graphic mood — not required to be a literal photo scene.",
    ];
  }
  return [
    "- visualMetaphor should describe scene/mood objects the image/video model can render.",
  ];
}

function buildConceptPrompt(input: PlanConceptInput): string {
  const refBlock = input.userReferenceBrief
    ? userReferencePromptBlock(input.userReferenceBrief)
    : input.referenceImageVision;
  const infographicRef =
    input.userReferenceBrief && isInfographicLikeBrief(input.userReferenceBrief);
  const appLikeSignals = [
    input.conceptIdea,
    input.product,
    input.business,
    input.headline,
    input.subline,
    input.offer,
    input.promptExtra,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const allowAppFraming =
    /\bapp\b|website|web site|saas|software|platform|landing page|url|download|signup|sign up|註冊|注册|網站|网站|應用程式|应用|小程序/.test(
      appLikeSignals,
    );
  return [
    input.hasReferenceImage || refBlock
      ? "The user provided a reference (upload and/or text) defining BOTH the content topic AND the visual style they want. Your brief must stay in that lane — do not rewrite into unrelated generic marketing."
      : "You are a direct-response marketing strategist for service/concept campaigns.",
    "Given the context, output one concise concept brief for social content generation.",
    "Return valid JSON only. No markdown.",
    "",
    'Required JSON keys: {"audience":"","painPoint":"","promise":"","proof":"","cta":"","visualMetaphor":""}',
    "",
    "Rules:",
    "- Keep each field short and concrete (1-2 lines max).",
    "- No fake metrics, no invented legal claims, no medical guarantees.",
    "- Make CTA actionable and specific, but ONLY using user-provided facts.",
    "- Do NOT invent new mechanics such as pre-pay, lock-in, booking policy, membership, coupon, app flow, or payment method unless explicitly stated by user.",
    "- If the user only states a fee increase fact, keep CTA generic (e.g. check notice, plan parking today) and do not create extra policy details.",
    ...styleSpecificRules(input),
    "- PRESERVE the user's creative hook (e.g. one-vs-many, mecha, metaphor) — do NOT replace it with unrelated generic stock imagery.",
    "- If user mentions anime/mecha/Gundam-style: describe as original anime-style giant mecha robot scene (no trademark names, no official logos).",
    "- If user wants an exciting setup but anti-violence message: visualMetaphor must be ONE frozen scene (standoff, lowered weapons, calm after tension) — not a full battle montage.",
    input.workflowMode === "video-only"
      ? "- Video-only: visualMetaphor must be a single 6–8s renderable shot Seedance can animate."
      : "",
    input.hasReferenceImage
      ? [
          "- User reference defines content + style. ALL fields must reflect it — topic, names, stats, layout, colors, typography.",
          "- promise = main headline theme FROM the reference (not a invented product pitch).",
          "- proof = visible facts/stats/roles from reference.",
          "- visualMetaphor = describe the actual visual style AND scene (layout, palette, who is centered, surrounding elements).",
          infographicRef
            ? "- Reference is infographic/carousel: edu/knowledge content — do NOT invent a SaaS product or service to sell."
            : "- Match the reference format (ad, lifestyle, poster…) — do not switch to a different genre.",
          "- audience = who consumes THIS topic — not unrelated generic professionals.",
        ].join("\n")
      : "",
    refBlock ? `- User reference (MUST respect — content + style): ${refBlock}` : "",
    allowAppFraming
      ? "- App/website framing is allowed when relevant to user intent."
      : "- Do NOT invent app/software/phone-UI framing. Keep concept grounded in physical scene cues unless user explicitly asked for app/website.",
    allowAppFraming
      ? ""
      : "- Avoid terms like app, download, interface, dashboard, signup, or mobile screen in promise/cta/metaphor.",
    "- Respect provided language market context.",
    "",
    `Market: ${input.market || "hk"}`,
    `Workflow: ${input.workflowMode || "image-only"}`,
    `Visual style: ${input.visualStyleId || "service-promo"}`,
    input.conceptIdea ? `User concept idea: ${input.conceptIdea}` : "",
    input.product ? `Service / product name: ${input.product}` : "",
    input.business ? `Brand / business: ${input.business}` : "",
    input.headline ? `Current headline hint: ${input.headline}` : "",
    input.subline ? `Current subline hint: ${input.subline}` : "",
    input.offer ? `Current offer hint: ${input.offer}` : "",
    input.promptExtra ? `Additional requirements: ${input.promptExtra}` : "",
    "",
    "Source facts (must not be expanded beyond these):",
    `- Headline: ${input.headline || "(none)"}`,
    `- Subline: ${input.subline || "(none)"}`,
    `- Offer: ${input.offer || "(none)"}`,
    `- Concept idea: ${input.conceptIdea || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function planConceptWizard(
  input: PlanConceptInput,
): Promise<ConceptWizardDraft> {
  const systemContent =
    input.hasReferenceImage || input.userReferenceBrief
      ? "You write concept briefs grounded in the user's reference (upload + text). Preserve their topic, facts, layout style, and color/typography direction. Output strict JSON only."
      : "You write practical concept briefs for SMB social ads. Output strict JSON only.";
  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content: systemContent,
      },
      { role: "user", content: buildConceptPrompt(input) },
    ],
    { temperature: 0.45, max_tokens: 1000, jsonObject: true },
  );

  return normalizeDraft(
    parseLlmJsonObject<Partial<ConceptWizardDraft>>(outputText, "Concept wizard plan"),
  );
}

