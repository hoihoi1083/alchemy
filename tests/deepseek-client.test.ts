import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDeepSeekErrorMessage,
  sanitizeDeepSeekMessageText,
} from "../lib/deepseek-client";

describe("sanitizeDeepSeekMessageText", () => {
  it("removes lone low surrogates that break DeepSeek JSON parsing", () => {
    const loneLow = "\udd0b";
    const cleaned = sanitizeDeepSeekMessageText(`露營${loneLow}都成問題`);
    assert.equal(cleaned, "露營都成問題");
  });

  it("keeps valid surrogate pairs (emoji)", () => {
    const emoji = "🔋";
    assert.equal(sanitizeDeepSeekMessageText(`power ${emoji}`), `power ${emoji}`);
  });
});

describe("parseDeepSeekErrorMessage", () => {
  it("returns API error message when present", () => {
    const msg = parseDeepSeekErrorMessage(
      JSON.stringify({ error: { message: "Model not found" } }),
      400,
    );
    assert.equal(msg, "Model not found");
  });

  it("falls back to generic planning message", () => {
    const msg = parseDeepSeekErrorMessage("not json", 400);
    assert.equal(msg, "Planning failed (400). Please try again later.");
  });
});
