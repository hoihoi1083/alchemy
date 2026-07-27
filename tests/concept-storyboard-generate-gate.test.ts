import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wizardPromoteName } from "../lib/wizard-promote-name";

/**
 * Mirrors concept-storyboard branch of canGenerateImage() in useStudioWizard.
 * Kept here so research / conceptIdea-only flows stay unblocked.
 */
function canGenerateConceptStoryboardImage(input: {
  product?: string;
  headline?: string;
  conceptIdea?: string;
}): boolean {
  return Boolean(
    wizardPromoteName({
      promotionMode: "concept",
      product: input.product,
      headline: input.headline,
      conceptIdea: input.conceptIdea,
    }),
  );
}

describe("concept storyboard generate gate", () => {
  it("allows research / conceptIdea without headline or plan brief", () => {
    assert.equal(
      canGenerateConceptStoryboardImage({ conceptIdea: "花小錢也能爽玩首爾" }),
      true,
    );
  });

  it("allows headline-only promote name", () => {
    assert.equal(
      canGenerateConceptStoryboardImage({ headline: "男生戴水晶" }),
      true,
    );
  });

  it("blocks when no promote name at all", () => {
    assert.equal(canGenerateConceptStoryboardImage({}), false);
    assert.equal(
      canGenerateConceptStoryboardImage({ conceptIdea: "  ", headline: "" }),
      false,
    );
  });
});
