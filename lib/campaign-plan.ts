import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import type { CampaignPlan, CampaignSlidePlan } from "@/lib/campaign-types";
import { CAMPAIGN_SLIDE_COUNT } from "@/lib/campaign-types";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import {
  USER_REFERENCE_MARKER,
  isInfographicLikeBrief,
  isLayoutTransferReferenceExtra,
  isPhotographicReferenceBrief,
  isStyleOnlyReferenceExtra,
} from "@/lib/user-reference-brief";
import { getVisualStyle, type VisualStyleId } from "@/lib/visual-styles";

function emptyCampaignPlan(): CampaignPlan {
  return {
    theme: "",
    visualDna: "",
    slides: (["hero", "selling-points", "offer"] as const).map((role) => ({
      role,
      title: defaultSlideTitle(role),
      headline: "",
      subline: "",
      composition: "",
    })),
  };
}

function normalizeCampaignPlan(parsed: Partial<CampaignPlan>): CampaignPlan {
  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const normalized: CampaignSlidePlan[] = slides
    .slice(0, CAMPAIGN_SLIDE_COUNT)
    .map((s, i) => {
      const role =
        s.role === "hero" || s.role === "selling-points" || s.role === "offer"
          ? s.role
          : (["hero", "selling-points", "offer"] as const)[i];
      return {
        role,
        title: String(s.title ?? "").trim() || defaultSlideTitle(role),
        headline: String(s.headline ?? "").trim(),
        subline: String(s.subline ?? "").trim(),
        composition: String(s.composition ?? "").trim(),
      };
    });

  while (normalized.length < CAMPAIGN_SLIDE_COUNT) {
    const role = (["hero", "selling-points", "offer"] as const)[normalized.length];
    normalized.push({
      role,
      title: defaultSlideTitle(role),
      headline: "",
      subline: "",
      composition: "",
    });
  }

  return {
    theme: String(parsed.theme ?? "").trim(),
    visualDna: String(parsed.visualDna ?? "").trim(),
    slides: normalized,
  };
}

function defaultSlideTitle(role: CampaignSlidePlan["role"]): string {
  if (role === "hero") return "Hero";
  if (role === "selling-points") return "Selling points";
  return "Offer";
}

function applyCampaignFallbacks(
  plan: CampaignPlan,
  input: {
    product: string;
    business: string;
    headline: string;
    subline: string;
    offer: string;
    campaignTheme: string;
    brandProfile?: BrandProfile | null;
    hasReferenceLayout?: boolean;
    hasStyleReference?: boolean;
  },
): CampaignPlan {
  const seedHeadline =
    input.headline.trim() ||
    input.brandProfile?.suggestedHeadline?.trim() ||
    input.campaignTheme.trim() ||
    input.product.trim() ||
    input.business.trim() ||
    "Featured product";
  const bulletLines = (
    input.subline.trim() ||
    input.brandProfile?.suggestedBullets?.filter(Boolean).join("\n") ||
    ""
  )
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const offerLine = input.offer.trim();

  const slides = plan.slides.map((slide, i) => {
    const next = { ...slide };
    if (!next.headline) {
      if (slide.role === "hero") next.headline = seedHeadline;
      else if (slide.role === "selling-points")
        next.headline = bulletLines[0] || `Why ${input.product || "choose us"}`;
      else if (slide.role === "offer")
        next.headline =
          offerLine || (input.product ? `了解${input.product}` : "立即選購");
    }
    if (!next.subline) {
      if (slide.role === "selling-points" && bulletLines.length > 1) {
        next.subline = bulletLines.slice(1, 4).join(" · ");
      } else if (slide.role === "offer" && offerLine && offerLine !== next.headline) {
        next.subline = offerLine;
      }
    }
    if (!next.composition) {
      next.composition = input.hasReferenceLayout
        ? i === 0
          ? "Hero slide — mirror IMAGE 1 ad layout rhythm; IMAGE 2 product as hero subject"
          : i === 1
            ? "Selling-points slide — same IMAGE 1 design language with bullet / feature copy layout"
            : "Offer slide — same IMAGE 1 design language with CTA / offer badge area"
        : input.hasStyleReference
          ? i === 0
            ? "Hero slide — match reference palette/typography; new cover layout with main hook headline"
            : i === 1
              ? "Selling-points slide — same reference visual family; distinct bullet/feature layout (not same grid as hero)"
              : "Offer slide — same reference visual family; CTA / recap band with distinct composition"
          : i === 0
            ? "Hero slide — IMAGE 1 content centered and dominant, brand-matched lighting"
            : i === 1
              ? "Selling-points slide — same IMAGE 1 hero with bullet copy layout"
              : "Offer slide — same IMAGE 1 hero with CTA / offer badge";
    }
    return next;
  });

  return {
    theme: plan.theme || input.campaignTheme || seedHeadline,
    visualDna:
      plan.visualDna ||
      input.brandProfile?.adPromptExtra ||
      input.brandProfile?.visualMood ||
      "Coordinated social ad series with consistent colors and typography",
    slides,
  };
}

function buildPlanPrompt(input: {
  visualStyleId: VisualStyleId;
  campaignTheme: string;
  product: string;
  business: string;
  headline: string;
  subline: string;
  offer: string;
  brandProfile?: BrandProfile | null;
  promotionMode?: "physical" | "concept";
  hasReferenceLayout?: boolean;
  hasStyleReference?: boolean;
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  promptExtra?: string;
}): string {
  const style = getVisualStyle(input.visualStyleId);
  const brandBlock = input.brandProfile?.businessName
    ? brandProfilePromptBlock(input.brandProfile)
    : "";
  const contentResearchRef = isContentResearchStyleExtra(input.promptExtra);
  const layoutTransferRef =
    input.hasReferenceLayout ||
    input.referenceStrategyKind === "layout-transfer" ||
    isLayoutTransferReferenceExtra(input.promptExtra);
  const hasUserReference = Boolean(
    contentResearchRef ||
      input.promptExtra?.includes(USER_REFERENCE_MARKER) ||
      isStyleOnlyReferenceExtra(input.promptExtra) ||
      layoutTransferRef,
  );
  const styleOnlyRef =
    !layoutTransferRef &&
    (input.hasStyleReference ||
      contentResearchRef ||
      (input.promotionMode === "concept" && hasUserReference));
  const photoStyleRef =
    styleOnlyRef && isPhotographicReferenceBrief(input.promptExtra ?? "");
  const infographicRef = hasUserReference && isInfographicLikeBrief(input.promptExtra ?? "");

  const referenceRules = layoutTransferRef
    ? [
        "- LAYOUT TRANSFER (reference ad + user product photo): mirror IMAGE 1 design grammar on every slide — same layout family as the reference.",
        "- visualDna MUST match reference: layout grid type, color palette, typography hierarchy from USER REFERENCE.",
        "- Each slide = one campaign role (hero / selling points / offer) filled with USER copy — do NOT invent unrelated editorial layouts.",
        "- All on-image copy about the user's product only — never reuse reference poster wording.",
      ]
    : photoStyleRef
      ? [
          "- User reference is PHOTOGRAPHIC — match soft natural light, real product textures, integrated Chinese typography.",
          "- visualDna: photorealistic lifestyle product photography like USER REFERENCE.",
          "- Each slide.composition: photo-led with distinct layout per slide — NO cartoon icons or flat clipart badges.",
        ]
      : styleOnlyRef
        ? contentResearchRef
          ? [
              "- Content research reference: borrow VISUAL STYLE only — promote the user's product on every slide.",
              "- visualDna: color palette, typography mood, icon/photo style from reference — each slide gets a DIFFERENT layout.",
              "- Never copy reference topic (星座/时政/其他品牌) — user headline/subline only.",
            ]
          : [
              "- User uploaded a STYLE reference — match palette, typography mood, and infographic/edu aesthetic from USER REFERENCE.",
              "- visualDna MUST mirror reference: layout grid type, color palette, typography treatment from USER REFERENCE block.",
              "- Each slide = distinct campaign layout (hero / bullets / CTA) in the same visual family — do NOT paste the same reference grid on every card.",
              "- Spread user headline/subline across slides — never copy reference on-image Chinese text.",
            ]
        : input.promotionMode === "concept" && hasUserReference && infographicRef
          ? [
              "- User uploaded a reference infographic. Plan slides with the SAME visual style family and edu/info lane.",
              "- visualDna MUST mirror reference palette, typography, and component shapes from USER REFERENCE.",
            ]
          : [];

  return [
    "Plan a 3-image social ad CAMPAIGN for a small business. Return a single JSON object only.",
    "All 3 images must feel like ONE coordinated series: same colors, typography energy, and brand mood.",
    "Each slide MUST have a non-empty headline string.",
    "Keep visualDna on one line — no line breaks inside JSON string values.",
    "",
    "Required JSON:",
    '{"theme":"","visualDna":"","slides":[{"role":"hero","title":"","headline":"","subline":"","composition":""},{"role":"selling-points","title":"","headline":"","subline":"","composition":""},{"role":"offer","title":"","headline":"","subline":"","composition":""}]}',
    "",
    "- theme: one-line campaign theme",
    "- visualDna: one-line shared art direction (palette, lighting, typography)",
    "- slides[0] hero: product hero, main hook headline",
    "- slides[1] selling-points: 2-3 bullets as subline, educational/social proof angle",
    "- slides[2] offer: CTA / shop now mood — use ONLY user Offer text if provided",
    "- NEVER invent specific prices (HK$, ¥), discount %, or fake promotions unless Offer field is filled",
    input.hasReferenceLayout
      ? "- User uploaded a REFERENCE AD (IMAGE 1) + product photo (IMAGE 2): plan compositions that follow IMAGE 1 layout family (typography hierarchy, graphic components, product staging pose). All on-image copy must come from user fields — never reuse reference poster wording."
      : styleOnlyRef || layoutTransferRef
        ? "- composition: per-slide layout note — follow USER REFERENCE visual family; distinct layout per slide."
        : "- composition: per-slide layout note — coordinated series with consistent art direction",
    ...referenceRules,
    "- HK/TW market: ALL Chinese copy in Traditional Chinese (繁體) — never Simplified (简体), even if reference material uses 简体",
    "- CN market: Simplified Chinese (简体) only",
    input.promotionMode === "concept" && !styleOnlyRef && !infographicRef
      ? "- CONCEPT campaign: editorial IG series with cinematic lifestyle or product-in-scene photos — NOT white infographic posters or classroom edu slides."
      : "",
    input.promotionMode === "concept" && !styleOnlyRef
      ? "- visualDna: bold integrated typography, color-graded photography, HK agency mood — each slide uses a DIFFERENT layout."
      : "",
    input.promotionMode === "concept"
      ? "- Offer slide: ONE CTA line only — do not repeat the same phrase as headline and subline."
      : "",
    "",
    `Visual style preset: ${style.id} — ${style.promptHint || "general product ad"}`,
    input.campaignTheme ? `User campaign brief: ${input.campaignTheme}` : "",
    input.product ? `Product: ${input.product}` : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Seed headline: ${input.headline}` : "",
    input.subline ? `Seed selling points: ${input.subline}` : "",
    input.offer ? `Offer: ${input.offer}` : "",
    input.promptExtra ? `Reference / style notes: ${input.promptExtra}` : "",
    brandBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

type PlanInput = {
  visualStyleId: VisualStyleId;
  campaignTheme?: string;
  product?: string;
  business?: string;
  headline?: string;
  subline?: string;
  offer?: string;
  brandProfile?: BrandProfile | null;
  promotionMode?: "physical" | "concept";
  hasReferenceLayout?: boolean;
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  promptExtra?: string;
};

function fallbackInput(input: PlanInput) {
  return {
    product: input.product?.trim() || "",
    business: input.business?.trim() || "",
    headline: input.headline?.trim() || "",
    subline: input.subline?.trim() || "",
    offer: input.offer?.trim() || "",
    campaignTheme: input.campaignTheme?.trim() || "",
    brandProfile: input.brandProfile,
  };
}

export async function planCampaign(input: PlanInput): Promise<CampaignPlan> {
  const fb = fallbackInput(input);
  const outputText = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          "You are a social ad campaign planner for Hong Kong / Taiwan / China SMB marketing. Respond with valid JSON only. Never put raw newlines inside JSON strings.",
      },
      {
        role: "user",
        content: buildPlanPrompt({
          visualStyleId: input.visualStyleId,
          promotionMode: input.promotionMode,
          hasReferenceLayout: input.hasReferenceLayout,
          hasStyleReference: input.referenceStrategyKind === "style-only",
          referenceStrategyKind: input.referenceStrategyKind,
          promptExtra: input.promptExtra?.trim() || "",
          ...fb,
        }),
      },
    ],
    { temperature: 0.5, max_tokens: 1400, jsonObject: true },
  );

  let basePlan: CampaignPlan;
  try {
    basePlan = normalizeCampaignPlan(
      parseLlmJsonObject<Partial<CampaignPlan>>(outputText, "Campaign plan"),
    );
  } catch {
    // DeepSeek sometimes returns broken JSON — still generate from brand/user copy.
    basePlan = emptyCampaignPlan();
  }

  const plan = applyCampaignFallbacks(basePlan, {
    ...fb,
    hasReferenceLayout: input.hasReferenceLayout,
    hasStyleReference: input.referenceStrategyKind === "style-only",
  });

  if (!plan.slides.every((s) => s.headline.trim())) {
    throw new Error("Could not plan campaign slides. Try adding a headline or campaign theme.");
  }
  return plan;
}
