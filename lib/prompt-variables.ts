import type { BrandProfile } from "@/lib/brand-profile";
import { brandProfilePromptBlock } from "@/lib/brand-profile";
import type { BrandKit } from "@/lib/brand-kit";
import {
  brandKitHasPromptContent,
  brandKitLogoImagePromptBlock,
  brandKitPromptBlock,
  thirdPartyBrandGuardBlock,
} from "@/lib/brand-merge";
import type { ImageTextMode } from "@/lib/image-text-mode";
import { TEXTLESS_IMAGE_GUARD } from "@/lib/image-text-mode";
import type { PromotionMode } from "@/lib/promotion-mode";
import type { WorkflowMode } from "@/lib/workflow-mode";
import {
  isInfographicLikeBrief,
  isLayoutTransferReferenceExtra,
  isPhotographicReferenceBrief,
  isStyleOnlyReferenceExtra,
  type CarouselSlideReferenceBrief,
} from "@/lib/user-reference-brief";
import {
  applyTemplate,
  getTemplate,
  VIDEO_BGM_HINT,
  type MarketingTemplate,
  type TemplateId,
} from "@/lib/templates";
import {
  buildModelWearPresentationHint,
  buildSecondFrameSceneHint,
} from "@/lib/product-scene-hints";
import { carouselProductHeroLock, carouselSeriesConsistencyLock, carouselUniqueCopyHint } from "@/lib/fal-dual-reference-urls";
import {
  creativityMotionHint,
  type VideoCreativity,
} from "@/lib/video-creativity";
import type {
  StoryboardScenePlan,
  VideoStoryboardPlan,
} from "@/lib/video-storyboard-types";
import { lookBibleSummaryLine } from "@/lib/shot-recipes";
import {
  REFERENCE_CONTENT_REPLACE_LINE,
  REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE,
  REFERENCE_ERASE_TEXT_LINE,
  REFERENCE_STYLE_MATCH_LINE,
  REFERENCE_TOPIC_GUARD_LINE,
} from "@/lib/reference-style-transfer";
import {
  applyArtStyleNegative,
  artStyleAvoidTail,
  artStyleConceptHeroHint,
  artStyleImageClause,
  artStyleMandatoryLead,
  artStylePhotorealConceptLock,
  artStylePlannerHint,
  artStyleSeedanceHint,
  artStyleStoryboardLead,
  DEFAULT_ART_STYLE,
  type ArtStyleId,
} from "@/lib/art-style";

import {
  typographyHintForLocale,
  marketChineseScriptBlock,
  resolveCopyLocale,
  integratedTypographyPhrase,
  type CopyLocale,
} from "@/lib/copy-locale";
import {
  seedanceSafeStillPromptClause,
  conceptServiceStillSafetyClause,
  softenStoryboardStillPromptForModeration,
} from "@/lib/seedance-moderation";

export type VideoPromptOpts = {
  creativity?: VideoCreativity;
  dualFrame?: boolean;
  multiAngle?: boolean;
};

/** Visual / cultural style for the ad (AI prompts stay in English). */
export type PromptMarket = "hk" | "tw" | "cn" | "en";

/** What (if any) human body parts may appear. */
export type SubjectFraming =
  | "auto"
  | "product-only"
  | "hands-only"
  | "legs-feet"
  | "torso-no-face"
  | "no-people";

export const PROMPT_MARKETS: PromptMarket[] = ["hk", "tw", "cn", "en"];

export const SUBJECT_FRAMINGS: SubjectFraming[] = [
  "auto",
  "product-only",
  "hands-only",
  "legs-feet",
  "torso-no-face",
  "no-people",
];

export function subjectFramingPreviewSrc(id: SubjectFraming): string {
  return `/images/studio/framing/${id}.png?v=1`;
}

export type PromptVariables = {
  product: string;
  business?: string;
  offer?: string;
  headline?: string;
  subline?: string;
  market: PromptMarket;
  framing: SubjectFraming;
  extra?: string;
  artStyle?: ArtStyleId;
  imageTextMode?: ImageTextMode;
};

const MARKET_HINTS: Record<PromptMarket, string> = {
  hk: "Hong Kong local boutique aesthetic, modern Asian urban lifestyle, premium but approachable. All on-image marketing copy in Traditional Chinese (繁體中文).",
  tw: "Taiwan lifestyle aesthetic, soft natural tones, friendly local brand feel. All on-image marketing copy in Traditional Chinese (繁體中文).",
  cn: "Mainland China Xiaohongshu/Douyin social creative — designed editorial feed post with atmosphere and props, not a blank catalog cutout. All on-image marketing copy in Simplified Chinese (简体中文) ONLY — never Traditional 繁體.",
  en: "International English-market commercial style, clean premium western retail look with intentional art direction. All on-image marketing copy in English only.",
};

const FRAMING_IMAGE: Record<SubjectFraming, string> = {
  auto: "",
  "product-only": "Product only as hero subject, no people in frame",
  "hands-only":
    "Only hands visible interacting with the product, cropped so face is never shown, elegant hand model",
  "legs-feet":
    "Only lower legs and feet visible, ideal for shoes or socks, cropped above the knee, no face or upper body",
  "torso-no-face":
    "Torso and arms may appear but face must be completely out of frame or obscured, no identifiable face",
  "no-people": "No people, no hands, no body parts — product and scene only",
};

const FRAMING_VIDEO: Record<SubjectFraming, string> = {
  auto: "",
  "product-only": "Animate product only, no people",
  "hands-only": "Subtle motion of hands holding the product, face never visible",
  "legs-feet": "Subtle motion on feet/legs wearing the product, no upper body or face",
  "torso-no-face": "Gentle motion on torso/hands, face never shown",
  "no-people": "Product-only motion, no human subjects",
};

export function subjectFramingVideoHint(framing: SubjectFraming): string {
  return FRAMING_VIDEO[framing] ?? "";
}

const FRAMING_NEGATIVE: Record<SubjectFraming, string> = {
  auto: "",
  "product-only": "person, human, face, hands, body, model portrait",
  "hands-only": "face, eyes, nose, mouth, full portrait, identifiable person, celebrity",
  "legs-feet": "face, upper body, torso, arms, portrait, head",
  "torso-no-face": "face, eyes, identifiable face, portrait, head close-up",
  "no-people": "person, human, face, hands, legs, body, model",
};

export function buildPromptVariables(input: {
  product: string;
  business?: string;
  offer?: string;
  headline?: string;
  subline?: string;
  market: PromptMarket;
  framing: SubjectFraming;
  extra?: string;
  artStyle?: ArtStyleId;
  imageTextMode?: ImageTextMode;
}): PromptVariables {
  const product = input.product.trim();
  const sanitized = sanitizeOnImageCopy({
    product,
    subline: input.subline?.trim(),
    offer: input.offer?.trim(),
  });
  return {
    product,
    business: input.business?.trim(),
    offer: sanitized.offer,
    headline: input.headline?.trim(),
    subline: sanitized.subline,
    market: input.market,
    framing: input.framing,
    extra: input.extra?.trim(),
    artStyle: input.artStyle ?? DEFAULT_ART_STYLE,
    imageTextMode: input.imageTextMode,
  };
}

const PLANNER_META_SUBLINE = /^(?:\d+-slide\s+)?carousel:/i;
const STORYBOARD_STRUCTURE_SUBLINE =
  /開場亮點|行動呼籲|开场亮点|行动呼吁|中段展示|結尾呼籲|结尾呼吁/i;

export function isStoryboardStructureLabel(text: string | undefined): boolean {
  return Boolean(text?.trim() && STORYBOARD_STRUCTURE_SUBLINE.test(text));
}
const REFERENCE_TOPIC_COPY =
  /星座|留言你的|留言領取|你是.{0,4}座嗎|cover hook|product benefits|recap CTA/i;

/** Strip planner meta-text and reference-topic CTAs before they become on-image copy. */
export function sanitizeOnImageCopy(input: {
  product: string;
  subline?: string;
  offer?: string;
}): { subline?: string; offer?: string } {
  const product = input.product.trim();
  let subline = input.subline?.trim();
  let offer = input.offer?.trim();
  if (
    subline &&
    (PLANNER_META_SUBLINE.test(subline) ||
      STORYBOARD_STRUCTURE_SUBLINE.test(subline) ||
      /cover hook/i.test(subline) ||
      /All copy about/i.test(subline))
  ) {
    subline = product ? `重點介紹${product}` : undefined;
  }
  if (offer && (REFERENCE_TOPIC_COPY.test(offer) || (/留言|評論/i.test(offer) && product && !offer.includes(product)))) {
    offer = product ? `了解${product}` : offer;
  }
  return { subline, offer };
}

function joinParts(...parts: (string | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p?.trim()))
    .join(". ")
    .replace(/\.\s*\./g, ".");
}

function brandPromptExtras(
  brandProfile?: BrandProfile | null,
  brandKit?: BrandKit | null,
): string {
  return joinParts(
    brandProfile?.businessName
      ? joinParts(
          "Apply this brand DNA in art direction, palette, and typography tone.",
          brandProfilePromptBlock(brandProfile),
        )
      : "",
    brandKitHasPromptContent(brandKit) ? brandKitPromptBlock(brandKit!) : "",
  );
}

/** Strong anchor so edit models keep the uploaded reference as the hero — not brand-template stock scenes. */
function imageReferenceAnchorBlock(vars: PromptVariables): string {
  const label = vars.product?.trim() || "the uploaded reference";
  return joinParts(
    "CRITICAL — IMAGE 1 IS MANDATORY",
    `IMAGE 1 is the user's uploaded reference for "${label}". The output MUST clearly show recognizable content from IMAGE 1 as the hero subject.`,
    "Do NOT replace IMAGE 1 with an unrelated stock scene or a different product category.",
    "If IMAGE 1 is a graphic, poster, or app/UI screenshot: keep the same visual content and layout as the hero — polish lighting and integrate campaign copy; do not swap in unrelated products.",
    "If IMAGE 1 is a physical product photo: preserve the exact item — colors, materials, shape, packaging, label details.",
    "You MUST redesign the SETTING around IMAGE 1 — build surfaces, props, soft shadows, depth of field, and atmosphere. Do NOT keep a blank seamless white/cream studio backdrop from the upload.",
    "Never change the product identity from IMAGE 1 — only the environment, lighting, and typography around it.",
  );
}

/** Carousel style-only: reference informs palette/typography/topic — each slide is a new layout (no IMAGE 1 edit). */
function imageStyleOnlyReferenceBlock(compositionHint?: string): string {
  return joinParts(
    "STYLE-ONLY REFERENCE — IMAGE 1 (when attached) is for visual style ONLY",
    "Match IMAGE 1 color palette, typography mood, lighting softness, and infographic/edu aesthetic.",
    "Design a COMPLETELY NEW layout for this slide — different composition, grid, and hero arrangement from IMAGE 1.",
    "Replace ALL on-image text with the user's campaign copy in this prompt — never copy Chinese characters from IMAGE 1.",
    "If IMAGE 1 is a photograph, keep photorealistic product/lifestyle photography — no cartoon icons, line-art badges, or illustrated UI chips unless IMAGE 1 clearly contains them.",
    thirdPartyBrandGuardBlock(),
    "Use the USER REFERENCE text block for extra palette/typography detail when present.",
    compositionHint ? `Required layout for this slide: ${compositionHint}.` : "",
    "Do NOT duplicate the reference hero arrangement or paste the same graphic structure on every card.",
    "Avoid real celebrity likenesses — use original characters in similar thematic roles.",
  );
}

export type ReferenceImageMode = "none" | "clone" | "style-only";

function referenceBlockForMode(
  mode: ReferenceImageMode,
  vars: PromptVariables,
  compositionHint?: string,
): string {
  if (mode === "clone") return imageReferenceAnchorBlock(vars);
  if (mode === "style-only") return imageStyleOnlyReferenceBlock(compositionHint);
  return "";
}

export function buildImageEditPrompt(
  template: MarketingTemplate,
  vars: PromptVariables,
): string {
  const base = applyTemplate(template.imageEditPromptTemplate, vars);
  return joinParts(
    base,
    MARKET_HINTS[vars.market],
    FRAMING_IMAGE[vars.framing],
    vars.extra,
  );
}

function userFacingAdCopyLines(vars: PromptVariables): string[] {
  const lines: string[] = [];
  if (vars.headline?.trim()) lines.push(vars.headline.trim());
  if (vars.subline?.trim()) lines.push(vars.subline.trim());
  if (vars.offer?.trim()) lines.push(vars.offer.trim());
  return lines;
}

function promoAdCopyLines(vars: PromptVariables): string[] {
  const lines: string[] = [];
  if (vars.headline?.trim()) lines.push(vars.headline.trim());
  else if (vars.product?.trim()) lines.push(vars.product.trim());
  if (vars.subline?.trim()) lines.push(vars.subline.trim());
  if (vars.offer?.trim()) lines.push(vars.offer.trim());
  if (vars.business?.trim()) lines.push(vars.business.trim());
  return lines;
}

function promoArtDirectionHint(vars: PromptVariables): string {
  const cues = joinParts(vars.product, vars.headline, vars.subline, vars.offer, vars.business, vars.extra);
  if (cues) {
    return `Art direction: infer background, props, lighting, mood, and layout from the product and campaign brief — fit this specific item and message; do not default to a fixed template look (e.g. do not assume marble, testimonial collage, or studio box shot unless the brief implies it).`;
  }
  return `Art direction: infer a fitting ad style from the product in the photo — category-appropriate scene and mood, not a one-size-fits-all template.`;
}

function copyLocaleForVars(vars: PromptVariables, extraSamples: string[] = []): CopyLocale {
  return resolveCopyLocale(
    vars.market,
    vars.headline,
    vars.subline,
    vars.offer,
    vars.product,
    vars.business,
    ...extraSamples,
  );
}

function promoTypographyHint(vars: PromptVariables, copyFromReference?: boolean): string {
  const lines = copyFromReference ? userFacingAdCopyLines(vars) : promoAdCopyLines(vars);
  const locale = copyLocaleForVars(vars, lines);
  const langHint = typographyHintForLocale(locale, lines);
  const refNote = copyFromReference
    ? " Do NOT copy readable wording or Chinese character forms from IMAGE 1 — write fresh on-image copy in the required script only."
    : "";
  const noInventedPricing =
    " Do NOT add price tags, currency amounts (e.g. HK$, ¥), discount percentages (e.g. 88折), or limited-time sale claims unless the brief explicitly includes an Offer line.";
  if (lines.length > 0) {
    const hasOffer = Boolean(vars.offer?.trim());
    const offerNote = hasOffer
      ? " Use only the provided Offer text for any promotion badge — do not invent extra prices or discounts."
      : noInventedPricing;
    return `${langHint} Integrate these marketing lines into the poster as readable ad copy — bold main headline, supporting sublines${hasOffer ? ", optional offer badge" : ""}, optional brand footer.${offerNote}${refNote}`;
  }
  if (copyFromReference) {
    return `${langHint} User provided no on-image copy — keep text minimal: product hero only, matching IMAGE 1 layout and typography zones without inventing 攻略/edu headlines, bullet lists, or offer badges.${noInventedPricing}${refNote}`;
  }
  const product = vars.product?.trim() || "the product";
  return `${langHint} Add short boutique ad headlines suited to ${product} — hook plus supporting line, woven into the layout.${noInventedPricing}${refNote}`;
}

function parseSellingPointBullets(subline?: string): string[] {
  if (!subline?.trim()) return [];
  return subline
    .split(/\n/)
    .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * IG info-poster technique (gptsavyy workflow):
 * category → selling points → simplified copy → single theme → category visuals → premium white → quality check.
 * Avoids generic overcrowded AI poster look.
 */
export function buildInfoPosterImagePrompt(vars: PromptVariables): string {
  const product = vars.product?.trim() || "the product";
  const headline = vars.headline?.trim() || product;
  const bullets = parseSellingPointBullets(vars.subline);
  const bulletText = bullets.length
    ? `Supporting bullets (max ${bullets.length}, keep short): ${bullets.join(" · ")}.`
    : "Add 2–3 very short supporting bullets derived from the product category.";
  const langHint =
    vars.market === "en"
      ? "Use clean modern English typography with clear hierarchy."
      : vars.market === "cn"
        ? "Use clean modern Simplified Chinese typography (简体中文) — spell every character accurately."
        : "Use clean modern Traditional Chinese typography (繁體中文) — spell every character accurately.";

  return joinParts(
    `Create a premium vertical INFO POSTER for ${product} — NOT a generic AI collage, NOT a dark moody ad.`,
    `WORKFLOW (follow in order):`,
    `1) Product category: infer from product name and IMAGE 1 (beauty/skincare, jewelry, food, fashion, wellness, etc.).`,
    `2) Selling points: use only the most relevant points for THIS single image — do not list everything.`,
    `3) Copy simplification: ONE main headline theme only; short bullets; generous whitespace — never cram all text into one block.`,
    `4) Single topic: this image covers one theme — "${headline}". Other points stay as small bullets only.`,
    bulletText,
    `5) Category visualization: styled scene with category-fitting props and texture (beauty = stone/linen + soft botanical; jewelry = velvet/pedestal + warm specular; food = fresh ingredient flat-lay) — NOT empty seamless white.`,
    `6) Premium editorial style: soft natural light, airy negative space, designed IG/XHS info-post energy — richer than a catalog cutout, cleaner than a crowded Canva flyer.`,
    `7) Quality check: avoid obvious AI poster tells — no overcrowded text, no Canva-style frames, no neon gradients, no watermark, no social UI, no blank product-only beauty shot.`,
    imageReferenceAnchorBlock(vars),
    `Remove outdated marketing text from IMAGE 1 only where new slide copy replaces it.`,
    `Layout: product hero ~35–45% of frame in a styled setting, headline prominent, 2–4 short support lines with airy hierarchy — professional IG info-post, not a plain bottle on white.`,
    langHint,
    vars.business ? `Brand footer: ${vars.business}.` : "",
    vars.offer ? `Optional offer badge: ${vars.offer}.` : "",
    MARKET_HINTS[vars.market],
    FRAMING_IMAGE[vars.framing],
    vars.extra,
    "Single 9:16 marketing still.",
  );
}

import type { CampaignSlidePlan } from "@/lib/campaign-types";
import { getVisualStyle, type VisualStyleId } from "@/lib/visual-styles";
import type { SingleImagePlan } from "@/lib/single-image-plan";

export type ImagePromptMode =
  | "promo-ai"
  | "reference-concept"
  | "info-poster"
  | "brand-fit"
  | "model-wear"
  | "ugc-presenter"
  | "service-promo"
  | "pricing-offer"
  | "website-launch"
  | "concept-cinematic"
  | "concept-social";

export type ImagePromptContext = {
  promotionMode?: PromotionMode;
  workflowMode?: WorkflowMode;
};

/** Scroll-stopping concept post for IG/FB — creative layout with integrated copy, not a white flyer. */
function conceptSocialPreferAvoid(
  direction: string | undefined,
  stylized: boolean,
  referenceImageMode: ReferenceImageMode = "none",
  copyLocale: CopyLocale = "zh-hant",
): { prefer: string; avoid: string } {
  const styleOnly =
    referenceImageMode === "style-only" || isStyleOnlyReferenceExtra(direction);
  const typePhrase = integratedTypographyPhrase(copyLocale);
  if (styleOnly && direction && isPhotographicReferenceBrief(direction)) {
    return {
      avoid:
        "cartoon icons, flat line-art pictograms, illustrated UI chips, clipart badges, emoji stickers, 3D glossy icons, stock handshake, watermark",
      prefer:
        `Photorealistic lifestyle product photography like IMAGE 1 — soft natural light, low saturation, real crystal beads on linen/fabric, ${typePhrase}; new photo-led layout every slide.`,
    };
  }
  if (styleOnly && direction && isInfographicLikeBrief(direction)) {
    return {
      avoid:
        "stock handshake, generic AI poster collage, duplicated headline text, watermark, loud neon gradients unrelated to the reference palette",
      prefer:
        "Match the reference Colors, Typography, and Mood from Creative direction — soft infographic / edu-carousel aesthetic, low saturation, clean hierarchy; new layout every slide.",
    };
  }
  if (styleOnly) {
    return {
      avoid:
        "unrelated stock scene, generic AI poster collage, duplicated headline, watermark",
      prefer:
        "Match reference Colors and Typography from Creative direction — distinct composition per slide, same visual family.",
    };
  }
  return {
    avoid:
      "white infographic template, edu-carousel flyer, Canva 3-block layout, stacked bullet list, stock handshake, generic AI poster collage, plain white seamless catalog backdrop, empty cream studio sweep, outer matte/letterbox frame, poster card floating on a blank canvas, repeating the same headline or CTA line multiple times, English UI chips labeled Image/Video/Copy/Copywriting",
    prefer: stylized
      ? "consistent illustrated palette, layered scene with props, one strong visual metaphor, medium-appropriate lettering, full-bleed edge-to-edge"
      : "cinematic color grade, lifestyle set design with props and depth, HK/IG agency aesthetic, one strong visual metaphor, layered typography full-bleed — never a lone product on blank white, never a framed card on a larger empty background",
  };
}

export function buildConceptSocialImagePrompt(
  vars: PromptVariables,
  brandProfile?: BrandProfile | null,
  slideOpts?: {
    mainLine?: string;
    supportLine?: string;
    ctaLine?: string;
    referenceImageMode?: ReferenceImageMode;
    singleImagePlan?: SingleImagePlan | null;
    /** Carousel slide — stronger once-only copy + full-bleed rules. */
    carouselSlide?: boolean;
  },
): string {
  const plan = slideOpts?.singleImagePlan;
  const carousel = Boolean(slideOpts?.carouselSlide);
  const name = vars.business?.trim() || vars.product?.trim() || "the concept";
  const hook =
    plan?.title?.trim() || slideOpts?.mainLine?.trim() || vars.headline?.trim() || name;
  const support = plan?.body?.trim() || slideOpts?.supportLine?.trim() || vars.subline?.trim();
  const cta = plan?.takeaway?.trim() || slideOpts?.ctaLine?.trim() || vars.offer?.trim();
  const direction = vars.extra?.trim();
  const locale = copyLocaleForVars(
    vars,
    [hook, support, cta].filter((s): s is string => Boolean(s?.trim())),
  );
  const langHint =
    locale === "en"
      ? "Use bold editorial display typography — varied weights, knock-out or gradient-filled type, NOT plain system font on a white rectangle."
      : locale === "zh-hans"
        ? "Use bold editorial display typography (简体中文) — stylized headline, gradient or overlay type, spell every character accurately. NOT plain system font on a white rectangle."
        : "Use bold editorial display typography (繁體中文) — stylized headline, gradient or overlay type, spell every character accurately. NOT plain system font on a white rectangle.";

  const stylized = Boolean(vars.artStyle && vars.artStyle !== "realistic");
  const refMode = slideOpts?.referenceImageMode ?? "none";
  const { prefer, avoid } = conceptSocialPreferAvoid(direction, stylized, refMode, locale);
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    artStylePhotorealConceptLock(vars.artStyle),
    plan
      ? joinParts(
          `SINGLE SOCIAL AD — role: ${plan.role}.`,
          plan.theme ? `Theme: ${plan.theme}.` : "",
          `Art direction (visual DNA): ${plan.visualDna}.`,
          `Layout: ${plan.composition}.`,
          carousel
            ? `Create one full-bleed 9:16 carousel slide for ${name} — edge-to-edge art, not a card on a blank canvas.`
            : `Create a scroll-stopping vertical SOCIAL MEDIA POST for ${name}.`,
        )
      : carousel
        ? `Create one full-bleed 9:16 carousel slide for ${name} — edge-to-edge Instagram/Facebook creative, not a framed card on a blank background.`
        : `Create a scroll-stopping vertical SOCIAL MEDIA POST for ${name} — Instagram/Facebook feed creative.`,
    direction ? `Creative direction: ${direction}.` : "",
    stylized ? artStylePlannerHint(vars.artStyle) : "",
    `Main hook line on image (paint EXACTLY ONCE): "${hook}".`,
    support
      ? `Supporting line (smaller, paint EXACTLY ONCE in the same text stack): ${support}.`
      : "",
    cta && cta !== hook
      ? `Closing action line on image (once only, not repeated): ${cta}.`
      : "",
    "COPY RULE: place all on-image copy in ONE upright text block (left OR right third). Letters must read left-to-right horizontally — never rotate type 90°, never vertical/sideways lettering, never stack one character per line.",
    "Do NOT paint the same headline twice. No top+bottom twin titles, no second masthead, no repeating the hook in a different color/weight.",
    "Do NOT render English meta/UI chips or labels such as Image, Video, Copy, Copywriting, Copywring, CTA, Logo, Brand, Watermark.",
    brandProfile?.businessName ? brandProfilePromptBlock(brandProfile) : "",
    FRAMING_IMAGE[vars.framing],
    artStyleConceptHeroHint(vars.artStyle),
    stylized
      ? "TYPE: headline and copy drawn/rendered IN the same art medium — integrated illustration typography, not a plain text box on white."
      : "TYPE: one headline + optional support + optional CTA in a single scrim/overlay stack — editorial, not a white text box. Prefer a clean single-band layout over magazine dual mastheads.",
    "AVOID: " + avoid + ".",
    "PREFER: " + prefer + ".",
    artStyleImageClause(vars.artStyle),
    langHint,
    `Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
    MARKET_HINTS[vars.market],
    marketChineseScriptBlock(vars.market),
    carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
    artStyleAvoidTail(vars.artStyle),
    "full-bleed edge-to-edge slide matching the requested aspect ratio — no watermark, no platform UI chrome, no outer matte/letterbox, no corner badges or placeholder labels.",
  );
}

const CAROUSEL_ANTI_POSTER_NEGATIVE =
  "white infographic, edu slide, classroom poster, bullet list template, Canva layout, powerpoint slide, plain white background box, outer matte frame, letterbox border, poster card on blank canvas, duplicated headline text, twin masthead titles, top and bottom same headline, rotated text, sideways typography, vertical lettering, 90-degree rotated words, stacked single characters, English UI chips Image/Video/Copy/Copywriting, watermark";

export function buildCarouselImageNegativePrompt(
  framing: SubjectFraming,
  artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
  const framingNeg = FRAMING_NEGATIVE[framing];
  const base = framingNeg
    ? `${CAROUSEL_ANTI_POSTER_NEGATIVE}, ${framingNeg}`
    : CAROUSEL_ANTI_POSTER_NEGATIVE;
  // Realistic: keep anti-cartoon terms. Stylized: applyArtStyleNegative may strip "cartoon".
  return applyArtStyleNegative(base, artStyle);
}

/** Append to Nano Banana prompt (no negative_prompt API param). */
export function carouselSlideAvoidClause(
  framing: SubjectFraming,
  artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
  return joinParts(artStyleAvoidTail(artStyle), `Avoid: ${buildCarouselImageNegativePrompt(framing, artStyle)}.`);
}

/** One slide in a linked concept/campaign carousel — avoids repeating full brief on every slide. */
export function buildConceptSocialCarouselSlidePrompt(
  vars: PromptVariables,
  slide: { role: string; headline: string; subline?: string },
  plan: { theme: string; visualDna: string },
  slideIndex: number,
  totalSlides: number,
  brandProfile?: BrandProfile | null,
  referenceImageMode: ReferenceImageMode = "none",
): string {
  const mainLine = slide.headline?.trim() || vars.headline?.trim() || "";
  const supportLine = slide.subline?.trim() || "";
  const ctaLine =
    slide.role === "offer" || slide.role === "summary"
      ? vars.offer?.trim() || (slide.role === "offer" ? mainLine : "")
      : "";
  const seriesBlock = joinParts(
    artStyleMandatoryLead(vars.artStyle),
    artStylePhotorealConceptLock(vars.artStyle),
    referenceBlockForMode(referenceImageMode, vars),
    `LINKED CAROUSEL (${totalSlides} slides — image ${slideIndex + 1}/${totalSlides}).`,
    plan.theme ? `Series theme: ${plan.theme}.` : "",
    `Slide role: ${slide.role}.`,
    `Shared art direction (same on every slide): ${plan.visualDna}.`,
    referenceImageMode === "style-only"
      ? "Each slide MUST use a distinct composition — same color/typography family, never the same layout template."
      : referenceImageMode === "clone"
        ? "Keep IMAGE 1 subject recognizable — vary layout role and copy only."
        : "Keep consistent color grade, typography energy, and character identity across the series — do not invent a new robot/mascot on later slides.",
    "Each slide must use a DIFFERENT composition — not the same white text box layout copied on every card.",
  );
  return joinParts(
    seriesBlock,
    buildConceptSocialImagePrompt(vars, brandProfile, {
      mainLine,
      supportLine: supportLine && supportLine !== mainLine ? supportLine : "",
      ctaLine: ctaLine && ctaLine !== mainLine ? ctaLine : "",
      referenceImageMode,
      carouselSlide: true,
    }),
  );
}

/** Teaching carousel slide — concept mode uses editorial carousel, not classroom edu cards. */
export function buildTeachingCarouselSlideImagePrompt(
  vars: PromptVariables,
  plan: { theme: string; visualDna: string },
  slide: {
    index: number;
    role: string;
    title: string;
    body: string;
    takeaway: string;
    composition: string;
  },
  totalSlides: number,
  mode: ImagePromptMode,
  brandProfile?: BrandProfile | null,
  referenceImageMode: ReferenceImageMode = "none",
  options?: {
    visualStyleId?: VisualStyleId;
    referenceConcept?: boolean;
    carouselSlideRef?: CarouselSlideReferenceBrief;
    brandKit?: BrandKit | null;
    brandLogoImageIndex?: number | null;
    /** When true, every slide must keep the uploaded product as hero (incl. tip slides). */
    hasProductPhoto?: boolean;
    productName?: string;
  },
): string {
  const brandKit = options?.brandKit;
  const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
  const withLogo = (prompt: string) =>
    brandLogoImageIndex != null
      ? joinParts(prompt, brandKitLogoImagePromptBlock(brandLogoImageIndex))
      : prompt;
  const productLock = options?.hasProductPhoto
    ? carouselProductHeroLock({ productName: options.productName ?? vars.product })
    : "";
  const seriesLock = carouselSeriesConsistencyLock(plan.visualDna);
  const referenceConcept = Boolean(options?.referenceConcept);
  const slideVars: PromptVariables = {
    ...vars,
    headline: slide.title || vars.headline,
    subline: slide.body || vars.subline,
  };
  const shopHint = options?.visualStyleId
    ? getVisualStyle(options.visualStyleId).promptHint
    : "";
  if (mode === "concept-social" && !referenceConcept) {
    return withLogo(
      joinParts(
        buildConceptSocialCarouselSlidePrompt(
          vars,
          { role: slide.role, headline: slide.title, subline: slide.body },
          plan,
          slide.index - 1,
          totalSlides,
          brandProfile,
          referenceImageMode,
        ),
        carouselUniqueCopyHint(slide),
        marketChineseScriptBlock(vars.market),
        typographyHintForLocale(copyLocaleForVars(vars, [slide.title, slide.body, slide.takeaway]), [
          slide.title,
          slide.body,
          slide.takeaway,
        ]),
        brandPromptExtras(brandProfile, brandKit),
        seriesLock,
        productLock,
      ),
    );
  }
  if (referenceConcept) {
    const ref = options?.carouselSlideRef;
    const refBlock = ref
      ? joinParts(
          `Reference slide ${ref.index} layout (match this slide's staging): ${ref.composition || ref.layoutStyle}.`,
          ref.stagingPose ? `Staging: ${ref.stagingPose}.` : "",
          ref.mood ? `Mood/light: ${ref.mood}.` : "",
          ref.typographyStyle ? `Typography: ${ref.typographyStyle}.` : "",
        )
      : "";
    const seriesBlock = joinParts(
      artStyleMandatoryLead(slideVars.artStyle),
      `TEACHING CAROUSEL (${totalSlides} slides — slide ${slide.index}/${totalSlides}).`,
      `Theme: ${plan.theme}.`,
      `Shared visual DNA: ${plan.visualDna}.`,
      `Slide role: ${slide.role}.`,
      slide.composition ? `Layout note: ${slide.composition}.` : "",
      refBlock,
      seriesLock,
      "LAYOUT TRANSFER: IMAGE 1 = user product hero; IMAGE 2 = style reference. Replicate IMAGE 2 ad design grammar on this slide — same grid/list/panel structure, component types, and typography hierarchy; swap in IMAGE 1 product and user brief copy only.",
      productLock,
    );
    return withLogo(
      joinParts(
        seriesBlock,
        buildReferenceConceptImagePrompt(slideVars, { shopStyleHint: shopHint, brandProfile }),
        carouselSlideAvoidClause(slideVars.framing, slideVars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  const stylized = vars.artStyle && vars.artStyle !== "realistic";
  const slideLines = [
    slide.title,
    slide.body !== slide.title ? slide.body : "",
    slide.takeaway !== slide.title && slide.takeaway !== slide.body ? slide.takeaway : "",
  ].filter(Boolean) as string[];
  const locale = copyLocaleForVars(vars, slideLines);
  return withLogo(
    joinParts(
      artStyleMandatoryLead(vars.artStyle),
      referenceBlockForMode(referenceImageMode, vars, slide.composition),
      stylized
        ? `Create one ILLUSTRATED teaching carousel page (${slide.index}/${totalSlides}) — entire slide in the chosen art medium.`
        : `Create one page of a social carousel (${slide.index}/${totalSlides}).`,
      `Theme: ${plan.theme}.`,
      `Shared visual DNA: ${plan.visualDna}.`,
      `Slide role: ${slide.role}.`,
      `Headline on image (paint EXACTLY ONCE): ${slide.title}.`,
      slide.body && slide.body !== slide.title
        ? `Supporting line (paint EXACTLY ONCE): ${slide.body}.`
        : "",
      slide.takeaway &&
        slide.takeaway !== slide.title &&
        slide.takeaway !== slide.body
        ? `Closing line (once only): ${slide.takeaway}.`
        : "",
      "COPY RULE: one upright horizontal text block only — never duplicate headline/body; never rotate type 90° or stack letters vertically.",
      "No English meta/UI chips (Image, Video, Copy, Copywriting). No outer matte/letterbox frame.",
      slide.composition ? `Layout: ${slide.composition}.` : "",
      seriesLock,
      productLock,
      artStyleImageClause(vars.artStyle),
      FRAMING_IMAGE[vars.framing],
      MARKET_HINTS[vars.market],
      marketChineseScriptBlock(vars.market),
      stylized
        ? "Illustrated social carousel — typography and icons drawn in the same art medium, NOT photorealistic photography."
        : referenceImageMode === "style-only" && isPhotographicReferenceBrief(vars.extra)
          ? `Photorealistic lifestyle product carousel — soft natural light, real product textures, ${integratedTypographyPhrase(locale)} — NO cartoon icons or flat line-art badges.`
          : "Editorial social carousel — integrated typography, not a plain white edu poster.",
      typographyHintForLocale(locale, slideLines),
      carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      referenceImageMode === "style-only" ? vars.extra : undefined,
      brandPromptExtras(brandProfile, brandKit),
      "full-bleed edge-to-edge — not a framed card on a blank canvas.",
    ),
  );
}

/** Cinematic concept keyframe — scene only, no poster typography (for Seedance). */
export function buildConceptCinematicImagePrompt(vars: PromptVariables): string {
  const scene = softenStoryboardStillPromptForModeration(
    vars.extra?.trim() ||
      joinParts(vars.headline, vars.subline) ||
      vars.product?.trim() ||
      "cinematic social reel hook scene",
  );
  return joinParts(
    artStyleImageClause(vars.artStyle),
    "Cinematic FILM STILL for a vertical social reel — like a movie frame, NOT a marketing poster.",
    `Scene to render: ${scene}.`,
    "Rich atmosphere, dramatic or motivated lighting, real or stylized environment matching the concept.",
    "NO white infographic background, NO headline text block at top, NO bullet list layout, NO Canva-style ad template, NO flyer composition.",
    "NO on-screen text, NO logos, NO watermarks, NO typography overlays — copy is added later in video post-production.",
    "Original characters only, no celebrity likenesses.",
    "Prefer mid-shots of rooms, hands, products, towels, and silhouettes — never photoreal face fill-frame, never client lying on a bed with facial mask / serum-on-skin (fal content filters).",
    MARKET_HINTS[vars.market],
    FRAMING_IMAGE[vars.framing],
    "Single 9:16 vertical cinematic still.",
  );
}

/** UGC talking-head keyframe — presenter + product for HeyGen Avatar IV lip-sync. */
export function buildUgcPresenterImagePrompt(vars: PromptVariables): string {
  const product = vars.product?.trim() || "the product";
  const theme = joinParts(vars.headline, vars.subline, vars.offer);
  return joinParts(
    imageReferenceAnchorBlock(vars),
    `Create a photorealistic vertical UGC talking-head product ad for ${product}, 9:16.`,
    `Friendly young presenter in a bright cozy home office — waist-up framing, face clearly visible, looking at camera.`,
    buildModelWearPresentationHint(product, vars.framing),
    `Keep the exact product from IMAGE 1 on wrist or in hand — same beads, colors, materials.`,
    theme ? `Ad theme to reflect in mood (no on-screen text): ${theme}.` : "",
    "Natural skin, realistic hands, soft window light, desk and plant in background, shallow depth of field.",
    "Presenter ready to speak to camera — mid-gesture showing the product.",
    MARKET_HINTS[vars.market],
    vars.extra,
    "No watermark, no subtitles, no social UI chrome.",
  );
}

/** Lifestyle model wearing / using the product — photorealistic ad still from product photo. */
export function buildModelWearImagePrompt(vars: PromptVariables): string {
  const product = vars.product?.trim() || "the product";
  const theme = joinParts(vars.headline, vars.subline, vars.offer);
  const stylized = vars.artStyle && vars.artStyle !== "realistic";
  // Model-wear path must not collapse to product-only when framing was left on catalog defaults.
  const framing =
    vars.framing === "product-only" || vars.framing === "no-people" ? "auto" : vars.framing;
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    imageReferenceAnchorBlock(vars),
    "MANDATORY: this is a MODEL WEAR/USE ad — a real person must appear using or holding the product. Not a product-only catalog shot.",
    stylized
      ? `Create a vertical LIFESTYLE ADVERTISEMENT illustration for ${product}.`
      : `Create a photorealistic vertical LIFESTYLE ADVERTISEMENT for ${product}.`,
    buildModelWearPresentationHint(product, framing),
    `Keep the exact product from IMAGE 1 — same item, colors, materials, charm details. Do NOT replace with a different product.`,
    vars.business ? `Brand mood: ${vars.business}.` : "",
    theme ? `Ad copy theme (integrate as subtle vertical sidebar typography if appropriate): ${theme}.` : promoTypographyHint(vars),
    artStyleImageClause(vars.artStyle),
    vars.artStyle === "realistic" || !vars.artStyle
      ? "Natural skin and materials where people appear — NOT plastic AI skin."
      : "Stylized character design consistent with the chosen art direction.",
    `Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
    MARKET_HINTS[vars.market],
    marketChineseScriptBlock(vars.market),
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "9:16 vertical, no watermark, no social UI chrome.",
  );
}

/** Brand-fit: ad styled to match analyzed website/social brand DNA. */
export function buildBrandFitImagePrompt(
  vars: PromptVariables,
  profile: BrandProfile,
): string {
  const product = vars.product?.trim() || profile.productCategory || "the product";
  const theme = joinParts(vars.headline, vars.subline, vars.offer);
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    imageReferenceAnchorBlock(vars),
    `Create a vertical social ad for ${product} — IMAGE 1 stays the hero; brand DNA below styles colors, typography, and mood only.`,
    brandProfilePromptBlock(profile),
    vars.business ? `Shop name on ad: ${vars.business}.` : "",
    theme ? `Campaign copy for this ad: ${theme}.` : "",
    `Match brand palette and typography energy from the DNA — but do NOT substitute IMAGE 1 with generic category stock shots (e.g. crystals, marble, flat lays) unless IMAGE 1 already shows them.`,
    artStyleImageClause(vars.artStyle),
    promoTypographyHint(vars),
    `Do NOT look like a one-size-fits-all AI poster. Do NOT ignore IMAGE 1.`,
    MARKET_HINTS[vars.market],
    FRAMING_IMAGE[vars.framing],
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "Single 9:16 marketing still.",
  );
}

export function buildServicePromoImagePrompt(vars: PromptVariables): string {
  const name = vars.business?.trim() || vars.product?.trim() || "the service";
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    `Create a premium vertical social ad promoting a SERVICE for ${name}.`,
    vars.headline ? `Main headline: ${vars.headline}.` : "",
    vars.subline ? `Supporting points: ${vars.subline}.` : "",
    vars.offer ? `Offer / CTA: ${vars.offer}.` : "",
    "Professional trustworthy design — consulting, coaching, course, membership, wellness, B2C service.",
    "Typography-led layout with intentional hierarchy — NOT a physical product packshot or warehouse scene.",
    artStyleImageClause(vars.artStyle),
    promoTypographyHint(vars),
    `Do NOT invent prices, HK$, or discount % unless offer is in the brief.`,
    MARKET_HINTS[vars.market],
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "Vertical social feed ad, sharp focus, no watermark, no social UI chrome.",
  );
}

export function buildPricingOfferImagePrompt(vars: PromptVariables): string {
  const name = vars.business?.trim() || vars.product?.trim() || "the brand";
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    `Create a vertical pricing / limited-offer promo graphic for ${name}.`,
    vars.headline ? `Offer theme: ${vars.headline}.` : "",
    vars.subline ? `Benefit bullets: ${vars.subline}.` : "",
    vars.offer ? `CTA / offer line: ${vars.offer}.` : "",
    "Clean pricing-card or promo-banner layout with clear CTA button area — IG/FB feed friendly.",
    "Premium but approachable SMB aesthetic. Generous whitespace, readable type.",
    artStyleImageClause(vars.artStyle),
    `Do NOT invent specific prices, HK$, or discount % unless the user offer field includes them.`,
    MARKET_HINTS[vars.market],
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "Vertical marketing still, no watermark, no platform UI overlay.",
  );
}

export function buildWebsiteLaunchImagePrompt(vars: PromptVariables): string {
  const name = vars.business?.trim() || vars.product?.trim() || "the brand";
  const stylized = vars.artStyle && vars.artStyle !== "realistic";
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    `Create a vertical website or app LAUNCH promo for ${name}.`,
    vars.headline ? `Launch hook: ${vars.headline}.` : "",
    vars.subline ? `Supporting copy: ${vars.subline}.` : "",
    stylized
      ? "Device or app UI shown as illustrated/stylized mockup — NOT photorealistic product photography."
      : "Modern device frame or browser mockup mood — polished tech/SMB marketing, soft gradient background.",
    "Focus on driving visits or sign-ups — not a product unboxing photo. No corner badges, seals, or placeholder labels.",
    artStyleImageClause(vars.artStyle),
    promoTypographyHint(vars),
    MARKET_HINTS[vars.market],
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "Vertical launch ad, no Instagram/FB UI chrome, no watermark.",
  );
}

export function buildWizardImagePrompt(
  vars: PromptVariables,
  mode: ImagePromptMode,
  brandProfile?: BrandProfile | null,
  visualStyleId?: VisualStyleId,
  brandKit?: BrandKit | null,
  promptOptions?: {
    structuredReferenceBrief?: boolean;
    aspectRatio?: string;
    brandLogoImageIndex?: number | null;
    singleImagePlan?: SingleImagePlan | null;
    /** When false, skip IMAGE 1 mandatory blocks (concept / text-only). Default true for product promo. */
    hasReferenceImage?: boolean;
  },
): string {
  const brandLogoImageIndex = promptOptions?.brandLogoImageIndex ?? null;
  const plan = promptOptions?.singleImagePlan ?? null;
  const hasReferenceImage = promptOptions?.hasReferenceImage !== false;
  const withLogo = (prompt: string) =>
    brandLogoImageIndex != null
      ? joinParts(prompt, brandKitLogoImagePromptBlock(brandLogoImageIndex))
      : prompt;

  if (mode === "reference-concept") {
    const shopHint = visualStyleId ? getVisualStyle(visualStyleId).promptHint : "";
    return withLogo(
      joinParts(
        buildReferenceConceptImagePrompt(vars, {
          shopStyleHint: shopHint,
          brandProfile,
          structuredReferenceBrief: promptOptions?.structuredReferenceBrief,
          aspectRatio: promptOptions?.aspectRatio,
        }),
        plan ? singlePlanBlock(plan) : "",
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  if (mode === "info-poster") {
    return withLogo(joinParts(buildInfoPosterImagePrompt(vars), plan ? singlePlanBlock(plan) : "", carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE)));
  }
  if (mode === "model-wear") {
    return withLogo(
      joinParts(
        buildModelWearImagePrompt(vars),
        // Keep model-wear free of poster/catalog anti-rules that can push product-only stills.
        artStyleAvoidTail(vars.artStyle ?? DEFAULT_ART_STYLE),
        "Avoid: product-only catalog cutout, empty table still life with no person, plain bottle hero with no hands/face.",
      ),
    );
  }
  if (mode === "ugc-presenter") return withLogo(buildUgcPresenterImagePrompt(vars));
  if (mode === "service-promo") {
    return withLogo(
      joinParts(
        buildServicePromoImagePrompt(vars),
        plan ? singlePlanBlock(plan) : "",
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  if (mode === "pricing-offer") {
    return withLogo(
      joinParts(
        buildPricingOfferImagePrompt(vars),
        plan ? singlePlanBlock(plan) : "",
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  if (mode === "website-launch") {
    return withLogo(
      joinParts(
        buildWebsiteLaunchImagePrompt(vars),
        plan ? singlePlanBlock(plan) : "",
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  if (mode === "concept-cinematic") {
    return withLogo(
      joinParts(
        buildConceptCinematicImagePrompt(vars),
        plan ? singlePlanBlock(plan) : "",
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  if (mode === "concept-social") {
    return withLogo(
      joinParts(
        buildConceptSocialImagePrompt(vars, brandProfile, { singleImagePlan: plan }),
        brandPromptExtras(null, brandKit),
      ),
    );
  }
  if (mode === "brand-fit" && brandProfile?.businessName) {
    return withLogo(
      joinParts(
        buildBrandFitImagePrompt(vars, brandProfile),
        plan ? singlePlanBlock(plan) : "",
        brandPromptExtras(null, brandKit),
        carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
      ),
    );
  }
  const styleHint =
    visualStyleId && getVisualStyle(visualStyleId).promptHint ?
      `Visual style direction: ${getVisualStyle(visualStyleId).promptHint}`
    : "";
  return withLogo(
    joinParts(
      buildPromoImagePrompt(vars, brandProfile, brandKit, plan, { hasReferenceImage }),
      styleHint,
    ),
  );
}

function singlePlanBlock(plan: SingleImagePlan): string {
  return joinParts(
    `SINGLE SOCIAL AD — role: ${plan.role}.`,
    plan.theme ? `Theme: ${plan.theme}.` : "",
    `Art direction (visual DNA): ${plan.visualDna}.`,
    `Layout: ${plan.composition}.`,
    plan.title ? `Main hook on image: "${plan.title}".` : "",
    plan.body ? `Supporting line: ${plan.body}.` : "",
    plan.takeaway ? `Closing line: ${plan.takeaway}.` : "",
    "Do NOT paint the English word LOGO, or any fake brand-mark circle/placeholder seal. Skip logo marks unless a real brand logo image is provided. Do NOT invent 立即選購 / Shop Now unless that exact CTA is in the campaign copy above.",
  );
}

function shouldUseConceptSocialPrompt(
  visualStyleId: string,
  context?: ImagePromptContext,
): boolean {
  if (context?.promotionMode !== "concept") return false;
  if (visualStyleId === "concept-cinematic") return false;
  // Social creative layout is for image-only posts — video keyframes use cinematic or style-specific prompts.
  if (context?.workflowMode !== "image-only") return false;
  return true;
}

/** Concept video/storyboard must never fall through to product promo (IMAGE 1 mandatory). */
function shouldUseConceptCinematicPrompt(
  visualStyleId: string,
  context?: ImagePromptContext,
): boolean {
  if (context?.promotionMode !== "concept") return false;
  if (visualStyleId === "concept-cinematic") return true;
  if (visualStyleId === "storyboard-video") return true;
  // Combined / video-only concept workflows: cinematic stills, not product-edit promos.
  if (context?.workflowMode === "combined" || context?.workflowMode === "video-only") {
    return true;
  }
  return false;
}

export function resolveImagePromptMode(
  visualStyleId: string,
  creativeMode: string,
  context?: ImagePromptContext,
): ImagePromptMode {
  if (creativeMode === "reference-concept") return "reference-concept";
  if (shouldUseConceptCinematicPrompt(visualStyleId, context)) return "concept-cinematic";
  if (visualStyleId === "concept-cinematic") return "concept-cinematic";
  if (shouldUseConceptSocialPrompt(visualStyleId, context)) return "concept-social";
  if (visualStyleId === "info-poster") return "info-poster";
  if (visualStyleId === "model-wear") return "model-wear";
  if (visualStyleId === "ugc-presenter") return "ugc-presenter";
  if (visualStyleId === "service-promo") return "service-promo";
  if (visualStyleId === "pricing-offer") return "pricing-offer";
  if (visualStyleId === "website-launch") return "website-launch";
  if (visualStyleId === "brand-fit" || visualStyleId === "brand-campaign") return "brand-fit";
  return "promo-ai";
}

/** One slide in a linked campaign — shared DNA, per-slide headline/composition. */
export function buildCampaignSlideImagePrompt(
  vars: PromptVariables,
  slide: CampaignSlidePlan,
  plan: { theme: string; visualDna: string },
  mode: ImagePromptMode,
  brandProfile: BrandProfile | null | undefined,
  slideIndex: number,
  totalSlides: number,
  hasReferenceImage = true,
  options?: {
    visualStyleId?: VisualStyleId;
    referenceConcept?: boolean;
    referenceImageMode?: ReferenceImageMode;
    carouselSlideRef?: CarouselSlideReferenceBrief;
    brandKit?: BrandKit | null;
    brandLogoImageIndex?: number | null;
    hasProductPhoto?: boolean;
    productName?: string;
  },
): string {
  const brandKit = options?.brandKit;
  const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
  const referenceImageMode =
    options?.referenceImageMode ?? (hasReferenceImage ? "clone" : "none");
  const referenceConcept = Boolean(
    options?.referenceConcept && referenceImageMode === "clone",
  );
  const productLock = options?.hasProductPhoto
    ? carouselProductHeroLock({ productName: options.productName ?? vars.product })
    : "";
  const seriesLock = carouselSeriesConsistencyLock(plan.visualDna);
  const slideVars: PromptVariables = {
    ...vars,
    headline: slide.headline || vars.headline,
    subline: slide.subline || vars.subline,
  };
  const shopHint = options?.visualStyleId
    ? getVisualStyle(options.visualStyleId).promptHint
    : "";
  const campaignBlock = joinParts(
    artStyleMandatoryLead(slideVars.artStyle),
    !referenceConcept
      ? referenceBlockForMode(referenceImageMode, slideVars, slide.composition)
      : "",
    `LINKED CAMPAIGN (${totalSlides} posts — image ${slideIndex + 1}/${totalSlides}).`,
    plan.theme ? `Campaign theme: ${plan.theme}.` : "",
    `This slide: ${slide.title} [${slide.role}].`,
    slide.composition
      ? `Layout note (secondary to IMAGE 1): ${slide.composition}.`
      : "",
    `Shared series styling (colors, typography, mood — same on every slide): ${plan.visualDna}.`,
    seriesLock,
    referenceConcept
      ? "Keep IMAGE 2 ad design language on every slide — vary headline, layout role, and slide copy only; IMAGE 1 product must appear on every slide."
      : referenceImageMode === "style-only"
        ? "Match IMAGE 1 palette, typography mood, and infographic/edu aesthetic on every slide — distinct layout role and copy per slide; never copy reference on-image text."
        : referenceImageMode === "clone"
          ? "Each slide varies headline/message and layout role only — IMAGE 1 subject must stay recognizable on every slide."
          : "Each slide varies headline/message and layout role only — keep one consistent campaign art direction across all slides.",
    slide.role === "offer" && !vars.offer?.trim()
      ? "Offer slide: CTA / shop-now mood only — do NOT invent prices, HK$, discount %, or fake promotions."
      : "",
    productLock,
  );
  const base =
    referenceConcept
      ? buildReferenceConceptImagePrompt(slideVars, { shopStyleHint: shopHint, brandProfile })
      : mode === "concept-social"
      ? buildConceptSocialCarouselSlidePrompt(
          slideVars,
          { role: slide.role, headline: slide.headline, subline: slide.subline },
          plan,
          slideIndex,
          totalSlides,
          brandProfile,
          referenceImageMode,
        )
      : mode === "brand-fit" && brandProfile?.businessName
      ? buildBrandFitImagePrompt(slideVars, brandProfile)
      : mode === "info-poster"
        ? buildInfoPosterImagePrompt(slideVars)
        : mode === "service-promo"
          ? buildServicePromoImagePrompt(slideVars)
          : mode === "pricing-offer"
            ? buildPricingOfferImagePrompt(slideVars)
            : mode === "website-launch"
              ? buildWebsiteLaunchImagePrompt(slideVars)
              : buildPromoImagePrompt(slideVars, brandProfile, brandKit);
  const withBrand =
    brandKitHasPromptContent(brandKit) && mode === "concept-social" && !referenceConcept
      ? joinParts(base, brandKitPromptBlock(brandKit!))
      : base;
  const withLogo =
    brandLogoImageIndex != null
      ? joinParts(withBrand, brandKitLogoImagePromptBlock(brandLogoImageIndex))
      : withBrand;
  return mode === "concept-social" && !referenceConcept
    ? joinParts(withLogo, seriesLock, productLock)
    : joinParts(campaignBlock, withLogo, carouselSlideAvoidClause(slideVars.framing, slideVars.artStyle ?? DEFAULT_ART_STYLE));
}

/** Nano Banana: new promotional image from product photo + brief (not a template paste). */
export function buildPromoImagePrompt(
  vars: PromptVariables,
  brandProfile?: BrandProfile | null,
  brandKit?: BrandKit | null,
  plan?: SingleImagePlan | null,
  options?: { hasReferenceImage?: boolean },
): string {
  const product = vars.product?.trim() || "the product";
  const theme = plan
    ? joinParts(plan.title, plan.body, plan.takeaway)
    : joinParts(vars.headline, vars.subline, vars.offer);
  const stylized = vars.artStyle && vars.artStyle !== "realistic";
  const hasReferenceImage = options?.hasReferenceImage !== false;
  const refBlock = hasReferenceImage ? imageReferenceAnchorBlock(vars) : "";
  const eraseRefText = hasReferenceImage
    ? "Remove outdated marketing text from IMAGE 1 where new copy replaces it."
    : "Text-to-image: invent a fitting hero subject and set from the campaign brief — no uploaded IMAGE 1.";
  if (vars.imageTextMode === "textless") {
    return joinParts(
      artStyleMandatoryLead(vars.artStyle),
      refBlock,
      stylized
        ? `Create a brand-new vertical social media ILLUSTRATION scene for ${product} — art medium only, no readable text.`
        : `Create a brand-new vertical social media product scene for ${product}.`,
      brandPromptExtras(brandProfile, brandKit),
      vars.business ? `Brand / shop: ${vars.business}.` : "",
      theme ? `Campaign mood only (do NOT render as text): ${theme}.` : "",
      stylized ? artStylePlannerHint(vars.artStyle) : promoArtDirectionHint(vars),
      artStyleImageClause(vars.artStyle),
      TEXTLESS_IMAGE_GUARD,
      FRAMING_IMAGE[vars.framing],
      MARKET_HINTS[vars.market],
      artStyleAvoidTail(vars.artStyle),
      vars.extra,
      "Vertical ad background plate, no Instagram/FB UI chrome.",
    );
  }
  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    refBlock,
    plan ? singlePlanBlock(plan) : "",
    stylized
      ? `Create a brand-new vertical social media ILLUSTRATION/ad for ${product} — entire composition in the chosen art medium.`
      : `Create a brand-new vertical social media advertisement for ${product}.`,
    brandPromptExtras(brandProfile, brandKit),
    vars.business ? `Brand / shop: ${vars.business}.` : "",
    !plan && theme ? `Campaign message: ${theme}.` : "",
    eraseRefText,
    stylized
      ? artStylePlannerHint(vars.artStyle)
      : plan
        ? ""
        : promoArtDirectionHint(vars),
    stylized
      ? `Design a complete illustrated social ad: stylized hero scene, props, color palette, AND marketing typography rendered in the same art medium.`
      : `Design a complete social ad: product hero, intentional scene, lighting, props, color grade, AND integrated marketing typography.`,
    artStyleImageClause(vars.artStyle),
    promoTypographyHint(
      plan
        ? {
            ...vars,
            headline: plan.title || vars.headline,
            subline: plan.body || vars.subline,
            offer: plan.takeaway || vars.offer,
          }
        : vars,
    ),
    stylized
      ? `The result must be a finished illustrated ad with readable copy — NOT photorealistic photography.`
      : `The result must be a finished social ad with readable copy — magazine/lifestyle energy with props and depth, NOT a plain product-only beauty shot on seamless white.`,
    `ANTI-CATALOG: forbid empty white/cream sweep, centered bottle with only soft shadow, sparse two-line type on blank void. Prefer intentional set design (surfaces, props, rim light, shallow DOF) plus layered typography.`,
    `Do NOT paste the product onto a generic template frame. No watermarks, @handles, corner badges, seals, or placeholder labels. Never render English meta words such as CTA, logo, brand, or watermark.`,
    MARKET_HINTS[vars.market],
    marketChineseScriptBlock(vars.market),
    FRAMING_IMAGE[vars.framing],
    carouselSlideAvoidClause(vars.framing, vars.artStyle ?? DEFAULT_ART_STYLE),
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    "Single 9:16 marketing still.",
  );
}

/** Nano Banana: reference ad → new image keeping design language, adapting venue/lighting to product/shop. */
export function buildReferenceConceptImagePrompt(
  vars: PromptVariables,
  options?: {
    shopStyleHint?: string;
    brandProfile?: BrandProfile | null;
    /** When analyze-reference brief is in vars.extra — skip LAYER A/B/C essay. */
    structuredReferenceBrief?: boolean;
    aspectRatio?: string;
  },
): string {
  const product = vars.product?.trim() || "the product";
  const aspect = options?.aspectRatio?.trim() || "9:16";
  const campaignCopy = joinParts(
    vars.business ? `Brand: ${vars.business}` : undefined,
    vars.headline ? `Headline: ${vars.headline}` : undefined,
    vars.subline ? `Subline: ${vars.subline}` : undefined,
    vars.offer ? `Offer: ${vars.offer}` : undefined,
  );
  const copyHint = promoTypographyHint(vars, true);
  const framingHint =
    vars.framing === "auto"
      ? "Staging: adapt IMAGE 2's pose type (hand / wrist / flat lay / pedestal) but the held/shown item must be IMAGE 1's exact product — never IMAGE 2's item. Face out of frame when hands appear."
      : FRAMING_IMAGE[vars.framing];
  const shopBlock = joinParts(
    options?.brandProfile?.businessName
      ? brandProfilePromptBlock(options.brandProfile)
      : "",
    options?.shopStyleHint
      ? `Shop visual style hint (for background and lighting only): ${options.shopStyleHint}.`
      : "",
    vars.business ? `Shop: ${vars.business}.` : "",
  );
  const structuredBrief =
    options?.structuredReferenceBrief ??
    (isLayoutTransferReferenceExtra(vars.extra) || isStyleOnlyReferenceExtra(vars.extra));

  if (structuredBrief) {
    return joinParts(
      artStyleMandatoryLead(vars.artStyle),
      `Two images. Create ONE new ${aspect} marketing still for ${product}.`,
      `IMAGE 1 = user's product hero (mascot/SKU to keep exactly). IMAGE 2 = layout/style reference only — never show IMAGE 2's product as the hero.`,
      `Transform IMAGE 1 into an ad that borrows IMAGE 2's layout rhythm, graphic component types, typography hierarchy, and staging pose type. Adapt background and lighting to suit IMAGE 1. Do not copy IMAGE 2 logos, wordmarks, or selling lines.`,
      `CRITICAL: The hero subject must be recognizable as IMAGE 1 (same character/product). If IMAGE 1 is a 3D mascot/character, keep that mascot — do not replace it with jewelry, bottles, or other items from IMAGE 2.`,
      `Never paint the English word LOGO, BRAND, or CTA. Never invent a circular brand-mark / seal / placeholder logo. If IMAGE 2 has a logo zone, leave that area empty or fill only with campaign copy lines above — do not invent 立即選購 / Shop Now unless that exact phrase is in the campaign copy.`,
      shopBlock,
      campaignCopy ? `Campaign copy (all on-image text): ${campaignCopy}.` : "",
      artStyleImageClause(vars.artStyle),
      copyHint,
      marketChineseScriptBlock(vars.market),
      MARKET_HINTS[vars.market],
      framingHint,
      artStyleAvoidTail(vars.artStyle),
      vars.extra,
      `${aspect} social ad still, sharp focus, no watermark.`,
    );
  }

  return joinParts(
    artStyleMandatoryLead(vars.artStyle),
    `Two images. Create ONE new ${aspect} marketing still for ${product}.`,
    `HOW TO USE THE TWO IMAGES:`,
    `IMAGE 1 = the user's real product/mascot photo — this is the ONLY allowed hero subject. Preserve exact identity (shape, materials, character design).`,
    `IMAGE 2 = reference ad for layout/style ONLY — borrow design grammar; REPLACE IMAGE 2's product with IMAGE 1.`,
    `LAYER A — KEEP from IMAGE 2 (design language): layout structure, composition rhythm, graphic component types (badges, frames, accent shapes), typography hierarchy style, and staging pose type (hand / wrist / flat lay / circle hero).`,
    `LAYER B — ADAPT (venue and light): background, venue, surface, and lighting should suit IMAGE 1's product colors and the shop/campaign mood.`,
    `LAYER C — REPLACE (content): hero must be IMAGE 1's exact item. All readable copy from the campaign brief below — never reuse IMAGE 2 product names, selling lines, or on-image text. Do not copy IMAGE 2 logos, wordmarks, store names, @handles, or watermarks.`,
    `If the campaign product name disagrees with IMAGE 1 pixels, trust IMAGE 1 for product category, shape, and materials.`,
    shopBlock,
    campaignCopy ? `Campaign copy (all on-image text): ${campaignCopy}.` : "",
    artStyleImageClause(vars.artStyle),
    copyHint,
    marketChineseScriptBlock(vars.market),
    MARKET_HINTS[vars.market],
    framingHint,
    artStyleAvoidTail(vars.artStyle),
    vars.extra,
    `${aspect} vertical social ad still, sharp focus, no watermark.`,
  );
}

/**
 * When user uploads product (image 1) + style reference ad (image 2).
 * Must NOT mention studio/clean background — that overrides the reference.
 */
/** @deprecated Prefer buildReferenceConceptImagePrompt — kept for API compatibility. */
export function buildProductWithStyleRefPrompt(vars: PromptVariables): string {
  return buildReferenceConceptImagePrompt(vars);
}

function buildVideoMotionBlock(opts: VideoPromptOpts): string {
  const creativity = opts.creativity ?? "lively";
  const motion = creativityMotionHint(creativity, Boolean(opts.dualFrame));
  const frameNote = opts.dualFrame
    ? "Start frame = opening composition, end frame = closing composition — prefer a subtle transition; avoid melting one scene into another."
    : "Animate the hero product with commercial motion.";
  const realismNote =
    creativity === "subtle"
      ? "Photorealistic commercial look: locked or near-static camera, very subtle motion only, natural lighting, no plastic skin, no finger morphing, no surreal sparkle trails."
      : "";
  const multiNote = opts.multiAngle
    ? "Use all reference images as the same product from different angles; cut-like energy between angles while keeping identity consistent."
    : "";
  return joinParts(
    frameNote,
    motion,
    realismNote,
    multiNote,
    "Keep the same product identity — do not morph into a different item.",
  );
}

/** Template-specific Seedance prompt — style from videoPromptTemplate + motion layer. */
export function buildVideoPrompt(
  template: MarketingTemplate,
  vars: PromptVariables,
  opts?: VideoPromptOpts,
): string {
  const styleBase = applyTemplate(template.videoPromptTemplate, vars);
  const motionBlock = opts ? buildVideoMotionBlock(opts) : "";
  return (
    joinParts(
      styleBase,
      vars.headline ? `Campaign theme: ${vars.headline}.` : "",
      motionBlock,
      MARKET_HINTS[vars.market],
      FRAMING_VIDEO[vars.framing],
      vars.extra,
      opts ? "No on-screen text, subtitles, logos, or watermarks" : "",
    ) + VIDEO_BGM_HINT
  );
}

/** Wizard video step — picks template from visual style / templateId. */
export function buildWizardVideoPrompt(
  templateId: TemplateId,
  vars: PromptVariables,
  opts: VideoPromptOpts = {},
): string {
  return joinParts(
    buildVideoPrompt(getTemplate(templateId), vars, opts),
    artStyleSeedanceHint(vars.artStyle),
  );
}

/** Seedance image-to-video: product promo from generated keyframe. */
export function buildProductPromoVideoPrompt(
  vars: PromptVariables,
  opts: VideoPromptOpts = {},
  templateId: TemplateId = "product-reel",
): string {
  return buildWizardVideoPrompt(templateId, vars, opts);
}

/** Seedance image-to-video after Nano Banana step in combined workflow. */
export function buildImageToVideoPrompt(
  vars: PromptVariables,
  opts: VideoPromptOpts = {},
  templateId: TemplateId = "product-reel",
): string {
  return buildWizardVideoPrompt(templateId, vars, opts);
}

/** Storyboard scene: IMAGE 1 style shell + user topic content (reference topic may differ). */
function imageStoryboardStyleRefBlock(
  plan: VideoStoryboardPlan,
  dualProductAndStyle?: boolean,
  textless?: boolean,
): string {
  const contentReplace = textless
    ? REFERENCE_CONTENT_REPLACE_TEXTLESS_LINE
    : REFERENCE_CONTENT_REPLACE_LINE;
  const eraseText = textless ? REFERENCE_ERASE_TEXT_LINE : "";
  if (dualProductAndStyle) {
    return joinParts(
      "DUAL REFERENCE — IMAGE 1 = the user's EXACT product photo; IMAGE 2 = style/layout mood from research",
      "Keep IMAGE 2's composition grammar, color mood, and social-ad energy.",
      "Hero subject must be IMAGE 1's exact item — do NOT copy IMAGE 2's product, jewelry, or props.",
      contentReplace,
      REFERENCE_TOPIC_GUARD_LINE,
      eraseText,
      "Adapt beat layout rhythm for this scene — same design family as IMAGE 2, hero product from IMAGE 1 only.",
      plan.visualDirection ? `Locked series aesthetic: ${plan.visualDirection}.` : "",
      thirdPartyBrandGuardBlock(),
    );
  }
  return joinParts(
    "REFERENCE STYLE TRANSFER — IMAGE 1 is the reference ad/reel frame",
    REFERENCE_STYLE_MATCH_LINE,
    contentReplace,
    REFERENCE_TOPIC_GUARD_LINE,
    eraseText,
    "Adapt the reference beat layout rhythm for this scene — same composition grammar family as IMAGE 1, not a generic stock layout.",
    "If IMAGE 1 is illustrated/3D/meme/cartoon, do NOT default to generic photorealistic lifestyle photography.",
    plan.visualDirection ? `Locked series aesthetic: ${plan.visualDirection}.` : "",
    thirdPartyBrandGuardBlock(),
  );
}

/** Drop planner lines that ask Nano Banana to paint text when stills must stay video-safe. */
function sanitizeStoryboardImagePromptForTextless(imagePrompt: string | undefined): string {
  const raw = imagePrompt?.trim() ?? "";
  if (!raw) return "";
  return raw
    .replace(
      /\b(with|add|include|overlay|render|bake|paint|show)\b[^.]{0,40}\b(text|typography|caption|headline|copy|logo|字|文案|標題|標語)[^.]*\.?/gi,
      "",
    )
    .replace(/\bon[- ]?image copy\b[^.]*\.?/gi, "")
    .replace(/\b(CTA|call to action|slogan|tagline|watermark)\b[^.]*\.?/gi, "")
    .replace(/[\u4e00-\u9fff]{2,}[^.|，。；]*[.。]?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Nano Banana still for one storyboard scene (product from IMAGE 1, or IMAGE 2 when dual). */
export function buildStoryboardSceneImagePrompt(
  scene: StoryboardScenePlan,
  plan: VideoStoryboardPlan,
  vars: PromptVariables,
  options?: {
    referenceConcept?: boolean;
    conceptTextOnly?: boolean;
    storyboardStyleRef?: boolean;
    dualProductAndStyle?: boolean;
    /** Stills stay textless; onImageCopyZh is burned as captions after video. */
    textless?: boolean;
    visualStyleId?: VisualStyleId;
    brandProfile?: BrandProfile | null;
    brandKit?: BrandKit | null;
    brandLogoImageIndex?: number | null;
    /** Product/physical path with an uploaded product photo. */
    hasProductImage?: boolean;
  },
): string {
  const brandKit = options?.brandKit;
  const brandLogoImageIndex = options?.brandLogoImageIndex ?? null;
  const withLogo = (prompt: string) =>
    brandLogoImageIndex != null
      ? joinParts(prompt, brandKitLogoImagePromptBlock(brandLogoImageIndex))
      : prompt;
  const referenceConcept = Boolean(options?.referenceConcept);
  const conceptTextOnly = Boolean(options?.conceptTextOnly);
  const storyboardStyleRef = Boolean(options?.storyboardStyleRef);
  const dualProductAndStyle = Boolean(options?.dualProductAndStyle);
  // Default: product storyboard assumes IMAGE 1 unless explicitly concept text-only.
  const hasProductImage = options?.hasProductImage ?? !conceptTextOnly;
  const textless = options?.textless !== false; // default ON for video-safe stills
  const sceneImagePrompt = softenStoryboardStillPromptForModeration(
    textless
      ? sanitizeStoryboardImagePromptForTextless(scene.imagePrompt)
      : scene.imagePrompt?.trim() || "",
  );
  const sceneVars: PromptVariables = {
    ...vars,
    extra: softenStoryboardStillPromptForModeration(
      [vars.extra, sceneImagePrompt].filter(Boolean).join(" | "),
    ),
  };
  const shopHint = options?.visualStyleId
    ? getVisualStyle(options.visualStyleId).promptHint
    : "";
  const sceneCopy = textless ? undefined : scene.onImageCopyZh?.trim();
  const lookLock = (() => {
    const bibleLine = plan.lookBible ? lookBibleSummaryLine(plan.lookBible) : "";
    const lighting = scene.lightingEn?.trim();
    return joinParts(
      bibleLine ? `LOOK BIBLE LOCK (grade only — all scenes): ${bibleLine}.` : "",
      lighting ? `Scene lighting (this beat): ${lighting}.` : "",
      plan.visualDirection && !bibleLine
        ? `Series look: ${plan.visualDirection}.`
        : "",
    );
  })();
  const textlessRule =
    brandLogoImageIndex != null
      ? `TEXTLESS STILL (mandatory for video): ZERO readable marketing copy — no Chinese/Latin captions, title bars, or watermarks. Exception: integrate the client's brand logo from IMAGE ${brandLogoImageIndex} exactly as provided. Leave blank space for burned captions AFTER Kling/Seedance.`
      : "TEXTLESS STILL (mandatory for video): ZERO readable text — no Chinese, no Latin, no digits-as-copy, no captions, no title bars, no watermarks, no fake UI labels. Phone/laptop/tablet screens must show soft blank or abstract UI chrome only — never invent gibberish Chinese/English on screens. If IMAGE 1 has text, REMOVE it completely. Leave blank space where type would go — captions are burned AFTER Kling/Seedance.";
  const imageBriefVars: PromptVariables = sceneCopy
    ? {
        ...sceneVars,
        subline: undefined,
        extra: joinParts(
          `ON-IMAGE COPY (this scene only): ${sceneCopy}`,
          "Do NOT render production labels (開場亮點, 行動呼籲, 中段, arrows →) or the full-video subline.",
          sceneImagePrompt,
        ),
      }
    : sceneVars;
  if (referenceConcept) {
    return withLogo(
      joinParts(
        artStyleMandatoryLead(sceneVars.artStyle),
        `Storyboard still ${scene.imageIndex}/${plan.scenes.length}.`,
        lookLock,
        plan.theme ? `Story theme: ${plan.theme}.` : "",
        `Scene role: ${scene.role}.`,
        sceneImagePrompt ? `Scene action: ${sceneImagePrompt}.` : "",
        "Keep the SAME ad layout shell as IMAGE 1 on every scene — only scene copy and micro-angle change inside that design family.",
        "Keep IMAGE 2 ad design language; IMAGE 1 product as hero in this scene.",
        buildReferenceConceptImagePrompt(imageBriefVars, {
          shopStyleHint: shopHint,
          brandProfile: options?.brandProfile ?? undefined,
        }),
        "Subject upright, head at top of frame — never rotate 90°.",
        MARKET_HINTS[sceneVars.market],
        FRAMING_IMAGE[sceneVars.framing],
        sceneCopy
          ? "Integrate ON-IMAGE COPY text with reference typography style — consumer words only."
          : joinParts(textlessRule, REFERENCE_ERASE_TEXT_LINE),
        "9:16 vertical social ad still — no watermark, no social UI.",
      ),
    );
  }
  if (storyboardStyleRef) {
    return withLogo(
      joinParts(
        artStyleMandatoryLead(vars.artStyle),
        `Storyboard still ${scene.imageIndex}/${plan.scenes.length}.`,
        plan.theme ? `User story theme (content lane): ${plan.theme}.` : "",
        lookLock ||
          (plan.visualDirection
            ? `Series look (from reference reel): ${plan.visualDirection}.`
            : ""),
        `Scene role: ${scene.role}.`,
        sceneImagePrompt ? `Scene action: ${sceneImagePrompt}.` : "",
        imageStoryboardStyleRefBlock(plan, dualProductAndStyle, textless),
        !hasProductImage ? conceptServiceStillSafetyClause() : "",
        sceneCopy ? `ON-IMAGE COPY (this scene only): ${sceneCopy}` : textlessRule,
        sceneCopy ? promoTypographyHint(sceneVars, true) : "",
        artStyleImageClause(vars.artStyle),
        artStyleAvoidTail(vars.artStyle),
        "Subject upright, head at top of frame — never rotate 90°.",
        MARKET_HINTS[sceneVars.market],
        FRAMING_IMAGE[sceneVars.framing],
        sceneVars.extra,
        "9:16 vertical, no watermark, no social UI.",
      ),
    );
  }
  if (conceptTextOnly) {
    return withLogo(
      joinParts(
        artStyleMandatoryLead(vars.artStyle),
        `Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a concept short.`,
        lookLock,
        plan.theme ? `Story theme: ${plan.theme}.` : "",
        `Scene role: ${scene.role}.`,
        sceneImagePrompt,
        sceneCopy ? `ON-IMAGE COPY (this scene only): ${sceneCopy}` : textlessRule,
        "Cinematic concept short — match reference reel pacing and visual style family; user topic for content only.",
        conceptServiceStillSafetyClause(),
        brandLogoImageIndex != null
          ? "No third-party logos, watermarks, or social UI. 9:16 vertical."
          : "No logos, watermarks, or social UI. 9:16 vertical.",
        artStyleImageClause(vars.artStyle),
        artStyleAvoidTail(vars.artStyle),
        "Subject upright, head at top of frame — never rotate 90°.",
        MARKET_HINTS[sceneVars.market],
        FRAMING_IMAGE[sceneVars.framing],
        sceneVars.extra,
      ),
    );
  }
  if (!hasProductImage) {
    return withLogo(
      joinParts(
        artStyleMandatoryLead(vars.artStyle),
        `Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a concept short.`,
        lookLock,
        plan.theme ? `Story theme: ${plan.theme}.` : "",
        `Scene role: ${scene.role}.`,
        sceneImagePrompt,
        sceneCopy ? `ON-IMAGE COPY (this scene only): ${sceneCopy}` : textlessRule,
        conceptServiceStillSafetyClause(),
        brandLogoImageIndex != null
          ? "9:16 vertical cinematic still — no third-party logos, watermarks, or social UI."
          : "9:16 vertical cinematic still — no logos, watermarks, or social UI.",
        artStyleImageClause(vars.artStyle),
        MARKET_HINTS[sceneVars.market],
        sceneVars.extra,
      ),
    );
  }
  return withLogo(
    joinParts(
      artStyleMandatoryLead(vars.artStyle),
      `Storyboard still ${scene.imageIndex}/${plan.scenes.length} for a ${artStyleStoryboardLead(vars.artStyle)}.`,
      lookLock,
      plan.theme ? `Story theme: ${plan.theme}.` : "",
      `Scene role: ${scene.role}.`,
      sceneImagePrompt,
      imageReferenceAnchorBlock(vars),
      "Keep the exact product from IMAGE 1 — same item, colors, materials, and shape. Do not swap for a different product category.",
      artStyleImageClause(vars.artStyle),
      artStyleAvoidTail(vars.artStyle),
      "Subject upright, head at top of frame, correct vertical orientation — never rotate person or product 90°.",
      MARKET_HINTS[vars.market],
      FRAMING_IMAGE[vars.framing],
      sceneVars.extra,
      brandPromptExtras(options?.brandProfile, brandKit),
      textlessRule,
      "9:16 vertical, no watermark, no social UI.",
    ),
  );
}

/** Second still for start→end image-to-video (Nano Banana). */
export function buildEndFrameImagePrompt(vars: PromptVariables): string {
  const product = vars.product?.trim() || "the product";
  return joinParts(
    `Create a second vertical ad frame for ${product} — must be a DIFFERENT composition from IMAGE 1.`,
    buildSecondFrameSceneHint(product, vars.framing),
    `Preserve exact product from IMAGE 1. New angle, lighting accent, and background mood.`,
    MARKET_HINTS[vars.market],
    FRAMING_IMAGE[vars.framing],
    vars.extra,
    "9:16, no readable text, no watermark.",
  );
}

/** Reference-to-video with multiple product photos, no MP4 clone. */
export function buildMultiAngleVideoPrompt(
  vars: PromptVariables,
  opts: VideoPromptOpts = {},
  templateId: TemplateId = "product-reel",
): string {
  const creativity = opts.creativity ?? "lively";
  return joinParts(
    buildWizardVideoPrompt(templateId, vars, { ...opts, multiAngle: true, creativity }),
    "Reference images show the same product from different angles — create dynamic motion that showcases multiple views with commercial pacing, not a single slow zoom.",
  );
}

export function buildNegativePrompt(
  template: MarketingTemplate,
  framing: SubjectFraming,
  artStyle: ArtStyleId = DEFAULT_ART_STYLE,
): string {
  const base = FRAMING_NEGATIVE[framing]
    ? `${template.negativePrompt}, ${FRAMING_NEGATIVE[framing]}`
    : template.negativePrompt;
  return applyArtStyleNegative(base, artStyle);
}

export function rebuildPromptsForTemplate(
  templateId: TemplateId,
  vars: PromptVariables,
): { image: string; video: string; negative: string } {
  const template = getTemplate(templateId);
  return {
    image: buildImageEditPrompt(template, vars),
    video: buildVideoPrompt(template, vars),
    negative: buildNegativePrompt(template, vars.framing),
  };
}

/** Reference-to-video — @Video1 = spine, @Image1 = object, name/title = claim (fal pattern). */
export function buildReferenceVideoPrompt(
  vars: PromptVariables,
  templateId?: TemplateId,
): string {
  // Do NOT inject template videoPromptTemplate (often "Slow cinematic push-in…") —
  // that fights @Video1 spine. Template id is unused for R2V camera/mood.
  void templateId;
  const productLabel = vars.product?.trim() || "the user's product";
  const claim = vars.headline?.trim();
  return (
    joinParts(
      "Reference-to-video. @Video1 = SPINE: camera angles, shot composition, hand movements, scene layout, pacing, and edit rhythm.",
      `@Image1 = OBJECT ONLY: perform the same actions/structure as @Video1, swap the hero to ${productLabel} (match @Image1 colors, materials, and shape).`,
      claim
        ? `Product name + title are CLAIM only (${productLabel} — ${claim}): sell this use-case without changing the on-screen object away from @Image1.`
        : `Product name is CLAIM only (${productLabel}): sell the named use-case; on-screen object must stay @Image1.`,
      `If @Video1 shows hands using or presenting a product, show natural hands with ${productLabel} — do NOT collapse into a generic slow push-in unless @Video1 does that.`,
      "Keep the same background type, lighting direction, and framing as @Video1.",
      "Do not copy identifiable faces, brand logos, social UI, or readable on-screen text from @Video1.",
      "Silent video: no speech, dialogue, vocals, or ambient talk — audio is added in post-production.",
      MARKET_HINTS[vars.market],
      vars.framing === "hands-only"
        ? "Hands may appear; face never visible."
        : vars.framing === "no-people" || vars.framing === "product-only"
          ? ""
          : FRAMING_VIDEO[vars.framing],
      "No generated subtitles, watermarks, or logos",
      vars.extra,
    ) + VIDEO_BGM_HINT
  );
}

/** Negative prompt for reference-to-video — do not block hands when matching @Video1. */
export function buildReferenceVideoNegative(template: MarketingTemplate): string {
  return `${template.negativePrompt.replace(/,?\s*distorted hands/gi, "")}, identifiable face close-up, celebrity portrait, social media UI overlay, screen recording chrome, watermark, logo, on-screen text, subtitles, speech, voiceover`;
}
