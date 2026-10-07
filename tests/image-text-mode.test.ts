import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMotionPosterEndStillPrompt,
  buildMotionPosterStillPrompt,
  buildPromoImagePrompt,
  buildWizardImagePrompt,
} from "../lib/prompt-variables";
import {
  enforceTextlessPrompt,
  parseImageTextMode,
  TEXTLESS_IMAGE_AVOID,
  TEXTLESS_IMAGE_GUARD,
  TEXTLESS_IMAGE_OVERRIDE,
} from "../lib/image-text-mode";

describe("parseImageTextMode", () => {
  it("defaults storyboard APIs to textless", () => {
    assert.equal(parseImageTextMode(null), "textless");
    assert.equal(parseImageTextMode("integrated"), "integrated");
    assert.equal(parseImageTextMode("nope", "integrated"), "integrated");
  });
});

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
    assert.ok(prompt.includes(TEXTLESS_IMAGE_AVOID));
    assert.ok(prompt.includes("Campaign mood only"));
    assert.ok(prompt.includes("Atmosphere only — no writing"));
    // Must not quote campaign copy — that trains the model to paint those words.
    assert.ok(!prompt.includes("Summer Sale"));
    assert.ok(!prompt.includes("20% off today"));
    assert.ok(!prompt.includes("NEVER paint these words"));
    assert.ok(!prompt.includes("All on-image marketing copy"));
    assert.ok(!prompt.includes("headline typography"));
  });

  it("uses integrated typography path when imageTextMode is integrated", () => {
    const prompt = buildPromoImagePrompt({
      ...baseVars,
      imageTextMode: "integrated",
    });
    assert.ok(!prompt.includes(TEXTLESS_IMAGE_GUARD));
    assert.ok(!prompt.includes(TEXTLESS_IMAGE_AVOID));
    assert.ok(prompt.includes("marketing typography"));
    assert.ok(prompt.includes("All on-image marketing copy"));
  });
});

describe("enforceTextlessPrompt + wizard typography modes", () => {
  it("appends OVERRIDE after a type-heavy prompt", () => {
    const locked = enforceTextlessPrompt(
      'Main hook line on image (paint EXACTLY ONCE): "Summer Sale".',
      "textless",
    );
    assert.ok(locked.includes(TEXTLESS_IMAGE_GUARD));
    assert.ok(locked.includes(TEXTLESS_IMAGE_OVERRIDE));
    assert.ok(locked.indexOf(TEXTLESS_IMAGE_OVERRIDE) > locked.indexOf("Summer Sale"));
  });

  it("routes designed-poster to textless promo plate (no paint EXACTLY ONCE)", () => {
    const prompt = buildWizardImagePrompt(
      {
        product: "Power station",
        headline: "What Can You Actually Run?",
        subline: "TV, fridge, or a whole camping trip",
        offer: "Comment your most creative use.",
        framing: "product-only",
        market: "en",
        artStyle: "realistic",
        imageTextMode: "textless",
      },
      "designed-poster",
    );
    assert.ok(prompt.includes(TEXTLESS_IMAGE_GUARD));
    assert.ok(prompt.includes(TEXTLESS_IMAGE_OVERRIDE));
    assert.ok(!prompt.includes("paint EXACTLY ONCE"));
    assert.ok(!prompt.includes("What Can You Actually Run?"));
  });
});

describe("buildMotionPosterStillPrompt", () => {
  it("asks for a textless scene plate and locks IMAGE 1 pixels vs name claim", () => {
    const prompt = buildMotionPosterStillPrompt({
      product: "金砂石手串",
      headline: "招財",
      subline: "",
      framing: "auto",
      market: "hk",
      artStyle: "realistic",
    });
    assert.match(prompt, /TEXTLESS/);
    assert.match(prompt, /首尾帧|START keyframe/i);
    assert.match(prompt, /END frame/i);
    assert.match(prompt, /no readable writing/i);
    assert.match(prompt, /IMAGE 1 PIXELS ARE THE PRODUCT/);
    assert.doesNotMatch(prompt, /ON-IMAGE HEADLINE/);
    assert.doesNotMatch(prompt, /on-image marketing copy/i);
    assert.doesNotMatch(prompt, /all marketing typography/i);
    assert.match(prompt, /Photoreal|NOT comic/i);
  });

  it("motion poster still honors cartoon-3d medium without demanding type", () => {
    const prompt = buildMotionPosterStillPrompt(
      {
        product: "yoga class",
        headline: "Weekend reset",
        subline: "",
        framing: "auto",
        market: "hk",
        artStyle: "cartoon-3d",
      },
      { conceptMode: true },
    );
    assert.match(prompt, /Pixar|3D illustrated|soft CGI/i);
    assert.doesNotMatch(prompt, /NOT comic, NOT webtoon/);
    assert.doesNotMatch(prompt, /all marketing typography/i);
    assert.doesNotMatch(prompt, /on-image marketing copy/i);
    assert.match(prompt, /no readable writing/i);
  });

  it("end still requires exact on-image type and allows a new product pose", () => {
    const prompt = buildMotionPosterEndStillPrompt({
      product: "金砂石手串",
      headline: "招財",
      subline: "今日試戴",
      offer: "立即選購",
      framing: "auto",
      market: "hk",
      artStyle: "realistic",
    });
    assert.match(prompt, /END keyframe|尾帧/i);
    assert.match(prompt, /ON-IMAGE HEADLINE/);
    assert.match(prompt, /masthead/i);
    assert.match(prompt, /招財/);
    assert.match(prompt, /rotate|tilt|float|settle/i);
    assert.doesNotMatch(prompt, /TEXTLESS SCENE PLATE/);
  });
});
