import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPromoImagePrompt } from "../lib/prompt-variables";
import { TEXTLESS_IMAGE_GUARD } from "../lib/image-text-mode";

describe("buildPromoImagePrompt textless mode", () => {
  const baseVars = {
    product: "Rose quartz bracelet",
    headline: "Summer Sale",
    subline: "20% off today",
    framing: "product-only" as const,
    market: "hk" as const,
    artStyle: "realistic" as const,
  };

  it("includes textless guard and mood-only copy when imageTextMode is textless", () => {
    const prompt = buildPromoImagePrompt({
      ...baseVars,
      imageTextMode: "textless",
    });
    assert.ok(prompt.includes(TEXTLESS_IMAGE_GUARD));
    assert.ok(prompt.includes("do NOT render as text"));
    assert.ok(!prompt.includes("headline typography"));
  });

  it("uses integrated typography path when imageTextMode is integrated", () => {
    const prompt = buildPromoImagePrompt({
      ...baseVars,
      imageTextMode: "integrated",
    });
    assert.ok(!prompt.includes(TEXTLESS_IMAGE_GUARD));
    assert.ok(prompt.includes("marketing typography"));
  });
});
