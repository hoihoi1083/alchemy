import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCarouselSlideCount,
  resolveCarouselBackendMode,
  resolveEffectiveImageOutputMode,
} from "../lib/carousel-output";
import { estimateTeachingCarouselTokens } from "../lib/billing/token-costs";

describe("carousel output resolution", () => {
  it("promo + 3 slides → campaign backend", () => {
    assert.equal(resolveCarouselBackendMode("promo", 3), "campaign");
  });

  it("teaching + 3–7 slides → teaching-carousel backend", () => {
    assert.equal(resolveCarouselBackendMode("teaching", 3), "teaching-carousel");
    assert.equal(resolveCarouselBackendMode("teaching", 7), "teaching-carousel");
  });

  it("promo intent always normalizes slide count to 3", () => {
    assert.equal(normalizeCarouselSlideCount(5, "promo"), 3);
  });

  it("teaching intent clamps 3–7", () => {
    assert.equal(normalizeCarouselSlideCount(2, "teaching"), 3);
    assert.equal(normalizeCarouselSlideCount(9, "teaching"), 7);
  });

  it("carousel UI mode resolves to backend modes", () => {
    assert.equal(
      resolveEffectiveImageOutputMode({
        imageOutputMode: "carousel",
        carouselIntent: "promo",
        carouselSlideCount: 3,
      }),
      "campaign",
    );
    assert.equal(
      resolveEffectiveImageOutputMode({
        imageOutputMode: "carousel",
        carouselIntent: "teaching",
        carouselSlideCount: 5,
      }),
      "teaching-carousel",
    );
  });

  it("teaching token estimate scales through 7 slides", () => {
    assert.equal(estimateTeachingCarouselTokens(3), 5 + 65 * 3);
    assert.equal(estimateTeachingCarouselTokens(7), 5 + 65 * 7);
  });
});
