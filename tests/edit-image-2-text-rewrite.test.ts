import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLayerTextRewritePrompt } from "../lib/edit-image-2-text-rewrite";

describe("edit-image-2 text rewrite prompt", () => {
  it("asks to keep style and change wording only", () => {
    const p = buildLayerTextRewritePrompt({
      newText: "HELLO",
      oldText: "RONALDO",
    });
    assert.match(p, /HELLO/);
    assert.match(p, /RONALDO/);
    assert.match(p, /typography/i);
    assert.match(p, /background/i);
  });

  it("works without old text", () => {
    const p = buildLayerTextRewritePrompt({ newText: "新品上市" });
    assert.match(p, /新品上市/);
    assert.doesNotMatch(p, /approximately/);
  });
});
