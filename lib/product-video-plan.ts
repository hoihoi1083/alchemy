import {
  appendArtStyleSeedanceHintIfNeeded,
  artStylePlannerHint,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type { PromptMarket, SubjectFraming } from "@/lib/prompt-variables";
import { VIDEO_BGM_HINT } from "@/lib/templates";
import { videoDurationPlannerBlock } from "@/lib/video-duration-planner";
import type {
  ProductVideoPlan,
  ProductVideoVisionProfile,
} from "@/lib/product-video-types";

function finishSeedancePrompt(
  prompt: string,
  imageCount: number,
  durationSec: number,
  artStyleId: ArtStyleId = "realistic",
): string {
  const p = prompt.trim();
  const needsBgm = !p.includes("instrumental");
  const needsNoText = !/no on-screen|no text/i.test(p);
  const hasSlideshowLanguage = /hard cut|static shot|scene \d+\s*\[\d+-\d+s\]/i.test(p);
  let out = p;
  if (needsNoText) {
    out = `${out} No on-screen text, subtitles, logos, or watermarks.`;
  }
  if (needsBgm) {
    out = `${out}${VIDEO_BGM_HINT}`;
  }
  if (imageCount > 1 || hasSlideshowLanguage) {
    out = `${out} Avoid slideshow structure: no rigid per-image hard-cut timeline, no static hold longer than 1 second. Keep one coherent product-commercial flow with smooth camera motion, motivated transitions, parallax depth, rack focus, and micro-actions (water ripple, hand interaction, light sweep). Use uploaded images as identity references while preserving the exact same product design and proportions.`;
  }
  const lookNote =
    artStyleId === "realistic"
      ? "clean commercial realism"
      : "preserve the stylized illustrated look from reference images";
  out = `${out} Total clip length around ${durationSec}s with continuous motion energy and ${lookNote}.`;
  return appendArtStyleSeedanceHintIfNeeded(out, artStyleId);
}

function normalizePlan(
  parsed: Partial<ProductVideoPlan>,
  vision: ProductVideoVisionProfile,
  imageCount: number,
  durationSec: number,
  artStyleId: ArtStyleId,
): ProductVideoPlan {
  const seedancePrompt = String(parsed.seedancePrompt ?? "").trim();
  if (!seedancePrompt) {
    throw new Error("DeepSeek returned an empty Seedance prompt.");
  }

  for (let i = 1; i <= imageCount; i++) {
    if (!new RegExp(`@\\s*Image\\s*${i}\\b`, "i").test(seedancePrompt)) {
      throw new Error(`Seedance prompt must reference @Image${i}.`);
    }
  }

  return {
    productSummary:
      String(parsed.productSummary ?? "").trim() || vision.productSummary,
    category: String(parsed.category ?? "").trim() || vision.category,
    materials: vision.materials,
    colors: vision.colors,
    situation: String(parsed.situation ?? "").trim() || vision.situation,
    imageRoles: vision.imageRoles,
    seedancePrompt: finishSeedancePrompt(seedancePrompt, imageCount, durationSec, artStyleId),
    motionSummaryZh: String(parsed.motionSummaryZh ?? "").trim(),
    productionNotes: String(parsed.productionNotes ?? "").trim(),
  };
}

function buildPlanPrompt(input: {
  vision: ProductVideoVisionProfile;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  durationSec: number;
  market: PromptMarket;
  framing: SubjectFraming;
  styleHint: string;
  artStyleId: ArtStyleId;
}): string {
  const imageCount = input.vision.imageRoles.length;
  const artStyleId = input.artStyleId;
  const stylized = artStyleId !== "realistic";
  const rolesBlock = input.vision.imageRoles
    .map(
      (r) =>
        `@Image${r.imageIndex} (${r.slot}): ${r.role}. Visual: ${r.visualDescription}`,
    )
    .join("\n");

  return [
    stylized
      ? "Write a Seedance reference-to-video prompt for a stylized product Reel."
      : "Write a Seedance reference-to-video prompt for a photorealistic product Reel.",
    "Return ONE JSON object only — no markdown fences.",
    "",
    'Required JSON: {"productSummary":"","category":"","situation":"","seedancePrompt":"","motionSummaryZh":"","productionNotes":""}',
    "",
    "USER-DECLARED PRODUCT (authoritative for WHAT it is / story / use-case):",
    input.product
      ? `Product name / function: ${input.product}`
      : "Product name: (not provided — infer carefully from headline, not from photo category alone)",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Headline / hook (drive the story): ${input.headline}` : "",
    input.subline ? `Selling points: ${input.subline}` : "",
    "",
    "CRITICAL:",
    "- The uploaded photo may LOOK like a different category (e.g. dropper bottle) while the user sells another function (e.g. portable power / battery).",
    "- Trust the USER name + headline for category, use-case, and marketing story.",
    "- Use PHOTO VISION only for on-screen appearance: shape, materials, colors, packaging — lock @Image1 identity.",
    "- Do NOT write a skincare/serum/oil ad just because Florence guessed that from the photo.",
    "- situation + seedancePrompt must sell the DECLARED product function (outdoor power, charging, etc. when named), while keeping the exact visual of @Image1.",
    "",
    "PHOTO VISION (appearance only — not category override):",
    `Visual summary: ${input.vision.productSummary}`,
    `Vision-guessed category (IGNORE if it conflicts with user product name): ${input.vision.category}`,
    input.vision.materials.length
      ? `Materials: ${input.vision.materials.join(", ")}`
      : "",
    input.vision.colors.length ? `Colors: ${input.vision.colors.join(", ")}` : "",
    `Vision-suggested setting (adapt to user story): ${input.vision.situation}`,
    "",
    "Image roles:",
    rolesBlock,
    "",
    "seedancePrompt rules (English, for Seedance API):",
    stylized
      ? `- Opening: 9:16 commercial for the USER's product (${input.product || "see headline"}). ${artStylePlannerHint(artStyleId)}`
      : `- Opening: photorealistic 9:16 commercial for the USER's product (${input.product || "see headline"}).`,
    `- Reference exactly ${imageCount} images as @Image1 … @Image${imageCount}.`,
    imageCount === 1
      ? "- Single-image mode: commercial motion on @Image1 that fits the declared use-case — not a generic beauty packshot unless the user product is beauty."
      : [
          "- Multi-image mode: NOT a slideshow; avoid rigid scene blocks and avoid per-image hard cuts.",
          "- Build one coherent commercial flow with smooth transitions (motivated pan, match move, whip or light-wipe) and continuous motion energy.",
          "- Motion should feel dynamic but controllable: push-in/pull-out, arc shot, rack focus, parallax depth, subtle product interaction.",
          "- No static hold longer than ~1s. Every beat should include clear motion.",
          "- Match motion to each image role while keeping one product identity.",
        ].join("\n"),
    "- Preserve exact visual identity from @Image references — do not morph into a different-looking item.",
    "- category/productSummary in JSON must match the USER-declared product, not the vision guess.",
    "- NO on-screen text, prices, logos, or watermarks unless user offer requires CTA text.",
    input.offer
      ? `- User offer (optional CTA beat only): ${input.offer}`
      : "- User did NOT provide pricing — do NOT invent prices.",
    "",
    "motionSummaryZh: one line for the user (繁體中文 if HK/TW market).",
    "productionNotes: brief note on what to expect from one Seedance clip (繁體中文 or English).",
    ...videoDurationPlannerBlock(input.durationSec),
    input.styleHint ? `Visual mood hint: ${input.styleHint}` : "",
    input.framing !== "auto" ? `Framing preference: ${input.framing}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type PlanProductVideoInput = {
  vision: ProductVideoVisionProfile;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  durationSec?: number;
  market?: PromptMarket;
  framing?: SubjectFraming;
  styleHint?: string;
  artStyleId?: ArtStyleId | string;
};

export async function planProductVideoFromVision(
  input: PlanProductVideoInput,
): Promise<ProductVideoPlan> {
  const durationSec = Math.min(
    15,
    Math.max(4, Number(input.durationSec) || 8),
  );
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const imageCount = input.vision.imageRoles.length;

  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a Seedance video prompt engineer for HK/TW/CN SMB product Reels. Output valid JSON only. User-declared product name/headline define WHAT the product is; photo vision only defines how it LOOKS. Never override a power-bank/electronics story with skincare just because the photo looks like a bottle.",
      },
      {
        role: "user",
        content: buildPlanPrompt({
          vision: input.vision,
          product: input.product?.trim() || "",
          business: input.business?.trim() || "",
          headline: input.headline?.trim() || "",
          subline: input.subline?.trim() || "",
          offer: input.offer?.trim() || "",
          durationSec,
          market: input.market || "hk",
          framing: input.framing || "auto",
          styleHint: input.styleHint?.trim() || "",
          artStyleId,
        }),
      },
    ],
    { temperature: 0.45, max_tokens: 2000, jsonObject: true },
  );

  return normalizePlan(
    parseLlmJsonObject<Partial<ProductVideoPlan>>(outputText, "Product video plan"),
    input.vision,
    imageCount,
    durationSec,
    artStyleId,
  );
}
