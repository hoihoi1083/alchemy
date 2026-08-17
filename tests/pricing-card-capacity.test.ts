import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimatePricingCardCapacity,
  pricingCardCapacityItems,
} from "../lib/billing/pricing-card-capacity";
import { estimatePlanApproxCapacity } from "../lib/billing/token-costs";

const copy = {
  capacityFreeImages: "1 promotional image",
  capacityFreeVideos: "1× 8s 480p video",
  capacityImagesFeature: "~{n} single images",
  capacityVideosFeature: "or ~{n} × 8s videos",
};

describe("estimatePricingCardCapacity", () => {
  it("shows the Free pack as 1 image and 1× 8s 480p together", () => {
    const card = estimatePricingCardCapacity("free");
    assert.deepEqual(card, {
      images: 1,
      videos8s: 1,
      packTogether: true,
    });
    // Either/or math is higher — do not use it on Free cards.
    const eitherOr = estimatePlanApproxCapacity("free");
    assert.equal(eitherOr.approxImages, 7);
    assert.ok(eitherOr.approxImages !== card.images);
  });

  it("keeps paid cards as either/or grant spend", () => {
    const standard = estimatePricingCardCapacity("standard");
    const eitherOr = estimatePlanApproxCapacity("standard");
    assert.equal(standard.packTogether, false);
    assert.equal(standard.images, eitherOr.approxImages);
    assert.equal(standard.videos8s, eitherOr.approxVideos8s);
    assert.equal(standard.images, 46);
    assert.equal(standard.videos8s, 5);
  });
});

describe("pricingCardCapacityItems", () => {
  it("labels Free as the pack, not ~7 images", () => {
    const items = pricingCardCapacityItems("free", copy);
    assert.deepEqual(
      items.map((i) => i.label),
      ["1 promotional image", "1× 8s 480p video"],
    );
    assert.ok(!items.some((i) => i.label.includes("7")));
  });

  it("labels paid as either/or counts", () => {
    const items = pricingCardCapacityItems("pro", copy);
    assert.deepEqual(
      items.map((i) => i.label),
      ["~123 single images", "or ~9 × 8s videos"],
    );
  });
});
