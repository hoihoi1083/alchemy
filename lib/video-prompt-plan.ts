import {
  appendArtStyleSeedanceHintIfNeeded,
  artStylePlannerHint,
  DEFAULT_ART_STYLE,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";
import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { productIdentityContractLines } from "@/lib/prompt-balance-contract";
import { softenSeedancePromptForModeration, seedanceModerationPlannerRules } from "@/lib/seedance-moderation";
import { subjectFramingVideoHint, type SubjectFraming } from "@/lib/prompt-variables";
import { VIDEO_BGM_HINT } from "@/lib/templates";
import {
  resolvePlannerDurationSec,
  videoDurationPlannerBlock,
} from "@/lib/video-duration-planner";

export type VideoPlannerStyleContext = {
  artStyleId?: ArtStyleId | string;
  subjectFraming?: SubjectFraming | string;
  promptExtra?: string;
  /** When true, @Video1 owns look — do not inject art-style planner hints. */
  hasReferenceVideo?: boolean;
};

/** Shared style/framing/campaign lines for all Seedance video planners. */
export function videoPlannerContextBlock(input: VideoPlannerStyleContext): string[] {
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const lines: string[] = [];
  if (!input.hasReferenceVideo) {
    const artHint = artStylePlannerHint(artStyleId);
    if (artHint) lines.push(artHint);
    if (artStyleId !== "realistic") {
      lines.push(
        "The user's keyframe/stills use this illustrated or stylized medium — videoPrompt MUST preserve it; do NOT default to photorealistic live-action.",
      );
    }
  } else {
    lines.push(
      "Look/grade: follow @Video1 visual style family — do not invent a new art medium that fights the reference.",
    );
  }
  const framing = (input.subjectFraming?.trim() || "auto") as SubjectFraming;
  const framingHint = subjectFramingVideoHint(framing);
  if (framingHint) lines.push(`Framing preference: ${framingHint}`);
  const extra = input.promptExtra?.trim();
  if (extra) {
    lines.push(
      `Campaign / style notes (reference = style and motion grammar when present — do NOT let unrelated topic override locked aesthetic): ${extra}`,
    );
  }
  return lines;
}

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

function finishVideoPrompt(
  videoPrompt: string,
  artStyleId: ArtStyleId = DEFAULT_ART_STYLE,
  opts?: { hasReferenceVideo?: boolean },
): string {
  const softened = softenSeedancePromptForModeration(videoPrompt);
  let out = softened;
  if (!softened.includes("no on-screen") && !softened.includes("No on-screen")) {
    out = `${softened} No on-screen text, subtitles, logos, or watermarks.${VIDEO_BGM_HINT}`;
  } else if (!softened.includes("instrumental")) {
    out = `${softened}${VIDEO_BGM_HINT}`;
  }
  return appendArtStyleSeedanceHintIfNeeded(out, artStyleId, {
    skip: Boolean(opts?.hasReferenceVideo),
  });
}

function buildBrandPlanPrompt(input: {
  brandProfile: BrandProfile;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  durationSec: number;
  hasReferenceVideo: boolean;
  styleContext: VideoPlannerStyleContext;
}): string {
  return [
    "Write a Seedance image-to-video prompt for a small-business social Reel ad.",
    "Return JSON only — no markdown fences.",
    '{"videoPrompt":"","motionSummary":"","suggestedHeadline":"","productionNotes":""}',
    "",
    "Rules for videoPrompt:",
    "- English prompt for Seedance API (model understands English best).",
    input.hasReferenceVideo
      ? "- Describe MOTION and CAMERA to match @Video1 — do NOT invent a generic slow push-in unless @Video1 uses it."
      : "- Describe MOTION and CAMERA only — slow push-in, gentle sparkle, stable commercial pacing.",
    "- Match brand mood, colors, and product category from brand DNA below.",
    "- The user's product photo will be @Image1 — keep same product identity, do not morph item.",
    "- NO on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    `- Smooth commercial reel pacing sized for ${input.durationSec}s total.`,
    input.hasReferenceVideo
      ? "- User will also attach a reference MP4 — match @Video1 pacing rhythm but compress/adapt to the OUTPUT length below; product stays @Image1."
      : "- Single keyframe image-to-video — animate the hero product/scene subtly.",
    "- Do NOT describe static poster layout or typography — this is VIDEO motion.",
    "",
    ...productIdentityContractLines({
      hasReferenceVideo: input.hasReferenceVideo,
    }),
    "",
    "- motionSummary: one line for the user in Traditional Chinese if HK/TW brand, else English.",
    "- suggestedHeadline: optional hook line for the ad (match brand tone).",
    "- productionNotes: empty string unless multi-step advice is needed.",
    ...videoDurationPlannerBlock(input.durationSec, {
      hasReferenceVideo: input.hasReferenceVideo,
    }),
    "",
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `User headline: ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    input.offer ? `Offer: ${input.offer}` : "",
    brandProfilePromptBlock(input.brandProfile),
    ...videoPlannerContextBlock({
      ...input.styleContext,
      hasReferenceVideo: input.hasReferenceVideo,
    }),
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
  durationSec: number;
  hasReferenceVideo: boolean;
  textToVideo?: boolean;
  promotionMode?: "physical" | "concept";
  hasKeyframe?: boolean;
  imageVisionNote?: string;
  conceptIdea?: string;
  brandProfile?: BrandProfile;
  styleContext: VideoPlannerStyleContext;
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
    `- Seedance makes ONE short clip (~${input.durationSec}s output), not a full movie.`,
    "- Complex multi-scene stories (e.g. fight many people THEN drink) cannot fit in one clip.",
    `- Pick the strongest SINGLE visual beat that fits ${input.durationSec} seconds.`,
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
    input.hasReferenceVideo
      ? "- User WILL attach @Video1 — align pacing with the reference and compress into the OUTPUT length below; do not invent a new camera grammar."
      : "",
    input.brandProfile?.businessName
      ? "- Brand DNA below is OPTIONAL lock for mood, colors, and copy tone. Scene/action still follows the creative brief — do not invent a physical SKU just because the brand sells one."
      : "",
    "- Avoid identifiable celebrity faces; silhouettes, back view, or symbolic figures are OK for PSAs.",
    "- NO on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    "",
    ...seedanceModerationPlannerRules().map((line) => `- ${line}`),
    ...(input.hasReferenceVideo || isConcept
      ? [
          "",
          ...productIdentityContractLines({
            hasReferenceVideo: input.hasReferenceVideo,
            conceptMode: isConcept,
          }),
        ]
      : []),
    ...videoDurationPlannerBlock(input.durationSec, {
      hasReferenceVideo: input.hasReferenceVideo,
    }),
    "",
    "productionNotes (Traditional Chinese for HK/TW users, else English):",
    "- If the brief has MULTIPLE story beats, explain which single beat this clip covers and practical next steps (CapCut, reference MP4, or keyframe upload).",
    "",
    "- motionSummary: one line what this clip will feel like.",
    "- suggestedHeadline: optional ad hook matching the creative idea.",
    "",
    `Generation: ${textToVideo ? "text-to-video (no keyframe)" : input.hasKeyframe ? "image-to-video (user keyframe @Image1)" : "image-to-video (keyframe provided)"}`,
    `Creative brief: ${input.creativeBrief}`,
    input.imageVisionNote ? `Reference image vision (must respect): ${input.imageVisionNote}` : "",
    input.product && !isConcept ? `Product: ${input.product}` : "",
    input.business ? `Business / topic: ${input.business}` : "",
    input.headline ? `User headline: ${input.headline}` : "",
    input.subline ? `Supporting points: ${input.subline}` : "",
    input.offer ? `CTA: ${input.offer}` : "",
    input.brandProfile?.businessName
      ? brandProfilePromptBlock(input.brandProfile)
      : "",
    input.hasReferenceVideo
      ? "User WILL attach a reference MP4 (@Video1)."
      : textToVideo
        ? "User will NOT attach a reference MP4 — pure text-to-video from this prompt."
        : "User will NOT attach a reference MP4 — single keyframe image-to-video.",
    ...videoPlannerContextBlock({
      ...input.styleContext,
      hasReferenceVideo: input.hasReferenceVideo,
    }),
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
  artStyleId?: ArtStyleId | string;
  subjectFraming?: SubjectFraming | string;
  promptExtra?: string;
}): Promise<VideoPromptPlan> {
  const durationSec = resolvePlannerDurationSec(input.duration);
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const styleContext: VideoPlannerStyleContext = {
    artStyleId,
    subjectFraming: input.subjectFraming,
    promptExtra: input.promptExtra,
    hasReferenceVideo: Boolean(input.hasReferenceVideo),
  };
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
          durationSec,
          hasReferenceVideo: Boolean(input.hasReferenceVideo),
          styleContext,
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 900, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Video prompt plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt, artStyleId, {
    hasReferenceVideo: Boolean(input.hasReferenceVideo),
  });
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
  brandProfile?: BrandProfile;
  artStyleId?: ArtStyleId | string;
  subjectFraming?: SubjectFraming | string;
  promptExtra?: string;
}): Promise<VideoPromptPlan> {
  const brief = input.creativeBrief?.trim() || "";
  if (!brief) throw new Error("Describe your creative video idea first.");

  const durationSec = resolvePlannerDurationSec(input.duration);
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const styleContext: VideoPlannerStyleContext = {
    artStyleId,
    subjectFraming: input.subjectFraming,
    promptExtra: input.promptExtra,
    hasReferenceVideo: Boolean(input.hasReferenceVideo),
  };
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
          durationSec,
          hasReferenceVideo: Boolean(input.hasReferenceVideo),
          textToVideo: Boolean(input.textToVideo),
          promotionMode: input.promotionMode,
          hasKeyframe: Boolean(input.hasKeyframe),
          imageVisionNote: input.imageVisionNote?.trim() || "",
          conceptIdea: input.conceptIdea?.trim() || "",
          brandProfile: input.brandProfile,
          styleContext,
        }),
      },
    ],
    { temperature: 0.55, max_tokens: 1200, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Creative video plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt, artStyleId, {
    hasReferenceVideo: Boolean(input.hasReferenceVideo),
  });
  return plan;
}

function buildProductPlanPrompt(input: {
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  durationSec: number;
  hasReferenceVideo: boolean;
  styleContext: VideoPlannerStyleContext;
}): string {
  return [
    "Write a Seedance image-to-video prompt for a product social Reel.",
    "Return JSON only — no markdown fences.",
    '{"videoPrompt":"","motionSummary":"","suggestedHeadline":"","productionNotes":""}',
    "",
    "Rules for videoPrompt:",
    "- English prompt for Seedance API.",
    "- The user's product still is @Image1; preserve visual identity and materials from the photo.",
    "- USER product name + headline define WHAT it is and the use-case story (e.g. portable power outdoors).",
    "- Photo may look like another category — still sell the declared function; do not write skincare/serum copy unless the user product is beauty.",
    "- Focus on camera, motion rhythm, lighting, and product interaction that fits the declared story.",
    "- No on-screen text, subtitles, logos, watermarks, speech, or lyrics.",
    `- Keep outcomes realistic and stable for a ${input.durationSec}s ad clip.`,
    input.hasReferenceVideo
      ? "- User may attach @Video1. Match pacing/energy while compressing to OUTPUT length below; product anchored to @Image1."
      : "- Single keyframe image-to-video mode. Keep one coherent motion beat.",
    "",
    ...productIdentityContractLines({
      hasReferenceVideo: input.hasReferenceVideo,
    }),
    "",
    "- motionSummary: one line for users.",
    "- suggestedHeadline: optional short hook line (can echo user headline).",
    "- productionNotes: keep empty unless practical editing guidance helps.",
    localeLineFromHints(input),
    ...videoDurationPlannerBlock(input.durationSec, {
      hasReferenceVideo: input.hasReferenceVideo,
    }),
    "",
    input.product ? `Product name / function (authoritative): ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Headline / hook (drive story): ${input.headline}` : "",
    input.subline ? `Subline hint: ${input.subline}` : "",
    input.offer ? `Offer hint: ${input.offer}` : "",
    ...videoPlannerContextBlock({
      ...input.styleContext,
      hasReferenceVideo: input.hasReferenceVideo,
    }),
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
  artStyleId?: ArtStyleId | string;
  subjectFraming?: SubjectFraming | string;
  promptExtra?: string;
}): Promise<VideoPromptPlan> {
  const durationSec = resolvePlannerDurationSec(input.duration);
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const hasReferenceVideo = Boolean(input.hasReferenceVideo);
  const styleContext: VideoPlannerStyleContext = {
    artStyleId,
    subjectFraming: input.subjectFraming,
    promptExtra: input.promptExtra,
    hasReferenceVideo,
  };
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
          durationSec,
          hasReferenceVideo,
          styleContext,
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 900, jsonObject: true },
  );

  const plan = normalizeVideoPromptPlan(
    parseLlmJsonObject<Partial<VideoPromptPlan>>(outputText, "Product video plan"),
  );
  plan.videoPrompt = finishVideoPrompt(plan.videoPrompt, artStyleId, {
    hasReferenceVideo,
  });
  return plan;
}
