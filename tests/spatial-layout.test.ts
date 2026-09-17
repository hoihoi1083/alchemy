import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveSpatialLayoutDialect,
  SPATIAL_LAYOUT_DIALECT_IDS,
  spatialLayoutDialectClause,
} from "../lib/spatial-layout";
import { isLockedSinglePosterStyle } from "../lib/visual-styles";
import {
  buildSpatialLayoutImagePrompt,
  buildPromptVariables,
  resolveImagePromptMode,
} from "../lib/prompt-variables";
import { shouldPlanSingleImageAd } from "../lib/single-image-plan";
import { visualStyleAllowedForPromotion } from "../lib/promotion-styles";
import { conceptCopyFocusKeyForStyle } from "../lib/concept-copy-focus";

describe("spatial-layout style", () => {
  it("has four dialects and resolves cues", () => {
    assert.equal(SPATIAL_LAYOUT_DIALECT_IDS.length, 4);
    assert.equal(resolveSpatialLayoutDialect("auto", "void carve opening"), "void");
    assert.equal(resolveSpatialLayoutDialect("auto", "corner wrap"), "corner");
    assert.equal(resolveSpatialLayoutDialect("auto", "extrude mass"), "extrude");
    assert.equal(resolveSpatialLayoutDialect("auto", "between planes"), "planes");
  });

  it("is locked single still for product and concept", () => {
    assert.equal(isLockedSinglePosterStyle("spatial-layout"), true);
    assert.equal(shouldPlanSingleImageAd("spatial-layout"), false);
    assert.equal(visualStyleAllowedForPromotion("spatial-layout", "physical"), true);
    assert.equal(visualStyleAllowedForPromotion("spatial-layout", "concept"), true);
    assert.equal(conceptCopyFocusKeyForStyle("spatial-layout"), "spatial-layout");
  });

  it("resolves specialized prompt mode with architectural DNA", () => {
    assert.equal(resolveImagePromptMode("spatial-layout", "promo-ai"), "spatial-layout");
    const vars = buildPromptVariables({
      product: "Serum",
      headline: "VOID",
      subline: "STEP THROUGH",
      market: "en",
      framing: "auto",
      artStyle: "realistic",
    });
    const prompt = buildSpatialLayoutImagePrompt(vars, "void");
    assert.match(prompt, /SPATIAL-LAYOUT/);
    assert.match(prompt, /SOLID \/ VOID/);
    assert.match(prompt, /Single 9:16/);
    assert.match(spatialLayoutDialectClause("planes"), /BETWEEN PLANES/);
  });
});
