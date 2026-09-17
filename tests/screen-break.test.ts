import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveScreenBreakDialect,
  SCREEN_BREAK_DIALECT_IDS,
  screenBreakDialectClause,
} from "../lib/screen-break";
import { isLockedSinglePosterStyle } from "../lib/visual-styles";
import {
  buildScreenBreakImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { shouldPlanSingleImageAd } from "../lib/single-image-plan";
import {
  conceptStyleAllowsTextOnlyImage,
  visualStyleAllowedForPromotion,
} from "../lib/promotion-styles";
import { conceptCopyFocusKeyForStyle } from "../lib/concept-copy-focus";

describe("screen-break style", () => {
  it("has four dialects and resolves cues", () => {
    assert.equal(SCREEN_BREAK_DIALECT_IDS.length, 4);
    assert.equal(resolveScreenBreakDialect("auto", "desert rock climb"), "phone-ground");
    assert.equal(resolveScreenBreakDialect("auto", "sneaker gold phone"), "phone-studio");
    assert.equal(resolveScreenBreakDialect("auto", "peek glasses"), "tear-peek");
    assert.equal(resolveScreenBreakDialect("auto", "reach tear profile"), "tear-reach");
  });

  it("is locked single still for product and concept", () => {
    assert.equal(isLockedSinglePosterStyle("screen-break"), true);
    assert.equal(shouldPlanSingleImageAd("screen-break"), false);
    assert.equal(visualStyleAllowedForPromotion("screen-break", "physical"), true);
    assert.equal(visualStyleAllowedForPromotion("screen-break", "concept"), true);
    assert.equal(conceptStyleAllowsTextOnlyImage("screen-break"), true);
    assert.equal(conceptCopyFocusKeyForStyle("screen-break"), "screen-break");
  });

  it("builds product vs concept mode blocks", () => {
    assert.equal(resolveImagePromptMode("screen-break", "promo-ai"), "screen-break");
    const vars = buildPromptVariables({
      product: "White sneaker",
      headline: "BREAK THE SCREEN",
      subline: "BE SEEN",
      market: "en",
      framing: "auto",
      artStyle: "realistic",
    });
    const productPrompt = buildScreenBreakImagePrompt(vars, "phone-studio", {
      conceptMode: false,
    });
    assert.match(productPrompt, /SCREEN-BREAK|破屏出界/);
    assert.match(productPrompt, /MODE — PRODUCT/);
    assert.match(productPrompt, /PHONE STUDIO/);
    assert.match(productPrompt, /SKU|product from IMAGE 1/i);

    const conceptPrompt = buildScreenBreakImagePrompt(vars, "tear-reach", {
      conceptMode: true,
    });
    assert.match(conceptPrompt, /MODE — CONCEPT/);
    assert.match(conceptPrompt, /No product photo required|no SKU/i);
    assert.match(screenBreakDialectClause("phone-ground"), /PHONE GROUND/);
  });
});
