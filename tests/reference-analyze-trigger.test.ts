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
        visualStyleId: "product",
        imageCreativeMode: "reference-concept",
        hasProductPhoto: false,
      }),
      null,
    );
  });

  it("changes when cover or carousel extras change", () => {
    const cover = new File(["a"], "cover.jpg", { type: "image/jpeg" });
    const extra = new File(["b"], "slide-2.jpg", { type: "image/jpeg" });
    const base = {
      cover,
      extras: [] as File[],
      promotionMode: "physical",
      imageOutputMode: "teaching-carousel",
      visualStyleId: "product",
      imageCreativeMode: "reference-concept",
      hasProductPhoto: false,
      researchAngleId: "post-1",
    };
    const k1 = referenceAnalyzeTriggerKey(base);
    const k2 = referenceAnalyzeTriggerKey({ ...base, extras: [extra] });
    assert.notEqual(k1, k2);
  });
});
