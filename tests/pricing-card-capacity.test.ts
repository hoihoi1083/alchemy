import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRICING_CARD_VIDEO_8S_TOKENS,
  estimatePricingCardCapacity,
  pricingCardCapacityItems,
} from "../lib/billing/pricing-card-capacity";
import { H3_TOKENS_PER_SEC, TOKEN_COST } from "../lib/billing/token-costs";

const copy = {
  capacityFreeImages: "Up to {n} single images",
  capacityFreeVideos: "Up to {n} × 8s 480p videos",
  capacityImagesFeature: "Up to {n} single images",
  capacityVideosFeature: "Up to {n} × 8s 480p videos",
};

describe("estimatePricingCardCapacity", () => {
  it("counts 1K images and 8s 480p videos independently", () => {
    assert.equal(PRICING_CARD_VIDEO_8S_TOKENS, H3_TOKENS_PER_SEC["480P"] * 8);
    assert.equal(PRICING_CARD_VIDEO_8S_TOKENS, 328);
    assert.equal(TOKEN_COST.image, 65);

    const free = estimatePricingCardCapacity("free");
    assert.equal(free.images, 7);
    assert.equal(free.videos8s, 1);

    const standard = estimatePricingCardCapacity("standard");
    assert.equal(standard.images, 46);
    assert.equal(standard.videos8s, 9);

    const pro = estimatePricingCardCapacity("pro");
    assert.equal(pro.images, 123);
    assert.equal(pro.videos8s, 24);

    const master = estimatePricingCardCapacity("master");
    assert.equal(master.images, 246);
    assert.equal(master.videos8s, 48);
  });
});

describe("pricingCardCapacityItems", () => {
  it("prefixes counts with Up to at 1K / 480p", () => {
    assert.deepEqual(
      pricingCardCapacityItems("free", copy).map((i) => i.label),
      ["Up to 7 single images", "Up to 1 × 8s 480p videos"],
    );
    assert.deepEqual(
      pricingCardCapacityItems("pro", copy).map((i) => i.label),
      ["Up to 123 single images", "Up to 24 × 8s 480p videos"],
    );
  });
});
