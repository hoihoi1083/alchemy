import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildImageRefinePrompt } from "../lib/image-refine-prompt";

describe("buildImageRefinePrompt", () => {
  it("routes text style edits to typography instructions", () => {
    const prompt = buildImageRefinePrompt("Make the headline text larger and bold");
    assert.ok(prompt.includes("typography"));
    assert.ok(!prompt.includes("Remove all requested on-image text"));
  });

  it("routes explicit text removal to repaint instructions", () => {
    const prompt = buildImageRefinePrompt("Remove all on-image text and logos");
    assert.ok(prompt.includes("Remove all requested on-image text"));
    assert.ok(!prompt.includes("Update only the on-image typography"));
  });

  it("keeps general edits on the default preservation branch", () => {
    const prompt = buildImageRefinePrompt("Make the lighting warmer and softer");
    assert.ok(prompt.includes("Keep the same layout, product, colors, and framing"));
    assert.ok(!prompt.includes("typography"));
  });
});
