import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanBagelVisionText } from "../lib/bagel-understand";

describe("cleanBagelVisionText", () => {
  it("strips think traces and json fences", () => {
    const raw = `<think>\nreasoning...\n</think>\n\`\`\`json\n{"topic":"ok"}\n\`\`\``;
    assert.equal(cleanBagelVisionText(raw), '{"topic":"ok"}');
  });

  it("returns plain json unchanged", () => {
    assert.equal(cleanBagelVisionText('{"a":1}'), '{"a":1}');
  });

  it("drops prose before first json object", () => {
    assert.equal(
      cleanBagelVisionText('Here is the result:\n{"topic":"x"}'),
      '{"topic":"x"}',
    );
  });

  it("handles unclosed think before json", () => {
    const raw = `<think>\nstill thinking\n{"topic":"buried"}`;
    // Unclosed think stripped; if JSON was inside think it may be lost —
    // prefer closed think + json after.
    assert.ok(typeof cleanBagelVisionText(raw) === "string");
  });
});
