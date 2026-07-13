import type {
  ContentAngleCandidate,
  ContentAngleFormat,
  ContentResearchPlan,
} from "@/lib/content-research-types";
import type { PromotionMode } from "@/lib/promotion-mode";
import {
  REFERENCE_CONTENT_REPLACE_LINE,
  REFERENCE_STYLE_MATCH_LINE,
  REFERENCE_TOPIC_GUARD_LINE,
} from "@/lib/reference-style-transfer";

/** Marker in promptExtra when angle came from platform content research (style-only). */
export const CONTENT_RESEARCH_STYLE_PREFIX = "Style reference (";

export function isContentResearchStyleExtra(extra: string | undefined): boolean {
  return Boolean(
    extra?.includes(CONTENT_RESEARCH_STYLE_PREFIX) &&
      (extra.includes(REFERENCE_STYLE_MATCH_LINE) ||
        extra.includes("Do NOT copy reference subject matter")),
  );
}

/** Remove prior research style blocks so a newly picked angle replaces — not stacks — reference metadata. */
export function stripContentResearchStyleExtra(extra: string): string {
  return extra
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isContentResearchStyleExtra(part))
    .join(" | ");
}

/** True when angle came from a user-pinned post URL (not keyword-search result cards). */
export function isReferenceSourcedAngle(angle: ContentAngleCandidate): boolean {
  return angle.id.startsWith("pinned-");
}

/** Research pick from a real platform post (cover / carousel attached). */
function isResearchPostAngle(angle: ContentAngleCandidate): boolean {
  return (
    isReferenceSourcedAngle(angle) ||
    angle.id.startsWith("post-") ||
    Boolean(angle.sourceUrl?.trim()) ||
    referenceAngleImageCount(angle) > 0
  );
}

export function referenceAngleImageCount(angle: ContentAngleCandidate): number {
  return angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
}

/** Product still / handheld reference posts — not edu-carousel cover copy. */
const PRODUCT_SHOT_EDU_RE =
  /教程|攻略|避雷|干货|tips|how to|guide|checklist|步驟|步骤|懶人包|懒人包/i;

export function isProductShotReferenceAngle(angle: ContentAngleCandidate): boolean {
  const count = referenceAngleImageCount(angle);
  if (count === 0 || count > 3) return false;
  if (angle.format === "reel" || angle.format === "model-wear") return false;
  const blob = [
    angle.sourceTitle,
    angle.hook,
    angle.title,
    angle.bulletPoints.join(" "),
    angle.scriptOutline,
  ]
    .filter(Boolean)
    .join(" ");
  if (count >= 3 && PRODUCT_SHOT_EDU_RE.test(blob)) return false;
  if (count <= 3 && !PRODUCT_SHOT_EDU_RE.test(blob)) return true;
  return isSingleImageReferenceAngle(angle);
}

/** Single-image pinned reference posts should not get multi-slide 攻略 copy. */
export function isSingleImageReferenceAngle(angle: ContentAngleCandidate): boolean {
  return isReferenceSourcedAngle(angle) && referenceAngleImageCount(angle) <= 1;
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

/** User-facing subline for wizard fields — never English planner meta (that leaks onto images). */
function structureSublineFromAngle(
  angle: ContentAngleCandidate,
  product: string,
): string {
  switch (angle.format) {
    case "teaching-carousel":
      return `選購要點｜功效介紹｜保養貼士 — 全部關於${product}`;
    case "reel":
      return angle.bulletPoints.length >= 2
        ? angle.bulletPoints.slice(0, 4).join(" · ")
        : `${product}精选手作 · 天然能量 · 私信了解`;
    case "campaign":
      return `主圖推介｜賣點拆解｜優惠行動 — 全部關於${product}`;
    case "model-wear":
      return `${product}穿搭示範 — 跟參考節奏，唔跟參考話題`;
    default:
      return `用參考排版推介${product} — 唔複製參考主題`;
  }
}

const REFERENCE_TOPIC_CTA =
  /星座|留言你的|留言領取|你是.{0,4}座嗎|雙擊|點讚|關注我|follow\s+for/i;

function sanitizeOfferFromAngle(angle: ContentAngleCandidate, product: string): string {
  const cta = angle.cta?.trim() || "";
  const hook = angle.hook?.trim() || "";
  const title = angle.sourceTitle?.trim() || "";
  const looksLikeReferenceEngagement =
    !cta ||
    REFERENCE_TOPIC_CTA.test(cta) ||
    REFERENCE_TOPIC_CTA.test(hook) ||
    REFERENCE_TOPIC_CTA.test(title) ||
    (/留言|評論|comment/i.test(cta) && !cta.includes(product));
  if (looksLikeReferenceEngagement) {
    return `了解${product}`;
  }
  return cta;
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

const REFERENCE_TOPIC_LEAK =
  /水瓶座|白羊座|金牛座|双子座|巨蟹座|狮子座|处女座|天秤座|天蝎座|射手座|摩羯座|双鱼座|星座/i;

/** Block raw reference-post engagement / topic from becoming on-image copy. */
function isUnsafePromotedCopy(
  text: string,
  angle: ContentAngleCandidate,
  product: string,
): boolean {
  const t = text.trim();
  if (!t) return true;
  if (REFERENCE_TOPIC_CTA.test(t)) return true;
  const source = angle.sourceTitle?.trim();
  if (source && t === source) return true;
  if (product && !t.includes(product) && REFERENCE_TOPIC_LEAK.test(t)) return true;
  if (product && !t.includes(product) && REFERENCE_TOPIC_LEAK.test(angle.sourceTitle ?? "")) {
    return true;
  }
  if (product && !t.includes(product) && REFERENCE_TOPIC_LEAK.test(t)) return true;
  return false;
}

/**
 * Use planner "為你改寫" fields (angle.title / hook / bullets) when safe.
 * Reference layout comes from analyze — these are user-editable on-image copy.
 */
function promotedRewriteCopyFromAngle(
  angle: ContentAngleCandidate,
  product: string,
): { headline: string; subline: string; offer: string } {
  const source = angle.sourceTitle?.trim() ?? "";
  const title = angle.title?.trim() ?? "";
  const hook = angle.hook?.trim() ?? "";

  let headline = "";
  if (title && !isUnsafePromotedCopy(title, angle, product) && title !== source) {
    headline = title;
  } else if (product && !isProductShotReferenceAngle(angle)) {
    headline = `${product}｜${structureHookSuffix(angle.format)}`;
  }

  let subline = "";
  if (hook && !isUnsafePromotedCopy(hook, angle, product) && hook !== source) {
    subline = hook;
  } else {
    const bullets = angle.bulletPoints
      .map((b) => b.trim())
      .filter((b) => b && !isUnsafePromotedCopy(b, angle, product));
    if (bullets.length) {
      subline = bullets.slice(0, 4).join(" · ");
    } else if (product && !isProductShotReferenceAngle(angle)) {
      subline = structureSublineFromAngle(angle, product);
    }
  }

  return {
    headline,
    subline,
    offer: product ? sanitizeOfferFromAngle(angle, product) : "",
  };
}

/**
 * Headline/subline for wizard — prefer promote-target-specific copy; reference post topic is not copied.
 * In concept mode an explicit concept anchor is always retained, even when it equals the search topic.
 */
export function copyFieldsFromAngle(
  angle: ContentAngleCandidate,
  promoteProduct: string,
  searchTopic: string,
  options?: { promotionMode?: PromotionMode; referenceSourced?: boolean },
): { headline: string; subline: string; offer: string } {
  const product = promoteProduct.trim();
  const search = searchTopic.trim();
  const promotionMode = options?.promotionMode ?? "physical";
  const referenceSourced = options?.referenceSourced ?? isReferenceSourcedAngle(angle);

  if (promotionMode === "concept") {
    if (product) {
      if (isResearchPostAngle(angle)) {
        return promotedRewriteCopyFromAngle(angle, product);
      }
      return {
        headline: `${product}｜${structureHookSuffix(angle.format)}`,
        subline: structureSublineFromAngle(angle, product),
        offer: sanitizeOfferFromAngle(angle, product),
      };
    }
    if (referenceSourced && !search) {
      return { headline: "", subline: "", offer: "" };
    }
    if (referenceSourced && search) {
      return {
        headline: search,
        subline: structureSublineFromAngle(angle, search),
        offer: sanitizeOfferFromAngle(angle, search),
      };
    }
    const hook = angle.hook.trim() || angle.title.trim();
    const subline = angle.bulletPoints.length
      ? angle.bulletPoints.join(" · ")
      : angle.scriptOutline.trim();
    return {
      headline: hook || search,
      subline,
      offer: sanitizeOfferFromAngle(angle, search),
    };
  }

  if (!product) {
    if (referenceSourced) {
      return { headline: "", subline: "", offer: "" };
    }
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

  if (isResearchPostAngle(angle)) {
    return promotedRewriteCopyFromAngle(angle, product);
  }

  const headline = `${product}｜${structureHookSuffix(angle.format)}`;

  return {
    headline,
    subline: structureSublineFromAngle(angle, product),
    offer: sanitizeOfferFromAngle(angle, product),
  };
}

/**
 * Prompt block for generation — style/layout/motion only; never viral topic or reference script text.
 */
export function styleReferencePromptBlock(
  angle: ContentAngleCandidate,
  plan: ContentResearchPlan,
  promoteTarget: string,
  referenceNote?: string,
): string {
  const imageCount =
    angle.sourceImageUrls?.length ?? (angle.sourceCoverImageUrl ? 1 : 0);
  const target = promoteTarget.trim();
  const refTitle = angle.sourceTitle?.trim() ?? "";
  const searchTopic = plan.topic.trim();
  const categoryTopic =
    searchTopic && searchTopic !== refTitle && searchTopic !== target
      ? searchTopic
      : "";

  const promoteLine = target
    ? `All copy and visuals must promote: ${target}`
    : `All copy and visuals must promote the user's product or campaign (Setup fields) — NEVER the reference post title "${refTitle}" or its subject matter`;

  const parts = [
    `Style reference (${plan.platformLabel})`,
    angle.sourceUrl ? `Visual source: ${angle.sourceUrl}` : "",
    refTitle ? `Reference post title (style inspiration only — do NOT copy its topic): "${refTitle}"` : "",
    imageCount > 1 ? `${imageCount}-slide carousel pacing` : "",
    REFERENCE_STYLE_MATCH_LINE,
    REFERENCE_CONTENT_REPLACE_LINE,
    `${REFERENCE_TOPIC_GUARD_LINE}, zodiac/星座/時事/其他品牌 hooks`,
    categoryTopic ? `User search category (content lane only): ${categoryTopic}` : "",
    promoteLine,
    referenceNote,
  ];

  return parts.filter(Boolean).join(". ");
}

/** Target string for styleReferencePromptBlock from wizard fields. */
export function contentResearchPromoteTarget(
  promotionMode: PromotionMode,
  fields: { product: string; headline: string; conceptIdea: string; searchTopic: string },
): string {
  const product = fields.product.trim();
  if (promotionMode === "physical") {
    return product;
  }
  return product || fields.conceptIdea.trim() || fields.headline.trim() || fields.searchTopic.trim();
}

/** Rebuild style-only research block when user edits product/headline after applying a reference post. */
export function refreshContentResearchPromptExtra(
  prevExtra: string,
  ref: { angle: ContentAngleCandidate; plan: Pick<ContentResearchPlan, "platformLabel" | "topic"> } | null,
  promotionMode: PromotionMode,
  fields: { product: string; headline: string; conceptIdea: string },
): string {
  if (!ref || !isContentResearchStyleExtra(prevExtra)) return prevExtra;
  const stripped = stripContentResearchStyleExtra(prevExtra);
  const promoteTarget = contentResearchPromoteTarget(promotionMode, {
    product: fields.product,
    headline: fields.headline,
    conceptIdea: fields.conceptIdea,
    searchTopic: ref.plan.topic,
  });
  const newBlock = styleReferencePromptBlock(ref.angle, ref.plan as ContentResearchPlan, promoteTarget);
  return [stripped.trim(), newBlock].filter(Boolean).join(" | ");
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
    "- Never paste reference TOPIC (星座/水瓶座/其他品牌/无关话题) into hooks or scripts — but DO match reference visual style",
  ];
}
