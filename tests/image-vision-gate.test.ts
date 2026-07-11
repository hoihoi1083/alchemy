import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasGarbledTextIssue,
  visionGateBlocksShipIt,
  visionReviewNeedsAttention,
} from "../lib/image-vision-gate";

describe("image-vision-gate", () => {
  it("flags garbled text issues", () => {
    assert.equal(
      hasGarbledTextIssue({
        matchesExpectation: false,
        score: 40,
        summary: "bad",
        positives: [],
        issues: ["Garbled on-image Chinese characters"],
      }),
      true,
    );
  });

  it("warns when score is low", () => {
    assert.equal(
      visionReviewNeedsAttention({
        matchesExpectation: false,
        score: 60,
        summary: "off",
        positives: [],
        issues: ["wrong background"],
      }),
      true,
    );
  });

  it("blocks ship-it on garbled text", () => {
    assert.equal(
      visionGateBlocksShipIt({
        matchesExpectation: true,
        score: 90,
        summary: "ok",
        positives: [],
        issues: ["Misspelled headline text"],
      }),
      true,
    );
  });
});
