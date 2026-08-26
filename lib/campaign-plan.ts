import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import type { CampaignPlan, CampaignSlidePlan } from "@/lib/campaign-types";
import { CAMPAIGN_SLIDE_COUNT } from "@/lib/campaign-types";
import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import {
  USER_REFERENCE_MARKER,
  carouselSlidesPlannerBlock,
  isInfographicLikeBrief,
  isLayoutTransferReferenceExtra,
  isPhotographicReferenceBrief,
  isStyleOnlyReferenceExtra,
  type CarouselSlideReferenceBrief,
} from "@/lib/user-reference-brief";
import { getVisualStyle, type VisualStyleId } from "@/lib/visual-styles";

function applyCampaignCarouselCompositions(
  plan: CampaignPlan,
  carouselSlides?: CarouselSlideReferenceBrief[],
): CampaignPlan {
  if (!carouselSlides?.length) return plan;
  const sharedDna = [
    plan.visualDna,
    carouselSlides[0]?.colorPalette ? `Palette: ${carouselSlides[0].colorPalette}` : "",
    carouselSlides[0]?.typographyStyle ? `Type: ${carouselSlides[0].typographyStyle}` : "",
    carouselSlides[0]?.mood ? `Mood: ${carouselSlides[0].mood}` : "",
  ]
    .filter(Boolean)
    .join(". ");
  return {
    ...plan,
    visualDna: sharedDna || plan.visualDna,
    slides: plan.slides.map((s, i) => {
      const ref = carouselSlides[i];
      if (!ref) return s;
      return {
        ...s,
        composition:
          ref.composition ||
          [ref.layoutStyle, ref.stagingPose].filter(Boolean).join(" — ") ||
          String(s.composition ?? "").trim() ||
          s.composition,
      };
    }),
  };
}

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
  const seenHeadlines = new Set<string>();
  const normalized: CampaignSlidePlan[] = slides
    .slice(0, CAMPAIGN_SLIDE_COUNT)
    .map((s, i) => {
      const role =
        s.role === "hero" || s.role === "selling-points" || s.role === "offer"
          ? s.role
          : (["hero", "selling-points", "offer"] as const)[i];
      let headline = String(s.headline ?? "").trim();
      const headlineKey = headline.toLowerCase();
      // Planner sometimes reuses the hero hook on every card — clear so fallbacks can diversify.
      if (headline && seenHeadlines.has(headlineKey)) {
        headline = "";
      }
      if (headline) seenHeadlines.add(headlineKey);
      return {
        role,
        title: String(s.title ?? "").trim() || defaultSlideTitle(role),
        headline,
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
    modelWear?: boolean;
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
      next.composition = input.modelWear
        ? i === 0
          ? "Hero lifestyle — real person wearing/using IMAGE 1, product clearly visible"
          : i === 1
            ? "Feature lifestyle — new pose or crop of person with IMAGE 1 (wrist/hand macro or alternate angle)"
            : "CTA lifestyle — different pose of person with IMAGE 1; offer/CTA band"
        : input.hasReferenceLayout
          ? i === 0
            ? "Hero slide — IMAGE 1 user product as hero; mirror IMAGE 2 ad layout rhythm"
            : i === 1
              ? "Selling-points slide — IMAGE 1 product + IMAGE 2 design language with bullet / feature copy layout"
              : "Offer slide — IMAGE 1 product + IMAGE 2 design language with CTA / offer badge area"
          : input.hasStyleReference
            ? i === 0
              ? "Hero slide — match reference palette/typography; product-led cover with designed title band"
              : i === 1
                ? "Selling-points slide — edu/info card layout (title + short bullets/proof chips) around the SAME product; distinct from hero — not another centered bottle with swapped text"
                : "Offer slide — CTA / recap card in the same visual family; product still visible; distinct composition from hero and selling-points"
            : i === 0
              ? "Hero slide — IMAGE 1 content centered and dominant, brand-matched lighting"
              : i === 1
                ? "Selling-points slide — new crop or flat-lay detail of IMAGE 1; bullet/feature copy in a side or lower panel"
                : "Offer slide — IMAGE 1 in a different staging (hand-held, lifestyle set, or CTA band); distinct composition from hero";
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
  /** User uploaded a product photo (IMAGE 1) — name is claim only. */
  hasProductPhoto?: boolean;
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  promptExtra?: string;
  /** Per-frame layout/staging from research / carousel vision (teaching strength). */
  carouselSlides?: CarouselSlideReferenceBrief[];
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
  const hasCarouselVision = Boolean(input.carouselSlides?.length);
  const carouselVisionRules = hasCarouselVision
    ? [
        `- Reference carousel vision analyzed ${input.carouselSlides!.length} frames — map campaign slide N to reference frame N layout/staging.`,
        carouselSlidesPlannerBlock(input.carouselSlides),
        "- visualDna MUST describe the SHARED reference look (palette, typography, mood) across all 3 campaign slides.",
        "- Each slide.composition MUST follow the matching reference frame layout when available — still keep the user's product as the visible hero.",
      ]
    : [];

  const referenceRules = layoutTransferRef
    ? [
        "- LAYOUT TRANSFER (user product photo + reference ad): IMAGE 1 = product hero; IMAGE 2 = style. Mirror IMAGE 2 design grammar on every slide — same layout family as the reference.",
        "- visualDna MUST match reference: layout grid type, color palette, typography hierarchy from USER REFERENCE.",
        "- Each slide = one campaign role (hero / selling points / offer) filled with USER copy — do NOT invent unrelated editorial layouts.",
        "- All on-image copy about the user's product only — never reuse reference poster wording.",
        ...carouselVisionRules,
      ]
    : photoStyleRef
      ? [
          "- User reference is PHOTOGRAPHIC — match soft natural light, real product textures, integrated on-image typography matching the copy language.",
          "- visualDna: photorealistic lifestyle product photography like USER REFERENCE.",
          "- Each slide.composition: photo-led with distinct layout per slide — NO cartoon icons or flat clipart badges.",
          ...carouselVisionRules,
        ]
      : styleOnlyRef
        ? contentResearchRef
          ? [
              "- Content research reference: borrow VISUAL STYLE, typography rhythm, and frame pacing — promote the user's product on every slide.",
              "- visualDna: color palette, typography mood, icon/photo style from reference — each slide gets a DIFFERENT designed layout.",
              "- Hero: product-led cover. Selling-points: edu/info card energy (title band + short bullets / proof) around the SAME product. Offer: distinct CTA layout.",
              "- Prefer designed social-card structure (clear hierarchy, optional small icons or proof chips) over three nearly identical bottle heroes with only text swapped.",
              "- Never copy reference topic (星座/时政/其他品牌) — user headline/subline only.",
              ...carouselVisionRules,
            ]
          : [
              "- User uploaded a STYLE reference — match palette, typography mood, and infographic/edu aesthetic from USER REFERENCE.",
              "- visualDna MUST mirror reference: layout grid type, color palette, typography treatment from USER REFERENCE block.",
              "- Each slide = distinct campaign layout (hero / edu selling-points card / CTA) in the same visual family — do NOT paste the same reference grid on every card.",
              "- Prefer designed social-card structure (title band, bullets/proof, CTA area) around the product — not three identical bottle heroes with only text swapped.",
              "- Spread user headline/subline across slides — never copy reference on-image Chinese text.",
              ...carouselVisionRules,
            ]
        : input.promotionMode === "concept" && hasUserReference && infographicRef
          ? [
              "- User uploaded a reference infographic. Plan slides with the SAME visual style family and edu/info lane.",
              "- visualDna MUST mirror reference palette, typography, and component shapes from USER REFERENCE.",
              ...carouselVisionRules,
            ]
          : carouselVisionRules;

  return [
    "Plan a 3-image social ad CAMPAIGN for a small business. Return a single JSON object only.",
    "All 3 images must feel like ONE coordinated series: same colors, typography energy, and brand mood.",
    "Each slide MUST have a non-empty headline string.",
    "CRITICAL: Every slide.headline MUST be unique — hero, selling-points, and offer each need DIFFERENT on-image headline copy. Never reuse one shared hook on every card.",
    "Keep visualDna on one line — no line breaks inside JSON string values.",
    "",
    "Required JSON:",
    '{"theme":"","visualDna":"","slides":[{"role":"hero","title":"","headline":"","subline":"","composition":""},{"role":"selling-points","title":"","headline":"","subline":"","composition":""},{"role":"offer","title":"","headline":"","subline":"","composition":""}]}',
    "",
    "- theme: one-line campaign theme",
    "- visualDna: one-line shared art direction (palette, lighting, typography)",
    "- slides[0] hero: product hero, main hook headline",
    "- slides[1] selling-points: 2-3 bullets as subline, educational/social proof angle — DIFFERENT headline from hero",
    "- slides[2] offer: CTA / shop now mood — use ONLY user Offer text if provided — DIFFERENT headline from hero and selling-points",
    "- NEVER invent specific prices (HK$, ¥), discount %, or fake promotions unless Offer field is filled",
    input.visualStyleId === "model-wear"
      ? "- MODEL WEAR style: every slide.composition MUST include a real person wearing or using the product — distinct pose/crop per slide. Never product-only catalog or mascot-only hero."
      : "",
    input.hasProductPhoto
      ? "- PRODUCT PHOTO present: every slide.composition MUST keep IMAGE 1's photographed object as the visible hero (hero, selling-points, and offer). Product NAME is claim/copy only — never plan a different SKU that matches the name or a selling point (e.g. do not turn a bottle photo into a power bank or charging station)."
      : "",
    input.hasReferenceLayout
      ? "- User uploaded product photo (IMAGE 1) + REFERENCE AD (IMAGE 2): plan compositions that follow IMAGE 2 layout family (typography hierarchy, graphic components, product staging pose) while IMAGE 1 product stays the hero. All on-image copy must come from user fields — never reuse reference poster wording."
      : styleOnlyRef || layoutTransferRef
        ? "- composition: per-slide layout note — follow USER REFERENCE visual family; distinct layout per slide."
        : "- composition: per-slide layout note — coordinated series with DISTINCT camera crop / staging per slide (never 'same hero photo with different text')",
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
    input.product
      ? input.hasProductPhoto
        ? `Topic/product NAME (claim / copy only — hero is IMAGE 1 pixels): ${input.product}`
        : `Product: ${input.product}`
      : "",
    input.business ? `Business: ${input.business}` : "",
    input.headline ? `Seed headline: ${input.headline}` : "",
    input.subline ? `Seed selling points: ${input.subline}` : "",
    input.offer ? `Offer: ${input.offer}` : "",
    input.promptExtra
      ? [
          `Reference / research / style notes (MUST influence visualDna + each slide.composition):`,
          input.promptExtra,
          "When research/reference notes are present: match their palette, typography mood, and layout family — do NOT ignore them. Never copy reference on-image wording; use user headline/subline/offer only.",
        ].join("\n")
      : "",
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
  /** Product photo attached — planner must not invent a SKU from the typed name. */
  hasProductPhoto?: boolean;
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  promptExtra?: string;
  carouselSlides?: CarouselSlideReferenceBrief[];
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
          hasProductPhoto: input.hasProductPhoto,
          hasStyleReference: input.referenceStrategyKind === "style-only",
          referenceStrategyKind: input.referenceStrategyKind,
          promptExtra: input.promptExtra?.trim() || "",
          carouselSlides: input.carouselSlides,
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

  const plan = applyCampaignCarouselCompositions(
    applyCampaignFallbacks(basePlan, {
      ...fb,
      hasReferenceLayout: input.hasReferenceLayout,
      hasStyleReference: input.referenceStrategyKind === "style-only",
      modelWear: input.visualStyleId === "model-wear",
    }),
    input.carouselSlides,
  );

  if (!plan.slides.every((s) => s.headline.trim())) {
    throw new Error("Could not plan campaign slides. Try adding a headline or campaign theme.");
  }
  return plan;
}

/** Exposed for unit tests — same prompt DeepSeek sees. */
export function buildCampaignPlanPromptForTest(
  input: Parameters<typeof buildPlanPrompt>[0],
): string {
  return buildPlanPrompt(input);
}
