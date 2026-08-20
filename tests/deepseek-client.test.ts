import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDeepSeekErrorMessage } from "../lib/deepseek-client";

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
