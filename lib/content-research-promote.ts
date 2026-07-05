import type { ContentAngleCandidate, ContentResearchPlan } from "@/lib/content-research-types";
import type { ContentAngleFormat } from "@/lib/content-research-types";

/** Marker in promptExtra when angle came from platform content research (style-only). */
export const CONTENT_RESEARCH_STYLE_PREFIX = "Style reference (";

export function isContentResearchStyleExtra(extra: string | undefined): boolean {
  return Boolean(
    extra?.includes(CONTENT_RESEARCH_STYLE_PREFIX) &&
      extra.includes("Do NOT copy reference subject matter"),
  );
}

/** User-facing copy fields derived from an angle + the product they actually sell. */
export function promoteProductName(
  promoteProduct: string | undefined,
  planTopic: string,
): string {
  const product = promoteProduct?.trim();
  if (product) return product;
  return planTopic.trim();
}

function structureSublineFromAngle(
  angle: ContentAngleCandidate,
  product: string,
): string {
  const slides =
    angle.sourceImageUrls?.length ??
    (angle.sourceCoverImageUrl ? 1 : 0);
  switch (angle.format) {
    case "teaching-carousel":
      return slides >= 2
        ? `${slides}-slide carousel: cover hook → product benefits → tips → recap CTA. All copy about ${product}.`
        : `Carousel: cover hook → product benefits → recap CTA. All copy about ${product}.`;
    case "reel":
      return `Short video: hook → ${product} showcase → CTA.`;
    case "campaign":
      return `Campaign series for ${product}: hero → detail → lifestyle → CTA.`;
    case "model-wear":
      return `On-body styling for ${product} — match reference pacing, not reference topic.`;
    default:
      return `Promote ${product} using the reference format — not its subject matter.`;
  }
}
function structureHookSuffix(format: ContentAngleFormat): string {
  switch (format) {
    case "teaching-carousel":
      return "必看攻略";
    case "campaign":
      return "系列推介";
    case "reel":
      return "短片";
    case "model-wear":
      return "穿搭示範";
    default:
      return "推介";
  }
}

/**
 * Headline/subline for wizard — prefer product-specific copy; reference post topic is not copied.
 */
export function copyFieldsFromAngle(
  angle: ContentAngleCandidate,
  promoteProduct: string,
  searchTopic: string,
): { headline: string; subline: string; offer: string } {
  const product = promoteProduct.trim();
  const search = searchTopic.trim();

  if (!product) {
    const hook = angle.hook.trim();
    const subline = angle.bulletPoints.length
      ? angle.bulletPoints.join(" | ")
      : angle.scriptOutline.trim();
    return {
      headline: hook || search,
      subline,
      offer: angle.cta,
    };
  }

  const headline = `${product}｜${structureHookSuffix(angle.format)}`;

  if (product === search) {
    const subline = angle.bulletPoints.length
      ? angle.bulletPoints.join(" | ")
      : angle.scriptOutline.trim();
    return {
      headline,
      subline,
      offer: angle.cta,
    };
  }

  return {
    headline,
    subline: structureSublineFromAngle(angle, product),
    offer: angle.cta || `了解${product}`,
  };
}

/**
 * Prompt block for generation — style/layout/motion only; never viral topic or reference script text.
 */
export function styleReferencePromptBlock(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promoteProduct: string,
  referenceNote?: string,
): string {
  const imageCount =
    angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
  const product = promoteProductName(promoteProduct, plan.topic);
  const searchTopic = plan.topic.trim();

  const parts = [
    `Style reference (${plan.platformLabel})`,
    angle.sourceUrl ? `Visual source: ${angle.sourceUrl}` : "",
    angle.sourceTitle
      ? `Reference post title (do NOT copy its topic): "${angle.sourceTitle}"`
      : "",
    imageCount > 1 ? `${imageCount}-slide carousel pacing` : "",
    `Borrow ONLY: layout rhythm, palette, typography mood, hook structure, slide roles`,
    `Do NOT copy reference subject matter, zodiac/星座/時事/其他品牌, or on-image text from the reference`,
    searchTopic && product && searchTopic !== product
      ? `Search category: ${searchTopic}`
      : "",
    `All copy and visuals must promote: ${product}`,
    referenceNote,
  ];

  return parts.filter(Boolean).join(". ");
}

export function researchProductPromptLines(
  topic: string,
  product?: string,
): string[] {
  const t = topic.trim();
  const p = product?.trim();
  if (!p || p === t) {
    return [`User product/topic for all hooks and slides: ${t}`];
  }
  return [
    `Search keyword (find viral posts in this category only): ${t}`,
    `PRODUCT TO PROMOTE — every hook, slide, and CTA must be about THIS, not the reference post topic: ${p}`,
    "- hook/scriptOutline: borrow reference FORMAT and slide structure only; write copy for the product above",
    "- Never paste reference subject matter (星座/水瓶座/其他品牌/无关话题) into hooks or scripts",
  ];
}
