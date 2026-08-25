import { callDeepSeekChat, deepSeekApiKey } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import {
  artStylePlannerHint,
  isIllustratedArtStyle,
  isLookGradeArtStyle,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";
import {
  resolveCopyLocale,
  plannerCopyLanguageRule,
  rewriteCopyToScript,
  coerceCopyScript,
  preserveUserOnImageCopy,
} from "@/lib/copy-locale";
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
  const artId = resolveArtStyleId(input.artStyleId);
  if (isIllustratedArtStyle(artId)) {
    return `${artStylePlannerHint(artId)} Finished illustrated social ad with layered composition — NOT a flat catalog cutout.`;
  }
  if (isLookGradeArtStyle(artId)) {
    return `${artStylePlannerHint(artId)} Photoreal social ad with this look grade — atmosphere only. NOT manga icons or cartoon clipart.`;
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
  const illustrated = isIllustratedArtStyle(input.artStyleId);
  const photoRef = isPhotographicReferenceBrief(input.promptExtra ?? "");
  if (role === "cta") {
    return illustrated
      ? "Closing illustrated ad — dramatic scene + one clear CTA, layered type, generous negative space — not a blank white card"
      : "Closing social ad — moody lifestyle scene with product in context, one CTA line, gradient scrim — not a catalog cutout";
  }
  if (role === "benefit") {
    return illustrated
      ? "Benefit illustration — visual metaphor + product, title and short support woven into layout — not a bullet list on white"
      : photoRef
        ? "Photo-led benefit still — lifestyle flat lay or in-use scene, integrated typography, props and texture — no blank sweep"
        : "Benefit social ad — product in a styled scene with one key idea, magazine hierarchy — not a plain product-only beauty shot";
  }
  return illustrated
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
  const headline = input.headline?.trim();
  const h = headline || input.product?.trim() || "Campaign hook";
  return lockUserOnImageCopy(
    {
      role,
      theme: coerceCopyScript(h, copyLocale),
      visualDna: defaultVisualDna(input),
      composition: defaultComposition(input, role),
      title: headline
        ? preserveUserOnImageCopy(headline, copyLocale)
        : coerceCopyScript(h, copyLocale),
      body: coerceCopyScript(input.subline?.trim() || "", copyLocale),
      takeaway: coerceCopyScript(input.offer?.trim() || "", copyLocale),
    },
    input,
  );
}

/** Keep user-typed hook/tagline/offer on the still — planner may only 简繁-fix Chinese. */
export function lockUserOnImageCopy(
  plan: SingleImagePlan,
  input: SingleImagePlanInput,
): SingleImagePlan {
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const headline = input.headline?.trim();
  const subline = input.subline?.trim();
  const offer = input.offer?.trim();
  return {
    ...plan,
    title: headline ? preserveUserOnImageCopy(headline, copyLocale) : plan.title,
    body: subline ? preserveUserOnImageCopy(subline, copyLocale) : plan.body,
    takeaway: offer ? preserveUserOnImageCopy(offer, copyLocale) : plan.takeaway,
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
  return lockUserOnImageCopy(
    {
      role,
      theme: String(parsed.theme ?? "").trim() || fallback.theme,
      visualDna: String(parsed.visualDna ?? "").trim() || fallback.visualDna,
      composition: String(parsed.composition ?? "").trim() || fallback.composition,
      title: String(parsed.title ?? "").trim() || fallback.title,
      body: String(parsed.body ?? "").trim() || fallback.body,
      takeaway: String(parsed.takeaway ?? "").trim() || fallback.takeaway,
    },
    input,
  );
}

function buildPlanPrompt(input: SingleImagePlanInput): string {
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const illustrated = isIllustratedArtStyle(artStyleId);
  const lookGrade = isLookGradeArtStyle(artStyleId);
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
    "- Prefer magazine / RedNote feed energy: depth, styled set, layered copy — closer to a teaching cover than a catalog cutout.",
    "- title/body/takeaway: short on-image copy. body must not repeat title. takeaway optional unless offer exists.",
    "- If Headline is provided, title MUST be that exact string (only 简繁 conversion if it is already Chinese). Never replace it with the product name. Never translate Latin/English into Chinese.",
    "- If Supporting is provided, body MUST be that exact string (same 简繁-only rule). Never invent a different slogan.",
    "- If Offer/CTA is provided, takeaway MUST be that exact string.",
    "- Do NOT write 'brand logo', '品牌標誌', 'logo mark', or placeholder logo zones in composition — leave that space empty or use campaign text only. Never instruct painting the English word LOGO.",
    "- Do NOT invent shop-now CTAs (e.g. 立即選購) unless Offer/CTA is provided above.",
    "- Do not invent pricing or fake claims unless provided.",
    "- Avoid Canva/PPT/white edu-card layouts AND avoid blank catalog beauty shots.",
    illustrated
      ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — illustrated medium, NOT photography.`
      : lookGrade
        ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — photoreal product + look grade only. NO manga icons or cartoon clipart.`
        : "",
    styleOnlyRef
      ? "- Extra requirements may include a style reference — match palette/typography mood, invent a fresh layout."
      : "",
    input.hasProductPhoto
      ? "- User attaches IMAGE 1 — keep that EXACT subject as hero (person or product in the pixels). Product NAME is claim/copy only — never invent a different SKU (e.g. do not turn a person photo into a serum bottle because the name says 精華). Redesign the environment around IMAGE 1 (no seamless white leftover)."
      : "",
    "",
    `Visual style: ${input.visualStyleId}`,
    illustrated || lookGrade ? `Art style: ${artStyleId}` : "",
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
              ? "You plan a single premium social ad still. Output strict JSON only. If Headline/Supporting/Offer are provided, copy them verbatim into title/body/takeaway."
              : copyLocale === "zh-hans"
                ? "你规划一张高质量社交媒体广告静帧。theme/visualDna 用简体中文。若用户已填 Headline/Supporting/Offer，title/body/takeaway 必须原样复制（即使是英文或无意义字母），禁止改成产品名或另写广告语。只输出严格 JSON。"
                : "你規劃一張高質素社交媒體廣告靜幀。theme/visualDna 用繁體中文。若用戶已填 Headline/Supporting/Offer，title/body/takeaway 必須原樣複製（即使是英文或無意義字母），禁止改成產品名或另寫廣告語。只輸出嚴格 JSON。",
        },
        { role: "user", content: buildPlanPrompt(input) },
      ],
      { temperature: 0.45, max_tokens: 700, jsonObject: true },
    );
    const parsed = parseLlmJsonObject<Partial<SingleImagePlan>>(output, "Single image plan");
    const plan = normalizePlan(parsed, input);
    if (copyLocale === "en") return lockUserOnImageCopy(plan, input);
    const rewritten = await rewriteCopyToScript(
      {
        theme: plan.theme,
        title: plan.title,
        body: plan.body,
        takeaway: plan.takeaway,
      },
      copyLocale,
    );
    return lockUserOnImageCopy(
      {
        ...plan,
        theme: rewritten.theme || plan.theme,
        title: rewritten.title || plan.title,
        body: rewritten.body || plan.body,
        takeaway: rewritten.takeaway || plan.takeaway,
      },
      input,
    );
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
    mode === "designed-poster" ||
    mode === "parts-poster" ||
    mode === "gaming-cover" ||
    mode === "sports-big-words" ||
    mode === "service-promo" ||
    mode === "pricing-offer" ||
    mode === "brand-fit" ||
    mode === "website-launch" ||
    mode === "reference-concept" ||
    mode === "concept-cinematic"
  );
}
