import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { softenSeedancePromptForModeration, seedanceModerationPlannerRules } from "@/lib/seedance-moderation";
import { VIDEO_BGM_HINT } from "@/lib/templates";

export type VideoPromptPlan = {
  videoPrompt: string;
  motionSummary: string;
  suggestedHeadline: string;
  /** How to achieve multi-beat stories (CapCut, ref MP4, dual frame) — user-facing. */
  productionNotes: string;
};

function localeLineFromHints(input: {
  business: string;
  headline: string;
  subline: string;
  offer: string;
}): string {
  const text = `${input.business} ${input.headline} ${input.subline} ${input.offer}`;
  const hasZh = /[\u3400-\u9FFF]/.test(text);
  return hasZh
    ? "Use Traditional Chinese for motionSummary if hints look HK/TW; use Simplified Chinese for mainland cues."
    : "Use English for motionSummary.";
}

function normalizeVideoPromptPlan(parsed: Partial<VideoPromptPlan>): VideoPromptPlan {
  const videoPrompt = String(parsed.videoPrompt ?? "").trim();
  if (!videoPrompt) throw new Error("DeepSeek returned an empty video prompt.");
  return {
    videoPrompt,
    motionSummary: String(parsed.motionSummary ?? "").trim(),
    suggestedHeadline: String(parsed.suggestedHeadline ?? "").trim(),
    productionNotes: String(parsed.productionNotes ?? "").trim(),
  };
}

function finishVideoPrompt(videoPrompt: string): string {
  const softened = softenSeedancePromptForModeration(videoPrompt);
  if (!softened.includes("no on-screen") && !softened.includes("No on-screen")) {
    return `${softened} No on-screen text, subtitles, logos, or watermarks.${VIDEO_BGM_HINT}`;
  }
  if (!softened.includes("instrumental")) {
    return `${softened}${VIDEO_BGM_HINT}`;
  }
  return softened;
}

function buildBrandPlanPrompt(input: {
  brandProfile: BrandProfile;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  duration: string;
  hasReferenceVideo: boolean;
}): string {
  return [
    "Write a Seedance image-to-video prompt for a small-business social Reel ad.",
    "Return JSON only — no markdown fences.",
    '{"videoPrompt":"","motionSummary":"","suggestedHeadline":"","productionNotes":""}',
    "",
    "Rules for videoPrompt:",
    "- English prompt for Seedance API (model understands English best).",
    "- Describe MOTION and CAMERA only — slow push-in, gentle sparkle, stable commercial pacing.",
    "- Match brand mood, colors, and product category from brand DNA below.",
    "- The user's product photo will be @Image1 — keep same product identity, do not morph item.",
    "- NO on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    "- 6–10 second commercial reel feel, smooth and stable (not chaotic).",
    input.hasReferenceVideo
      ? "- User will also attach a reference MP4 — mention matching @Video1 pacing if natural, but product stays @Image1."
      : "- Single keyframe image-to-video — animate the hero product/scene subtly.",
    "- Do NOT describe static poster layout or typography — this is VIDEO motion.",
    "",
    "- motionSummary: one line for the user in Traditional Chinese if HK/TW brand, else English.",
    "- suggestedHeadline: optional hook line for the ad (match brand tone).",
    "- productionNotes: empty string unless multi-step advice is needed.",
    "",
    `Target duration hint: ${input.duration} seconds.`,
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `User headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.offer ? `Offer: ${input.offer}` : "",
    brandProfilePromptBlock(input.brandProfile),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCreativePlanPrompt(input: {
  creativeBrief: string;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  duration: string;
  hasReferenceVideo: boolean;
  textToVideo?: boolean;
  promotionMode?: "physical" | "concept";
  hasKeyframe?: boolean;
  imageVisionNote?: string;
  conceptIdea?: string;
}): string {
  const isConcept = input.promotionMode === "concept";
  const textToVideo = Boolean(input.textToVideo);
  const rawIdea = input.conceptIdea?.trim() || "";
  return [
    isConcept
      ? "Write a Seedance video prompt from a NON-PHYSICAL concept brief (PSA, service, metaphor, social message)."
      : "Write a Seedance video prompt from the user's CREATIVE brief for a product Reel.",
    "Return JSON only — no markdown fences.",
    '{"videoPrompt":"","motionSummary":"","suggestedHeadline":"","productionNotes":""}',
    "",
    "IMPORTANT LIMITS (honest):",
    "- Seedance makes ONE short clip (~4–15s), not a full movie.",
    "- Complex multi-scene stories (e.g. fight many people THEN drink) cannot fit in one clip.",
    "- Pick the strongest SINGLE visual beat that fits the duration.",
    textToVideo
      ? "- TEXT-TO-VIDEO mode: NO product photo, NO @Image1. Describe the full scene, subjects, environment, lighting, and camera motion in the prompt."
      : input.hasKeyframe
        ? "- IMAGE-TO-VIDEO mode: user uploaded @Image1 keyframe. Preserve visible subjects, layout, and message; describe camera motion and subtle animation only."
        : "- @Image1 is the user's keyframe photo — visual identity must stay consistent.",
    "",
    "Rules for videoPrompt (English for Seedance):",
    textToVideo
      ? "- Describe the entire scene visually: who/what is in frame, environment, mood, lighting, and camera movement."
      : "- Describe camera movement, action mood, pacing, lighting shifts, and how the subject appears/moves.",
    isConcept
      ? "- This is a concept/message ad — do NOT invent a product packshot or ecommerce item unless the brief explicitly mentions one."
      : "- If the brief is action-heavy, use cinematic motion words but stay achievable in one clip.",
    isConcept
      ? "- If the user's idea has TWO beats (exciting hook → peace/anti-fight message): render ONLY the de-escalation beat in this clip (standoff freeze, weapons lowered, one calm figure vs many frozen silhouettes). Do NOT generate a full fight."
      : "",
    isConcept
      ? "- If user referenced anime/mecha/Gundam-style: use generic description only in videoPrompt — e.g. 'original anime-style giant mecha robot' — never trademark names (Gundam, etc.)."
      : "",
    isConcept && rawIdea
      ? `- User's original idea (must shape the scene): ${rawIdea}`
      : "",
    "- If user will attach @Video1, align pacing with the reference; otherwise one coherent motion beat.",
    "- Avoid identifiable celebrity faces; silhouettes, back view, or symbolic figures are OK for PSAs.",
    "- NO on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    "",
    ...seedanceModerationPlannerRules().map((line) => `- ${line}`),
    "",
    "productionNotes (Traditional Chinese for HK/TW users, else English):",
    "- If the brief has MULTIPLE story beats, explain which single beat this clip covers and practical next steps (CapCut, reference MP4, or keyframe upload).",
    "",
    "- motionSummary: one line what this clip will feel like.",
    "- suggestedHeadline: optional ad hook matching the creative idea.",
    "",
    `Target duration: ${input.duration} seconds.`,
    `Generation: ${textToVideo ? "text-to-video (no keyframe)" : input.hasKeyframe ? "image-to-video (user keyframe @Image1)" : "image-to-video (keyframe provided)"}`,
    `Creative brief: ${input.creativeBrief}`,
    input.imageVisionNote ? `Reference image vision (must respect): ${input.imageVisionNote}` : "",
    input.product && !isConcept ? `Product: ${input.product}` : "",
    input.business ? `Business / topic: ${input.business}` : "",
    input.headline ? `User headline: ${input.headline}` : "",
    input.subline ? `Supporting points: ${input.subline}` : "",
    input.offer ? `CTA: ${input.offer}` : "",
    input.hasReferenceVideo
      ? "User WILL attach a reference MP4 (@Video1)."
      : textToVideo
        ? "User will NOT attach a reference MP4 — pure text-to-video from this prompt."
        : "User will NOT attach a reference MP4 — single keyframe image-to-video.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function planVideoPrompt(input: {
  brandProfile: BrandProfile;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  duration?: string;
  hasReferenceVideo?: boolean;
}): Promise<VideoPromptPlan> {
  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a Seedance video prompt engineer for HK/TW/CN SMB marketing Reels. Output valid JSON only.",
      },
      {
        role: "user",
        content: buildBrandPlanPrompt({
          brandProfile: input.brandProfile,
          product: input.product?.trim() || "",
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          duration: input.duration?.trim() || "6",
          hasReferenceVideo: Boolean(input.hasReferenceVideo),
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 900, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Video prompt plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt);
  return plan;
}

export async function planCreativeVideoPrompt(input: {
  creativeBrief: string;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  duration?: string;
  hasReferenceVideo?: boolean;
  textToVideo?: boolean;
  promotionMode?: "physical" | "concept";
  hasKeyframe?: boolean;
  imageVisionNote?: string;
  conceptIdea?: string;
}): Promise<VideoPromptPlan> {
  const brief = input.creativeBrief?.trim() || "";
  if (!brief) throw new Error("Describe your creative video idea first.");

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a Seedance creative video prompt engineer. Output valid JSON only. Be honest about single-clip limits; help users achieve ambitious ideas via practical production notes.",
      },
      {
        role: "user",
        content: buildCreativePlanPrompt({
          creativeBrief: brief,
          product: input.product?.trim() || "",
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          duration: input.duration?.trim() || "6",
          hasReferenceVideo: Boolean(input.hasReferenceVideo),
          textToVideo: Boolean(input.textToVideo),
          promotionMode: input.promotionMode,
          hasKeyframe: Boolean(input.hasKeyframe),
          imageVisionNote: input.imageVisionNote?.trim() || "",
          conceptIdea: input.conceptIdea?.trim() || "",
        }),
      },
    ],
    { temperature: 0.55, max_tokens: 1200, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Creative video plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt);
  return plan;
}

function buildProductPlanPrompt(input: {
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  duration: string;
  hasReferenceVideo: boolean;
}): string {
  return [
    "Write a Seedance image-to-video prompt for a product social Reel.",
    "Return JSON only — no markdown fences.",
    '{"videoPrompt":"","motionSummary":"","suggestedHeadline":"","productionNotes":""}',
    "",
    "Rules for videoPrompt:",
    "- English prompt for Seedance API.",
    "- The user's product still is @Image1; preserve product identity and materials.",
    "- Focus on camera, motion rhythm, lighting transitions, and product interaction.",
    "- No on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    "- Keep outcomes realistic and stable for a short ad clip.",
    input.hasReferenceVideo
      ? "- User may attach @Video1. Match pacing/energy while keeping product anchored to @Image1."
      : "- Single keyframe image-to-video mode. Keep one coherent motion beat.",
    "",
    "- motionSummary: one line for users.",
    "- suggestedHeadline: optional short hook line.",
    "- productionNotes: keep empty unless practical editing guidance helps.",
    localeLineFromHints(input),
    "",
    `Target duration: ${input.duration} seconds.`,
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Headline hint: ${input.headline}` : "",
    input.subline ? `Subline hint: ${input.subline}` : "",
    input.offer ? `Offer hint: ${input.offer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function planProductVideoPrompt(input: {
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  duration?: string;
  hasReferenceVideo?: boolean;
}): Promise<VideoPromptPlan> {
  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a Seedance product video prompt engineer for SMB marketing. Output valid JSON only.",
      },
      {
        role: "user",
        content: buildProductPlanPrompt({
          product: input.product?.trim() || "",
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          duration: input.duration?.trim() || "6",
          hasReferenceVideo: Boolean(input.hasReferenceVideo),
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 900, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Product video plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt);
  return plan;
}
