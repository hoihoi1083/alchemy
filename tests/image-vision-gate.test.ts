import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWizardImageExpectation,
  hasGarbledTextIssue,
  hasTextlessTypographyViolation,
  visionGateBlocksShipIt,
  visionReviewNeedsAttention,
  wizardImageMustAvoid,
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

  it("detects textless typography violations from vision issues", () => {
    assert.equal(
      hasTextlessTypographyViolation({
        matchesExpectation: false,
        score: 45,
        summary: "Has a large headline",
        positives: [],
        issues: ["Overlaid campaign headline at top of frame"],
      }),
      true,
    );
    assert.equal(
      hasTextlessTypographyViolation({
        matchesExpectation: true,
        score: 90,
        summary: "Clean product plate",
        positives: ["No campaign type"],
        issues: [],
      }),
      false,
    );
  });

  it("textless expectation does not quote the user headline", () => {
    const expectation = buildWizardImageExpectation({
      product: "Power station",
      headline: "What Can You Actually Run?",
      imageTextMode: "textless",
    });
    assert.ok(expectation.includes("ZERO overlaid marketing typography"));
    assert.ok(!expectation.includes("What Can You Actually Run?"));
    assert.ok(
      wizardImageMustAvoid("textless").some((s) => /headline/i.test(s)),
    );
  });
});
