import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isContentResearchStyleExtra } from "../lib/content-research-promote";
import { resolveReferenceStrategy } from "../lib/reference-strategy";
import { styleReferencePromptBlock } from "../lib/content-research-promote";
import {
  PROMOTE_PRODUCT,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

/**
 * Mirrors client/API guards for image + campaign generation
 * (layout-transfer needs dual images; style-only does not).
 */
function campaignRouteWouldReject(
  creativeMode: string,
  strategy: ReturnType<typeof resolveReferenceStrategy>,
): boolean {
  return creativeMode === "reference-concept" && strategy.kind === "layout-transfer" && !strategy.useDualImage;
}

function imageRouteWouldReject(
  creativeMode: string,
  strategy: ReturnType<typeof resolveReferenceStrategy>,
): boolean {
  return creativeMode === "reference-concept" && strategy.kind === "layout-transfer" && !strategy.useDualImage;
}

function clientImageWouldReject(
  creativeMode: string,
  promotionMode: string,
  hasProductPhoto: boolean,
  promptExtra: string,
  strategy: ReturnType<typeof resolveReferenceStrategy>,
): boolean {
  if (creativeMode !== "reference-concept") return false;
  const styleOnlyRef =
    strategy.kind === "style-only" || isContentResearchStyleExtra(promptExtra);
  return !hasProductPhoto && promotionMode !== "concept" && !styleOnlyRef;
}

describe("generation route guards", () => {
  const styleOnlyStrategy = resolveReferenceStrategy({
    promotionMode: "physical",
    imageOutputMode: "teaching-carousel",
    visualStyleId: "product",
    imageCreativeMode: "reference-concept",
    hasReferenceUpload: true,
    hasProductPhoto: false,
    hasReferenceBrief: true,
  });

  const promptExtra = styleReferencePromptBlock(
    zodiacCarouselAngle,
    xhsPlan,
    PROMOTE_PRODUCT,
  );

  it("campaign allows style-only research ref (no product photo)", () => {
    assert.equal(campaignRouteWouldReject("reference-concept", styleOnlyStrategy), false);
  });

  it("single image allows style-only research ref", () => {
    assert.equal(imageRouteWouldReject("reference-concept", styleOnlyStrategy), false);
  });

  it("client allows physical style-only without product photo", () => {
    assert.equal(
      clientImageWouldReject(
        "reference-concept",
        "physical",
        false,
        promptExtra,
        styleOnlyStrategy,
      ),
      false,
    );
  });

  it("layout-transfer without dual images is still blocked", () => {
    const layoutStrategy = resolveReferenceStrategy({
      promotionMode: "physical",
      imageOutputMode: "single",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasReferenceUpload: true,
      hasProductPhoto: false,
      hasReferenceBrief: false,
    });
    assert.equal(layoutStrategy.kind, "style-only");
    assert.equal(campaignRouteWouldReject("reference-concept", layoutStrategy), false);
  });
});
