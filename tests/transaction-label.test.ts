import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transactionLabel } from "../lib/billing/transaction-label";
import { en } from "../lib/i18n/en";

const reasons = en.account.reasons;
const kinds = en.account.consumeKinds;

describe("transactionLabel", () => {
  it("maps consume meta.kind to specific labels", () => {
    assert.equal(
      transactionLabel("consume", { kind: "research_reel", planStoryboard: true }, reasons, kinds),
      "Research reel analysis + storyboard plan",
    );
    assert.equal(
      transactionLabel("consume", { kind: "storyboard", sceneCount: 2 }, reasons, kinds),
      "Storyboard images (2 scenes)",
    );
    assert.equal(
      transactionLabel("consume", { kind: "image", imageOutputMode: "ab" }, reasons, kinds),
      "A/B image generation (2 variants)",
    );
    assert.equal(
      transactionLabel("consume", { kind: "image", mode: "refine" }, reasons, kinds),
      "Image refine",
    );
  });

  it("keeps grant reasons unchanged", () => {
    assert.equal(transactionLabel("signup_grant", null, reasons, kinds), reasons.signup_grant);
  });

  it("falls back when kind is missing", () => {
    assert.equal(transactionLabel("consume", {}, reasons, kinds), kinds.fallback);
  });
});
