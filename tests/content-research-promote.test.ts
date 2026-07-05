import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copyFieldsFromAngle,
  isContentResearchStyleExtra,
  promoteProductName,
  researchProductPromptLines,
  styleReferencePromptBlock,
} from "../lib/content-research-promote";
import {
  PROMOTE_PRODUCT,
  SEARCH_TOPIC,
  xhsPlan,
  zodiacCarouselAngle,
} from "./fixtures/content-research";

describe("content-research-promote", () => {
  it("promoteProductName prefers explicit product over search topic", () => {
    assert.equal(promoteProductName(PROMOTE_PRODUCT, SEARCH_TOPIC), PROMOTE_PRODUCT);
    assert.equal(promoteProductName("", SEARCH_TOPIC), SEARCH_TOPIC);
  });

  it("copyFieldsFromAngle does not copy reference zodiac hook", () => {
    const copy = copyFieldsFromAngle(zodiacCarouselAngle, PROMOTE_PRODUCT, SEARCH_TOPIC);
    assert.ok(!copy.headline.includes("水瓶座"));
    assert.ok(copy.headline.includes(PROMOTE_PRODUCT));
    assert.ok(!copy.subline.includes("水瓶座性格"));
    assert.ok(copy.subline.includes(PROMOTE_PRODUCT));
    assert.ok(copy.subline.includes("carousel") || copy.subline.includes("Carousel"));
  });

  it("styleReferencePromptBlock is style-only and names product", () => {
    const block = styleReferencePromptBlock(
      zodiacCarouselAngle,
      xhsPlan,
      PROMOTE_PRODUCT,
      "8-slide pacing note",
    );
    assert.ok(block.includes("Style reference"));
    assert.ok(block.includes("Do NOT copy reference subject matter"));
    assert.ok(block.includes(PROMOTE_PRODUCT));
    assert.ok(block.includes(SEARCH_TOPIC));
    assert.ok(!block.includes("Slide1: 水瓶座"));
    assert.ok(!block.includes(zodiacCarouselAngle.whyItWorks));
    assert.ok(isContentResearchStyleExtra(block));
  });

  it("researchProductPromptLines splits search vs product", () => {
    const lines = researchProductPromptLines(SEARCH_TOPIC, PROMOTE_PRODUCT);
    assert.ok(lines.some((l) => l.includes(SEARCH_TOPIC)));
    assert.ok(lines.some((l) => l.includes(PROMOTE_PRODUCT)));
    assert.ok(lines.some((l) => l.includes("FORMAT")));
  });
});
