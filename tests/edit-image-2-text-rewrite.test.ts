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
    assert.match(p, /typography|style/i);
    assert.match(p, /magenta|#FF00FF/i);
    assert.match(p, /transparent|cut-out|empty/i);
    assert.match(p, /EXACTLY|exactly/);
    assert.match(p, /FORBIDDEN|blend|hybrid/i);
  });

  it("spells Chinese characters so hybrids like 動起充來 are discouraged", () => {
    const p = buildLayerTextRewritePrompt({
      newText: "動起來",
      oldText: "極速充電",
    });
    assert.match(p, /動起來/);
    assert.match(p, /「動」/);
    assert.match(p, /「起」/);
    assert.match(p, /「來」/);
    assert.match(p, /3 characters/);
    assert.doesNotMatch(p, /approximately/);
  });

  it("works without old text", () => {
    const p = buildLayerTextRewritePrompt({ newText: "新品上市" });
    assert.match(p, /新品上市/);
    assert.doesNotMatch(p, /approximately/);
  });
});
