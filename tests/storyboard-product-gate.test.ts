import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors generate-storyboard-images product gate (concept never requires product photo). */
function storyboardRequiresProductPhoto(
  promotionMode: "physical" | "concept",
  hasProduct: boolean,
): boolean {
  if (hasProduct) return false;
  return promotionMode !== "concept";
}

describe("storyboard product photo gate", () => {
  it("concept mode allows no product photo even with style reference", () => {
    assert.equal(storyboardRequiresProductPhoto("concept", false), false);
  });

  it("physical mode requires product photo", () => {
    assert.equal(storyboardRequiresProductPhoto("physical", false), true);
    assert.equal(storyboardRequiresProductPhoto("physical", true), false);
  });
});
