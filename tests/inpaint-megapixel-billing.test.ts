import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateInpaintTokens, TOKEN_COST } from "../lib/billing/token-costs";

describe("estimateInpaintTokens", () => {
  it("bills at least 1 megapixel (41 tok)", () => {
    assert.equal(estimateInpaintTokens(0.3), TOKEN_COST.inpaint);
    assert.equal(estimateInpaintTokens(1), 41);
  });

  it("rounds megapixels up (fal $0.05/MP)", () => {
    assert.equal(estimateInpaintTokens(1.1), 82);
    assert.equal(estimateInpaintTokens(2), 82);
    assert.equal(estimateInpaintTokens(4), 164);
  });
});
