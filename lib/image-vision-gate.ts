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
    return join(
      `Clean product/scene ad still for ${product}.`,
      headline ? `Campaign mood (not rendered as text): ${headline}.` : "",
      "No on-image text, logos, or watermarks — copy is added later in the editor.",
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
    return ["garbled on-image text", "random watermarks", "wrong product category"];
  }
  return ["garbled or misspelled on-image text", "wrong product category", "unreadable typography"];
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
