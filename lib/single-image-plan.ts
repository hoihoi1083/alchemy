import { callDeepSeekChat, deepSeekApiKey } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { artStylePlannerHint, resolveArtStyleId, type ArtStyleId } from "@/lib/art-style";
import { resolveCopyLocale, plannerCopyLanguageRule, rewriteCopyToScript, coerceCopyScript } from "@/lib/copy-locale";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { VisualStyleId } from "@/lib/visual-styles";
import {
  isPhotographicReferenceBrief,
  isStyleOnlyReferenceExtra,
} from "@/lib/user-reference-brief";

export type SingleImageAdRole = "cover" | "benefit" | "cta";

/** Lightweight teaching-carousel-style plan for one designed social still. */
export type SingleImagePlan = {
  role: SingleImageAdRole;
  theme: string;
  visualDna: string;
  composition: string;
  title: string;
  body: string;
  takeaway: string;
};

export type SingleImagePlanInput = {
  visualStyleId: VisualStyleId;
  promotionMode?: PromotionMode;
  artStyleId?: ArtStyleId;
  promptMarket?: PromptMarket;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  promptExtra?: string;
  hasProductPhoto?: boolean;
};

function defaultVisualDna(input: SingleImagePlanInput): string {
  const stylized = resolveArtStyleId(input.artStyleId) !== "realistic";
  if (stylized) {
    return `${artStylePlannerHint(resolveArtStyleId(input.artStyleId))} Finished illustrated social ad with layered composition — NOT a flat catalog cutout.`;
  }
  if (
    input.promotionMode === "concept" &&
    isPhotographicReferenceBrief(input.promptExtra ?? "")
  ) {
    return "Photorealistic lifestyle photography — soft natural light, textured surfaces, props, depth of field, elegant integrated typography — NOT blank studio white";
  }
  if (input.promotionMode === "concept") {
    return "Editorial IG social still, cinematic lifestyle scene with atmosphere and props, bold integrated typography — NOT classroom slide or blank catalog";
  }
  if (input.hasProductPhoto) {
    return "Premium magazine product ad — rich intentional SETTING around the exact product (surfaces, props, soft shadows, depth), layered typography bands — NEVER a plain bottle on seamless white";
  }
  return "Clean premium social advertisement with intentional art direction, depth, and designed typography hierarchy";
}

function defaultRole(input: SingleImagePlanInput): SingleImageAdRole {
  if (input.offer?.trim()) return "cta";
  if (input.subline?.trim() && input.headline?.trim()) return "benefit";
  return "cover";
}

function defaultComposition(input: SingleImagePlanInput, role: SingleImageAdRole): string {
  const stylized = resolveArtStyleId(input.artStyleId) !== "realistic";
  const photoRef = isPhotographicReferenceBrief(input.promptExtra ?? "");
  if (role === "cta") {
    return stylized
      ? "Closing illustrated ad — dramatic scene + one clear CTA, layered type, generous negative space — not a blank white card"
      : "Closing social ad — moody lifestyle scene with product in context, one CTA line, gradient scrim — not a catalog cutout";
  }
  if (role === "benefit") {
    return stylized
      ? "Benefit illustration — visual metaphor + product, title and short support woven into layout — not a bullet list on white"
      : photoRef
        ? "Photo-led benefit still — lifestyle flat lay or in-use scene, integrated typography, props and texture — no blank sweep"
        : "Benefit social ad — product in a styled scene with one key idea, magazine hierarchy — not a plain product-only beauty shot";
  }
  return stylized
    ? "Illustrated cover — bold hook integrated into a rich drawn scene with depth"
    : input.hasProductPhoto
      ? "Editorial magazine cover — keep exact product from IMAGE 1 as hero, but BUILD a full lifestyle/editorial SETTING around it (stone/linen/glass props, soft rim light, shallow DOF); large headline band + support line; never leave product on empty white seamless"
      : "Editorial cover — bold headline over lifestyle scene with atmosphere and props, magazine energy";
}

export function fallbackSingleImagePlan(input: SingleImagePlanInput): SingleImagePlan {
  const role = defaultRole(input);
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const h = input.headline?.trim() || input.product?.trim() || "Campaign hook";
  return {
    role,
    theme: coerceCopyScript(h, copyLocale),
    visualDna: defaultVisualDna(input),
    composition: defaultComposition(input, role),
    title: coerceCopyScript(h, copyLocale),
    body: coerceCopyScript(input.subline?.trim() || "", copyLocale),
    takeaway: coerceCopyScript(input.offer?.trim() || "", copyLocale),
  };
}

function normalizePlan(
  parsed: Partial<SingleImagePlan>,
  input: SingleImagePlanInput,
): SingleImagePlan {
  const fallback = fallbackSingleImagePlan(input);
  const roleRaw = String(parsed.role ?? "").trim().toLowerCase();
  const role: SingleImageAdRole =
    roleRaw === "cta" || roleRaw === "benefit" || roleRaw === "cover"
      ? roleRaw
      : fallback.role;
  return {
    role,
    theme: String(parsed.theme ?? "").trim() || fallback.theme,
    visualDna: String(parsed.visualDna ?? "").trim() || fallback.visualDna,
    composition: String(parsed.composition ?? "").trim() || fallback.composition,
    title: String(parsed.title ?? "").trim() || fallback.title,
    body: String(parsed.body ?? "").trim() || fallback.body,
    takeaway: String(parsed.takeaway ?? "").trim() || fallback.takeaway,
  };
}

function buildPlanPrompt(input: SingleImagePlanInput): string {
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const stylized = artStyleId !== "realistic";
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const styleOnlyRef = isStyleOnlyReferenceExtra(input.promptExtra);
  return [
    input.promotionMode === "concept"
      ? "Plan ONE editorial social still (IG/FB feed) — not a classroom edu slide or white infographic."
      : "Plan ONE premium product social advertisement still — finished ad energy, not a plain catalog shot.",
    "Return JSON only, no markdown.",
    "",
    "Required JSON:",
    '{"role":"cover|benefit|cta","theme":"","visualDna":"","composition":"","title":"","body":"","takeaway":""}',
    "",
    "Rules:",
    `- ${plannerCopyLanguageRule(copyLocale)}`,
    "- role=cover: bold hook; role=benefit: one selling idea; role=cta: clear action line.",
    "- visualDna: one sentence shared art direction (palette, lighting, photography vs illustration, typography mood).",
    "- composition: specific layout with a FULL scene (surface, props, lighting, type hierarchy) — NEVER 'centered product on plain white'.",
    "- Prefer magazine / Xiaohongshu feed energy: depth, styled set, layered copy — closer to a teaching cover than a catalog cutout.",
    "- title/body/takeaway: short on-image copy. body must not repeat title. takeaway optional unless offer exists.",
    "- Do not invent pricing or fake claims unless provided.",
    "- Avoid Canva/PPT/white edu-card layouts AND avoid blank catalog beauty shots.",
    stylized
      ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — illustrated medium, NOT photography.`
      : "",
    styleOnlyRef
      ? "- Extra requirements may include a style reference — match palette/typography mood, invent a fresh layout."
      : "",
    input.hasProductPhoto
      ? "- User attaches a product photo as IMAGE 1 — keep that exact product as hero, but redesign the environment around it (no seamless white leftover)."
      : "",
    "",
    `Visual style: ${input.visualStyleId}`,
    stylized ? `Art style: ${artStyleId}` : "",
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Brand: ${input.business}` : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subline ? `Supporting: ${input.subline}` : "",
    input.offer ? `Offer/CTA: ${input.offer}` : "",
    input.promptExtra ? `Extra: ${input.promptExtra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Teaching-carousel-quality art direction for a single still.
 * Soft-fails to a deterministic fallback when DeepSeek is unavailable.
 */
export async function planSingleImageAd(input: SingleImagePlanInput): Promise<SingleImagePlan> {
  if (!deepSeekApiKey()) return fallbackSingleImagePlan(input);
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  try {
    const output = await callDeepSeekChat(
      [
        {
          role: "system",
          content:
            copyLocale === "en"
              ? "You plan a single premium social ad still. Output strict JSON only."
              : copyLocale === "zh-hans"
                ? "你规划一张高质量社交媒体广告静帧。文案必须全部使用简体中文，禁止繁体。只输出严格 JSON。"
                : "你規劃一張高質素社交媒體廣告靜幀。文案必須全部使用繁體中文，禁止簡體。只輸出嚴格 JSON。",
        },
        { role: "user", content: buildPlanPrompt(input) },
      ],
      { temperature: 0.45, max_tokens: 700, jsonObject: true },
    );
    const parsed = parseLlmJsonObject<Partial<SingleImagePlan>>(output, "Single image plan");
    const plan = normalizePlan(parsed, input);
    if (copyLocale === "en") return plan;
    const rewritten = await rewriteCopyToScript(
      {
        theme: plan.theme,
        title: plan.title,
        body: plan.body,
        takeaway: plan.takeaway,
      },
      copyLocale,
    );
    return {
      ...plan,
      theme: rewritten.theme || plan.theme,
      title: rewritten.title || plan.title,
      body: rewritten.body || plan.body,
      takeaway: rewritten.takeaway || plan.takeaway,
    };
  } catch {
    return fallbackSingleImagePlan(input);
  }
}

/** Modes that benefit from a single-still planner (designed posters). */
export function shouldPlanSingleImageAd(mode: string, imageTextMode?: string): boolean {
  if (imageTextMode === "textless") return false;
  // Model-wear / UGC have specialized prompts — planner DNA must not dilute "person using product".
  if (mode === "model-wear" || mode === "ugc-presenter") return false;
  return (
    mode === "promo-ai" ||
    mode === "concept-social" ||
    mode === "info-poster" ||
    mode === "service-promo" ||
    mode === "pricing-offer" ||
    mode === "brand-fit" ||
    mode === "website-launch" ||
    mode === "reference-concept" ||
    mode === "concept-cinematic"
  );
}
