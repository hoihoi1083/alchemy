import type { PipelineSmokeReview } from "@/lib/pipeline-smoke-review";

export type ImageVisionReview = PipelineSmokeReview & {
  skipped?: boolean;
};

const GARBLED_TEXT_PATTERNS = [
  /garbled/i,
  /illegible/i,
  /nonsense/i,
  /misspell/i,
  /wrong (text|copy|wording|characters|chinese|english)/i,
  /broken text/i,
  /unreadable/i,
  /乱码/,
  /錯字/,
  /错字/,
];

export function hasGarbledTextIssue(review: ImageVisionReview | null | undefined): boolean {
  if (!review?.issues?.length) return false;
  return review.issues.some((issue) =>
    GARBLED_TEXT_PATTERNS.some((re) => re.test(issue)),
  );
}

export function buildWizardImageExpectation(input: {
  product: string;
  headline?: string;
  imageTextMode?: "integrated" | "textless";
}): string {
  const product = input.product.trim() || "the promoted product";
  const headline = input.headline?.trim();
  if (input.imageTextMode === "textless") {
    // Do not quote headline/offer words — listing them biases the vision model.
    return join(
      `Clean TEXTLESS product/scene plate for ${product}.`,
      "ZERO overlaid marketing typography — no headlines, slogans, CTAs, captions, title bars, speech bubbles, or gibberish letters in any language.",
      "Only real product packaging labels printed on the physical product may remain.",
      "Product should be recognizable and well lit.",
    );
  }
  return join(
    `Marketing ad still for ${product}.`,
    headline ? `Headline or offer theme: ${headline}.` : "",
    "On-image copy should be legible with correct spelling for the target market.",
    "Product should match the brief — no wrong category swaps.",
  );
}

export function wizardImageMustAvoid(imageTextMode?: "integrated" | "textless"): string[] {
  if (imageTextMode === "textless") {
    return [
      "any overlaid campaign headline, slogan, CTA, caption, or title bar",
      "English or Chinese marketing lettering painted onto the frame",
      "garbled or gibberish on-image text",
      "random watermarks or invented logos",
      "wrong product category",
    ];
  }
  return ["garbled or misspelled on-image text", "wrong product category", "unreadable typography"];
}

const TEXTLESS_TEXT_MARKERS =
  /headline|slogan|caption|typography|on-image text|lettering|title\s*bar|cta|watermark|garbled|gibberish|masthead|readable text|painted text|marketing copy|writing on|overlaid text|文字|标题|標題|口號|口号|標語|标语/i;

/** True when vision says a Textless still still has campaign typography. */
export function hasTextlessTypographyViolation(
  review: ImageVisionReview | null | undefined,
): boolean {
  if (!review || review.skipped) return false;
  const blob = [review.summary, ...(review.issues ?? [])].join(" ");
  if ((review.issues ?? []).some((issue) => TEXTLESS_TEXT_MARKERS.test(issue))) {
    return true;
  }
  if (!review.matchesExpectation && TEXTLESS_TEXT_MARKERS.test(blob)) {
    return true;
  }
  // Soft fail: expectation miss + text-ish summary at mid score.
  if (!review.matchesExpectation && review.score < 75 && /text|type|copy|letter/i.test(blob)) {
    return true;
  }
  return false;
}

/** Warn in UI when score is low or issues mention garbled text. */
export function visionReviewNeedsAttention(
  review: ImageVisionReview | null | undefined,
): boolean {
  if (!review || review.skipped) return false;
  if (!review.matchesExpectation && review.score < 70) return true;
  return hasGarbledTextIssue(review);
}

/** Block Ship-it auto-pipeline when output is clearly unusable. */
export function visionGateBlocksShipIt(
  review: ImageVisionReview | null | undefined,
): boolean {
  if (!review || review.skipped) return false;
  if (hasGarbledTextIssue(review)) return true;
  return !review.matchesExpectation && review.score < 55;
}

function join(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
