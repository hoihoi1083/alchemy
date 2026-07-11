import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type {
  TeachingCarouselPlan,
  TeachingCarouselSlide,
} from "@/lib/teaching-carousel-types";
import { DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT } from "@/lib/teaching-carousel-types";
import { artStylePlannerHint, resolveArtStyleId, type ArtStyleId } from "@/lib/art-style";
import { resolveCopyLocale, plannerCopyLanguageRule } from "@/lib/copy-locale";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { PromptMarket } from "@/lib/prompt-variables";
import type { VisualStyleId } from "@/lib/visual-styles";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { USER_REFERENCE_MARKER, isInfographicLikeBrief, isPhotographicReferenceBrief, isStyleOnlyReferenceExtra, isLayoutTransferReferenceExtra, carouselSlidesPlannerBlock, type CarouselSlideReferenceBrief } from "@/lib/user-reference-brief";

type PlanInput = {
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
  slideCount?: number;
  /** When layout-transfer (reference ad + product photo), mirror reference layout like single-image mode. */
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  /** Per-slide layout DNA from multi-image carousel vision. */
  carouselSlides?: CarouselSlideReferenceBrief[];
};

function defaultVisualDna(input: PlanInput): string {
  const stylized = resolveArtStyleId(input.artStyleId) !== "realistic";
  if (stylized) {
    return `${artStylePlannerHint(resolveArtStyleId(input.artStyleId))} Consistent illustrated palette and lettering across all slides — NOT photorealistic photography.`;
  }
  if (
    input.promotionMode === "concept" &&
    isPhotographicReferenceBrief(input.promptExtra ?? "")
  ) {
    return "Photorealistic lifestyle product photography — soft natural light, low saturation, linen/fabric textures, elegant integrated Chinese typography — NOT cartoon icons or flat infographic clipart";
  }
  if (input.promotionMode === "concept") {
    return "Editorial IG carousel, cinematic lifestyle or product-in-scene photography, bold integrated typography — NOT classroom slide deck or white infographic";
  }
  return "Clean educational carousel, consistent typography hierarchy, high readability";
}

function fallbackSlides(input: PlanInput, count: number): TeachingCarouselSlide[] {
  const h = input.headline?.trim() || input.product?.trim() || "主題重點";
  const lines = (input.subline || "")
    .split(/\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const stylized = resolveArtStyleId(input.artStyleId) !== "realistic";
  const photoRef = isPhotographicReferenceBrief(input.promptExtra ?? "");
  const slides: TeachingCarouselSlide[] = [];
  for (let i = 0; i < count; i++) {
    const role: TeachingCarouselSlide["role"] =
      i === 0 ? "cover" : i === count - 1 ? "summary" : "point";
    slides.push({
      index: i + 1,
      role,
      title: i === 0 ? h : `${i}. ${lines[i - 1] || h}`,
      body:
        i === 0
          ? input.subline?.trim() || "用幾個角度拆解主題重點"
          : lines[i - 1] || "補充說明重點，保持一句到兩句",
      takeaway:
        i === count - 1
          ? input.offer?.trim() || "收藏起來，慢慢對照"
          : "短句總結，方便記住重點",
      composition:
        role === "cover"
          ? input.promotionMode === "concept"
            ? stylized
              ? "Illustrated cover — bold headline integrated into drawn scene, not a photo"
              : "Editorial cover — bold headline over lifestyle/metaphor photo, magazine energy"
            : stylized
              ? "Illustrated cover layout with strong headline hierarchy"
              : "Editorial cover layout with strong headline hierarchy"
          : role === "summary"
            ? input.promotionMode === "concept"
              ? stylized
                ? "Closing illustrated slide — one CTA line in art medium"
                : "Closing slide — one CTA line on moody photo, not a white recap box"
              : stylized
                ? "Illustrated recap layout with closing takeaway"
                : "Calm recap layout with closing takeaway box"
            : input.promotionMode === "concept"
              ? stylized
                ? "Tip slide — one key idea as illustration, not photo edu card"
                : photoRef
                  ? "Tip slide — photo-led flat lay with integrated typography, no cartoon icons"
                  : "Tip slide — one key idea with visual metaphor, not bullet-list edu card"
              : stylized
                ? "Illustrated educational card with title + short explanation"
                : "Educational card layout with title + short explanation",
    });
  }
  return slides;
}

function applyCarouselCompositions(
  plan: TeachingCarouselPlan,
  carouselSlides?: CarouselSlideReferenceBrief[],
): TeachingCarouselPlan {
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

function normalizePlan(parsed: Partial<TeachingCarouselPlan>, input: PlanInput): TeachingCarouselPlan {
  const targetCount = Math.min(
    6,
    Math.max(4, Number(input.slideCount) || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
  );
  const fallback = fallbackSlides(input, targetCount);
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const slides = rawSlides
    .slice(0, targetCount)
    .map((s, i) => {
      const fb = fallback[i];
      const role =
        s.role === "cover" || s.role === "point" || s.role === "summary" ? s.role : fb.role;
      return {
        index: i + 1,
        role,
        title: String(s.title ?? "").trim() || fb.title,
        body: String(s.body ?? "").trim() || fb.body,
        takeaway: String(s.takeaway ?? "").trim() || fb.takeaway,
        composition: String(s.composition ?? "").trim() || fb.composition,
      };
    });
  while (slides.length < targetCount) {
    slides.push(fallback[slides.length]);
  }
  const base = {
    theme: String(parsed.theme ?? "").trim() || (input.headline?.trim() || input.product?.trim() || "教學主題"),
    visualDna: String(parsed.visualDna ?? "").trim() || defaultVisualDna(input),
    slides,
  };
  return applyCarouselCompositions(base, input.carouselSlides);
}

function buildPlanPrompt(input: PlanInput): string {
  const slideCount = Math.min(
    6,
    Math.max(4, Number(input.slideCount) || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
  );
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const stylized = artStyleId !== "realistic";
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const contentResearchRef = isContentResearchStyleExtra(input.promptExtra);
  const layoutTransferRef =
    input.referenceStrategyKind === "layout-transfer" ||
    isLayoutTransferReferenceExtra(input.promptExtra);
  const hasCarouselVision = Boolean(input.carouselSlides?.length);
  const hasUserReference = Boolean(
    contentResearchRef ||
      input.promptExtra?.includes(USER_REFERENCE_MARKER) ||
      isStyleOnlyReferenceExtra(input.promptExtra) ||
      layoutTransferRef ||
      hasCarouselVision,
  );
  const styleOnlyRef =
    !layoutTransferRef &&
    (contentResearchRef || (input.promotionMode === "concept" && hasUserReference));
  const photoStyleRef =
    styleOnlyRef && isPhotographicReferenceBrief(input.promptExtra ?? "");
  const infographicRef = hasUserReference && isInfographicLikeBrief(input.promptExtra ?? "");
  const carouselVisionRules = hasCarouselVision
    ? [
        `- Reference carousel vision analyzed ${input.carouselSlides!.length} slides — map output slide N to reference slide N layout/staging.`,
        carouselSlidesPlannerBlock(input.carouselSlides),
        "- visualDna MUST describe the SHARED reference look (palette, typography, mood, photography style) across all slides.",
        "- Each slide.composition MUST follow the matching reference slide layout — do NOT invent generic edu card layouts.",
      ]
    : [];
  const conceptRules =
    layoutTransferRef
      ? [
          "- LAYOUT TRANSFER (reference ad + user product photo): mirror IMAGE 1 design grammar on every slide — same layout family as the reference (numbered list rows, grid panels, icon bands, cover structure).",
          "- visualDna MUST match reference: layout grid type, color palette, typography hierarchy, component shapes from USER REFERENCE.",
          "- Each slide = one panel/row/section of the reference layout template filled with the USER'S product and copy — do NOT invent unrelated editorial card layouts.",
          "- Cover slide uses reference cover structure; middle slides follow reference list/grid rhythm; final slide uses reference recap/CTA band style.",
          "- All on-image copy about the user's product only — never zodiac/星座/其他品牌 or wording from the reference post.",
          "- Do NOT copy reference logos, watermarks, or exact Chinese characters from the reference.",
          ...carouselVisionRules,
        ]
      : photoStyleRef
      ? [
          "- User reference is PHOTOGRAPHIC (product/lifestyle shot) — match soft natural light, low saturation, real crystal/product textures.",
          "- visualDna: photorealistic lifestyle product photography like USER REFERENCE — linen/fabric, soft shadows, elegant integrated Chinese typography.",
          "- Each slide.composition: photo-led (flat lay, bracelets on fabric, subtle florals) — NO cartoon icons, NO flat line-art pictograms, NO illustrated UI chips or clipart badges.",
          "- Do NOT plan icon rows, stat panels with drawn icons, or gift-guide clipart — photography is the hero on every slide.",
          "- Spread the topic across slides with fresh copy from the user brief — rephrase, do not paste reference text.",
        ]
      : styleOnlyRef
      ? contentResearchRef
        ? [
            "- Content research reference: borrow VISUAL STYLE and slide pacing ONLY — promote the user's product in every slide.",
            "- visualDna: color palette, typography mood, icon/photo style from reference — each slide gets a DIFFERENT layout.",
            "- Every slide.composition MUST describe a unique layout (cover hero vs detail vs tips vs recap).",
            "- All on-image copy must be about the user's product — never copy reference topic (星座/时政/其他品牌).",
            "- Do NOT paste reference on-image text or reference script bullets.",
            ...carouselVisionRules,
          ]
        : [
            "- User uploaded a reference for TOPIC + VISUAL STYLE only — NOT to clone pixel-for-pixel.",
            "- visualDna: color palette, typography mood, icon style, dark/light treatment from USER REFERENCE — but each slide gets a DIFFERENT layout template.",
            "- Every slide.composition MUST describe a unique layout (cover hero vs stat panel vs icon row vs recap) — never repeat the reference poster grid.",
            "- Spread the topic across slides with fresh copy — rephrase reference text themes, do not paste the same headline block on every card.",
            "- Use original characters in similar roles — no real celebrity likenesses.",
          ]
      : input.promotionMode === "concept" && hasUserReference && infographicRef && !contentResearchRef
      ? [
          "- User uploaded a reference infographic/carousel. Plan slides on the SAME topic with the SAME visual style family.",
          "- visualDna MUST mirror reference: layout grid, color palette, typography treatment, icon style from USER REFERENCE block.",
          "- Each slide = one point in the same edu/info lane — do NOT pivot to unrelated product marketing.",
          "- Copy from reference on-image text where relevant; expand across slides without inventing new subject.",
        ]
      : input.promotionMode === "concept"
        ? [
            "- CONCEPT mode: editorial social carousel (HK/IG agency style), NOT classroom edu slides or white infographic posters.",
            stylized
              ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — illustrated medium on every slide, NOT photography.`
              : "- visualDna: moody/color-graded photography, stylized display typography — avoid plain system font on white boxes.",
            "- Each slide = ONE main idea with a distinct composition (cover / tip / recap) — no repeated layout template.",
            "- Copy is short; body/takeaway must not repeat the title verbatim.",
          ]
        : stylized
          ? [
              `- Art direction: ${artStylePlannerHint(artStyleId)} — entire carousel in this illustrated medium.`,
              "- visualDna must describe illustrated style consistency, NOT photorealistic photography.",
            ]
          : [];
  return [
    layoutTransferRef
      ? "Create a teaching/info carousel — LAYOUT TRANSFER from reference ad: same design grammar and grid/list structure as IMAGE 1, user's product and copy on every slide."
      : styleOnlyRef
      ? contentResearchRef
        ? "Create a teaching/info carousel — match reference visual style and slide pacing, promote the user's product (NOT the reference post topic), distinct layout on every slide."
        : "Create a teaching/info carousel — same topic and visual style family as the reference, but a DISTINCT layout on every slide."
      : input.promotionMode === "concept" && hasUserReference && infographicRef
        ? "Create a teaching/info carousel plan matching the user's uploaded reference style and topic."
        : input.promotionMode === "concept"
        ? "Create an editorial social carousel plan (tips & hooks for IG/FB — NOT a classroom edu deck)."
        : "Create a teaching carousel plan for social media (NOT sales campaign).",
    "Return JSON only, no markdown.",
    "",
    `Generate ${slideCount} slides.`,
    "Required JSON:",
    '{"theme":"","visualDna":"","slides":[{"role":"cover|point|summary","title":"","body":"","takeaway":"","composition":""}]}',
    "",
    "Rules:",
    "- Educational tone, no hard-sell discount language by default.",
    `- ${plannerCopyLanguageRule(copyLocale)}`,
    "- Keep each slide copy concise and readable.",
    "- Cover slide introduces topic; middle slides teach; final slide summarizes.",
    "- Do not invent pricing, promotion, or app mechanics unless explicitly provided.",
    ...conceptRules,
    "",
    `Visual style: ${input.visualStyleId}`,
    stylized ? `Art style (mandatory): ${artStyleId} — ${artStylePlannerHint(artStyleId)}` : "",
    input.product ? `Topic/product: ${input.product}` : "",
    input.business ? `Brand: ${input.business}` : "",
    input.headline ? `Main headline: ${input.headline}` : "",
    input.subline ? `Supporting points: ${input.subline}` : "",
    input.offer ? `Optional CTA: ${input.offer}` : "",
    input.promptExtra ? `Extra requirements: ${input.promptExtra}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function planTeachingCarousel(input: PlanInput): Promise<TeachingCarouselPlan> {
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const output = await callDeepSeekChat(
    [
      {
        role: "system",
        content:
          copyLocale === "en"
            ? "You plan educational social carousel content in English. Output strict JSON only."
            : copyLocale === "zh-hans"
              ? "You plan educational social carousel content in Simplified Chinese. Output strict JSON only."
              : "You plan educational social carousel content in Traditional Chinese for HK/TW audiences. Output strict JSON only.",
      },
      { role: "user", content: buildPlanPrompt(input) },
    ],
    { temperature: 0.5, max_tokens: 1600, jsonObject: true },
  );
  const parsed = parseLlmJsonObject<Partial<TeachingCarouselPlan>>(
    output,
    "Teaching carousel plan",
  );
  return normalizePlan(parsed, input);
}

