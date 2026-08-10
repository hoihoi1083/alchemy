import { callDeepSeekChat } from "@/lib/deepseek-client";
import { parseLlmJsonObject } from "@/lib/parse-llm-json";
import type {
  TeachingCarouselPlan,
  TeachingCarouselSlide,
} from "@/lib/teaching-carousel-types";
import {
  DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT,
  MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
  MIN_TEACHING_CAROUSEL_SLIDE_COUNT,
} from "@/lib/teaching-carousel-types";
import {
  artStylePlannerHint,
  isIllustratedArtStyle,
  isLookGradeArtStyle,
  resolveArtStyleId,
  type ArtStyleId,
} from "@/lib/art-style";
import { resolveCopyLocale, plannerCopyLanguageRule, rewriteCopyToScript, coerceCopyScript, integratedTypographyPhrase } from "@/lib/copy-locale";
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
  /** When the user uploaded a product photo — every slide must keep that SKU as hero. */
  hasProductPhoto?: boolean;
  /** When layout-transfer (reference ad + product photo), mirror reference layout like single-image mode. */
  referenceStrategyKind?: "layout-transfer" | "style-only" | "none";
  /** Per-slide layout DNA from multi-image carousel vision. */
  carouselSlides?: CarouselSlideReferenceBrief[];
};

function defaultVisualDna(input: PlanInput): string {
  const artId = resolveArtStyleId(input.artStyleId);
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
    input.promptExtra,
  );
  const typePhrase = integratedTypographyPhrase(copyLocale);
  if (isIllustratedArtStyle(artId)) {
    return `${artStylePlannerHint(artId)} Consistent illustrated palette and lettering across all slides — NOT photorealistic photography.`;
  }
  if (isLookGradeArtStyle(artId)) {
    return `${artStylePlannerHint(artId)} Photoreal product photography with this look grade on every slide — atmosphere/palette/lighting only. NOT manga icons, NOT webtoon, NOT cartoon clipart.`;
  }
  if (
    input.promotionMode === "concept" &&
    isPhotographicReferenceBrief(input.promptExtra ?? "")
  ) {
    return `Photorealistic lifestyle product photography — soft natural light, low saturation, linen/fabric textures, ${typePhrase} — NOT cartoon icons or flat infographic clipart`;
  }
  if (input.promotionMode === "concept") {
    return "Editorial IG carousel, cinematic lifestyle or product-in-scene photography, bold integrated typography — NOT classroom slide deck or white infographic";
  }
  return "Clean educational carousel, consistent typography hierarchy, high readability";
}

function fallbackSlides(input: PlanInput, count: number): TeachingCarouselSlide[] {
  const copyLocale = resolveCopyLocale(
    input.promptMarket ?? "hk",
    input.headline,
    input.subline,
    input.product,
  );
  const h = coerceCopyScript(
    input.headline?.trim() ||
      input.product?.trim() ||
      (copyLocale === "zh-hans" ? "主题重点" : copyLocale === "en" ? "Key topic" : "主題重點"),
    copyLocale,
  );
  const lines = (input.subline || "")
    .split(/\||\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => coerceCopyScript(s, copyLocale));
  const illustrated = isIllustratedArtStyle(input.artStyleId);
  const photoRef = isPhotographicReferenceBrief(input.promptExtra ?? "");
  const pointBody =
    copyLocale === "zh-hans"
      ? "补充说明重点，保持一两句"
      : copyLocale === "en"
        ? "Add one short supporting point"
        : "補充說明重點，保持一句到兩句";
  const takeawayMid =
    copyLocale === "zh-hans"
      ? "短句总结，方便记住"
      : copyLocale === "en"
        ? "Short takeaway to remember"
        : "短句總結，方便記住重點";
  const takeawayEnd =
    input.offer?.trim() ||
    (copyLocale === "zh-hans"
      ? "收藏起来，慢慢对照"
      : copyLocale === "en"
        ? "Save this for later"
        : "收藏起來，慢慢對照");
  const coverBody =
    input.subline?.trim() ||
    (copyLocale === "zh-hans"
      ? "用几个角度拆解主题重点"
      : copyLocale === "en"
        ? "Break the topic into a few clear angles"
        : "用幾個角度拆解主題重點");
  const slides: TeachingCarouselSlide[] = [];
  for (let i = 0; i < count; i++) {
    const role: TeachingCarouselSlide["role"] =
      i === 0 ? "cover" : i === count - 1 ? "summary" : "point";
    slides.push({
      index: i + 1,
      role,
      title: i === 0 ? h : `${i}. ${lines[i - 1] || h}`,
      body: i === 0 ? coverBody : lines[i - 1] || pointBody,
      takeaway: i === count - 1 ? takeawayEnd : takeawayMid,
      composition:
        role === "cover"
          ? input.promotionMode === "concept"
            ? illustrated
              ? "Illustrated cover — bold headline integrated into drawn scene, not a photo"
              : "Editorial cover — bold headline over lifestyle/metaphor photo, magazine energy"
            : illustrated
              ? input.hasProductPhoto
                ? "Illustrated cover — exact product from IMAGE 1 as hero with strong headline"
                : "Illustrated cover layout with strong headline hierarchy"
              : input.hasProductPhoto
                ? "Editorial cover — exact product from IMAGE 1 as clear hero with strong headline"
                : "Editorial cover layout with strong headline hierarchy"
          : role === "summary"
            ? input.promotionMode === "concept"
              ? illustrated
                ? "Closing illustrated slide — one CTA line in art medium"
                : "Closing slide — one CTA line on moody photo, not a white recap box"
              : illustrated
                ? input.hasProductPhoto
                  ? "Illustrated recap — exact product from IMAGE 1 still visible with closing takeaway"
                  : "Illustrated recap layout with closing takeaway"
                : input.hasProductPhoto
                  ? "Calm recap — exact product from IMAGE 1 visible with closing takeaway"
                  : "Calm recap layout with closing takeaway box"
            : input.promotionMode === "concept"
              ? illustrated
                ? "Tip slide — one key idea as illustration, not photo edu card"
                : photoRef
                  ? "Tip slide — photo-led flat lay with integrated typography, no cartoon icons"
                  : "Tip slide — one key idea with visual metaphor, not bullet-list edu card"
              : illustrated
                ? input.hasProductPhoto
                  ? "Illustrated tip — exact product from IMAGE 1 visible as hero while teaching one point; no substitute SKU or mascot"
                  : "Illustrated educational card with title + short explanation"
                : input.hasProductPhoto
                  ? "Educational tip — keep exact product from IMAGE 1 visible in the SAME soft/edu series aesthetic (vanity flat-lay / cloth / soft set); teach with typography — no photoreal bathroom/gym lifestyle cutaway, no substitute jewelry"
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
    MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
    Math.max(MIN_TEACHING_CAROUSEL_SLIDE_COUNT, Number(input.slideCount) || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
  );
  const fallback = fallbackSlides(input, targetCount);
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const seenTitles = new Set<string>();
  const slides = rawSlides
    .slice(0, targetCount)
    .map((s, i) => {
      const fb = fallback[i];
      const role =
        s.role === "cover" || s.role === "point" || s.role === "summary" ? s.role : fb.role;
      let title = String(s.title ?? "").trim() || fb.title;
      const titleKey = title.toLowerCase();
      // Planner sometimes repeats the cover headline on every tip — force uniqueness.
      if (seenTitles.has(titleKey)) {
        title = fb.title;
      }
      seenTitles.add(title.toLowerCase());
      let body = String(s.body ?? "").trim() || fb.body;
      if (i > 0 && body && body === String(rawSlides[0]?.body ?? "").trim()) {
        body = fb.body;
      }
      return {
        index: i + 1,
        role,
        title,
        body,
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
    MAX_TEACHING_CAROUSEL_SLIDE_COUNT,
    Math.max(MIN_TEACHING_CAROUSEL_SLIDE_COUNT, Number(input.slideCount) || DEFAULT_TEACHING_CAROUSEL_SLIDE_COUNT),
  );
  const artStyleId = resolveArtStyleId(input.artStyleId);
  const illustrated = isIllustratedArtStyle(artStyleId);
  const lookGrade = isLookGradeArtStyle(artStyleId);
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
          "- LAYOUT TRANSFER: IMAGE 1 = user product hero; IMAGE 2 = style/layout reference. Mirror IMAGE 2 design grammar on every slide — same layout family as the reference (numbered list rows, grid panels, icon bands, cover structure).",
          "- visualDna MUST match IMAGE 2 reference: layout grid type, color palette, typography hierarchy, component shapes — hero subject always IMAGE 1.",
          "- Each slide = one panel/row/section of the IMAGE 2 layout template filled with IMAGE 1 product and user copy — do NOT invent unrelated editorial card layouts.",
          "- Cover slide uses reference cover structure; middle slides follow reference list/grid rhythm; final slide uses reference recap/CTA band style.",
          "- All on-image copy about the user's product only — never zodiac/星座/其他品牌 or wording from the reference post.",
          "- Do NOT copy reference logos, watermarks, or exact Chinese characters from IMAGE 2.",
          ...carouselVisionRules,
        ]
      : photoStyleRef
      ? [
          "- User reference is PHOTOGRAPHIC (product/lifestyle shot) — match soft natural light, low saturation, real crystal/product textures.",
          `- visualDna: photorealistic lifestyle product photography like USER REFERENCE — linen/fabric, soft shadows, ${integratedTypographyPhrase(copyLocale)}.`,
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
            illustrated
              ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — illustrated medium on every slide, NOT photography.`
              : lookGrade
                ? `- visualDna MUST match: ${artStylePlannerHint(artStyleId)} — photoreal product + this look grade only. NO manga icons, webtoon panels, cartoon USB/battery clipart, or speed lines.`
                : "- visualDna: moody/color-graded photography or stylized editorial — strong visual metaphor allowed; avoid plain system font on white boxes.",
            "- Each slide = ONE main idea with a distinct composition (cover / tip / recap) — no repeated layout template.",
            "- Copy is short; body/takeaway must not repeat the title verbatim.",
            "- composition must NOT invent English UI chips/labels (Image, Video, Copy, Copywriting) or an outer matte/letterbox frame around the slide.",
            "- Prefer full-bleed scene metaphors; do not plan 'poster card floating on blank canvas' layouts.",
            "- Follow the user's concept hook / visual metaphor when provided (including stylized characters if the brief implies them) — keep the SAME metaphor family across all slides.",
          ]
        : illustrated
          ? [
              `- Art direction: ${artStylePlannerHint(artStyleId)} — entire carousel in this illustrated medium.`,
              "- visualDna must describe illustrated style consistency, NOT photorealistic photography.",
            ]
          : lookGrade
            ? [
                `- Art direction (look grade): ${artStylePlannerHint(artStyleId)} — keep photoreal product photography; atmosphere/palette only.`,
                "- visualDna must describe this look grade on photography — NEVER manga icons, webtoon, cartoon clipart, or illustrated edu pictograms.",
              ]
            : [];
  return [
    layoutTransferRef
      ? "Create a teaching/info carousel — LAYOUT TRANSFER: IMAGE 1 product hero + IMAGE 2 reference design grammar/grid; user's product and copy on every slide."
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
    "- CRITICAL: Every slide.title MUST be unique — tip/summary slides must NOT reuse the cover headline. Different point = different title.",
    "- body/takeaway must not repeat the title verbatim, and tip bodies must not copy the cover body.",
    "- Do not invent pricing, promotion, or app mechanics unless explicitly provided.",
    input.hasProductPhoto
      ? "- PRODUCT PHOTO present: every slide.composition MUST keep IMAGE 1's photographed object as the visible hero (cover, tip/point, and summary). Product NAME is claim/topic only — never plan a different SKU that matches the name (e.g. do not turn a bottle photo into a power bank)."
      : "",
    input.hasProductPhoto
      ? input.visualStyleId === "model-wear"
        ? "- Tip/point slides teach with typography + a person wearing/using IMAGE 1 in the SAME lifestyle series — vary pose/crop; never invent a different SKU or mascot."
        : "- Tip/point slides teach with typography + product staging in the SAME series medium (flat-lay / soft set / macro) — NEVER plan diagram-only, substitute jewelry, a charger/power station to illustrate 快速充電/mAh/ports, OR a one-off photoreal bathroom/gym/yoga lifestyle cutaway that breaks carousel cohesion. Tip topic = copy only; hero stays IMAGE 1."
      : "",
    lookGrade
      ? "- LOOK GRADE (film/CCD/国风/cinematic): photoreal product + atmosphere only. NEVER plan manga icons, webtoon outlines, cartoon USB/cables, speed lines, battery clipart, or illustrated edu pictograms — teach with typography and real props."
      : "",
    input.visualStyleId === "model-wear"
      ? "- MODEL WEAR style: every slide.composition MUST include a real person wearing or using the product — distinct pose/crop per tip. Never product-only catalog or mascot-only hero."
      : "- Every slide must share one visualDna medium — do not mix soft 3D/illustrated edu cards with photoreal human lifestyle shots in the same carousel.",
    ...conceptRules,
    "",
    `Visual style: ${input.visualStyleId}`,
    illustrated || lookGrade
      ? `Art style (mandatory): ${artStyleId} — ${artStylePlannerHint(artStyleId)}`
      : "",
    input.product
      ? input.hasProductPhoto
        ? `Topic/product NAME (claim / copy only — hero is IMAGE 1 pixels): ${input.product}`
        : `Topic/product: ${input.product}`
      : "",
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
              ? "You plan educational social carousel content in Simplified Chinese (简体) ONLY — never Traditional 繁體. Output strict JSON only."
              : "You plan educational social carousel content in Traditional Chinese (繁體) ONLY — never Simplified 简体. Output strict JSON only.",
      },
      { role: "user", content: buildPlanPrompt(input) },
    ],
    { temperature: 0.5, max_tokens: 1600, jsonObject: true },
  );
  const parsed = parseLlmJsonObject<Partial<TeachingCarouselPlan>>(
    output,
    "Teaching carousel plan",
  );
  const plan = normalizePlan(parsed, input);
  if (copyLocale === "en") return plan;

  const flat: Record<string, string> = { theme: plan.theme };
  for (const slide of plan.slides) {
    flat[`s${slide.index}_title`] = slide.title;
    flat[`s${slide.index}_body`] = slide.body;
    flat[`s${slide.index}_takeaway`] = slide.takeaway;
  }
  const rewritten = await rewriteCopyToScript(flat, copyLocale);
  return {
    ...plan,
    theme: rewritten.theme || plan.theme,
    slides: plan.slides.map((slide) => ({
      ...slide,
      title: rewritten[`s${slide.index}_title`] || slide.title,
      body: rewritten[`s${slide.index}_body`] || slide.body,
      takeaway: rewritten[`s${slide.index}_takeaway`] || slide.takeaway,
    })),
  };
}

/** Exposed for unit tests — same prompt DeepSeek sees. */
export function buildTeachingCarouselPlanPromptForTest(input: PlanInput): string {
  return buildPlanPrompt(input);
}

