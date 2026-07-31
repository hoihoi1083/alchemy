import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  referenceAnalyzeTriggerKey,
  referenceFilesFingerprint,
} from "../lib/reference-analyze-trigger";

describe("reference analyze trigger", () => {
  it("returns null without a cover file", () => {
    assert.equal(referenceFilesFingerprint(null, []), null);
    assert.equal(
      referenceAnalyzeTriggerKey({
        cover: null,
        extras: [],
        promotionMode: "physical",
        imageOutputMode: "single",
        hasProductPhoto: false,
      }),
      null,
    );
  });

  it("ignores product-kit extras — only cover triggers re-analyze", () => {
    const cover = new File(["a"], "cover.jpg", { type: "image/jpeg" });
    const extra = new File(["b"], "slide-2.jpg", { type: "image/jpeg" });
    const base = {
      cover,
      extras: [] as File[],
      promotionMode: "physical",
      imageOutputMode: "teaching-carousel",
      hasProductPhoto: false,
      researchAngleId: "post-1",
    };
    const k1 = referenceAnalyzeTriggerKey(base);
    const k2 = referenceAnalyzeTriggerKey({ ...base, extras: [extra] });
    assert.equal(k1, k2);
  });

  it("does not re-trigger when visual style or creative mode changes", () => {
    const cover = new File(["a"], "cover.jpg", { type: "image/jpeg" });
    const base = {
      cover,
      extras: [] as File[],
      promotionMode: "physical",
      imageOutputMode: "single",
      hasProductPhoto: true,
      researchAngleId: null as string | null,
    };
    const k1 = referenceAnalyzeTriggerKey({
      ...base,
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
    });
    const k2 = referenceAnalyzeTriggerKey({
      ...base,
      visualStyleId: "model-wear",
      imageCreativeMode: "promo-ai",
    });
    assert.equal(k1, k2);
  });
});
