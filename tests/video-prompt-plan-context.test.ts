import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendArtStyleSeedanceHintIfNeeded } from "../lib/art-style";
import { videoPlannerContextBlock } from "../lib/video-prompt-plan";

describe("videoPlannerContextBlock", () => {
  it("includes art style and stylized guard for anime", () => {
    const block = videoPlannerContextBlock({
      artStyleId: "anime-2d",
      subjectFraming: "hands-only",
      promptExtra: "Style-only reference: meme energy",
    }).join("\n");
    assert.match(block, /anime/i);
    assert.match(block, /stylized medium/i);
    assert.match(block, /hands holding the product/i);
    assert.match(block, /Style-only reference/);
  });

  it("omits framing line when auto", () => {
    const block = videoPlannerContextBlock({ subjectFraming: "auto" }).join("\n");
    assert.doesNotMatch(block, /Framing preference/);
  });
});

describe("appendArtStyleSeedanceHintIfNeeded", () => {
  it("appends stylized hint once", () => {
    const out = appendArtStyleSeedanceHintIfNeeded(
      "Slow push-in on product.",
      "cartoon-3d",
    );
    assert.match(out, /Pixar-style/i);
    const again = appendArtStyleSeedanceHintIfNeeded(out, "cartoon-3d");
    assert.equal(again, out);
  });

  it("leaves realistic prompts unchanged aside from trim", () => {
    const p = "Slow push-in on product.";
    assert.equal(appendArtStyleSeedanceHintIfNeeded(p, "realistic"), p);
  });
});
