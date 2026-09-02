import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExplosionUnboxCreativeBrief,
  buildExplosionUnboxVideoPrompt,
  extractExplosionUnboxTheme,
  prefillExplosionUnboxFields,
} from "../lib/explosion-unbox-prompt";

describe("explosion-unbox-prompt", () => {
  it("extracts theme from concept idea first", () => {
    assert.equal(
      extractExplosionUnboxTheme({ conceptIdea: "McDonald's fun meal", headline: "Other" }),
      "McDonald's fun meal",
    );
  });

  it("builds JSON brief with theme embedded", () => {
    const brief = buildExplosionUnboxCreativeBrief("Spider-Man bedroom");
    assert.match(brief, /Spider-Man bedroom/);
    assert.match(brief, /"camera":/);
    assert.doesNotMatch(brief, /Reply next/i);
  });

  it("builds deterministic video prompt without text in frame", () => {
    const prompt = buildExplosionUnboxVideoPrompt("Tom and Jerry");
    assert.match(prompt, /Tom and Jerry/);
    assert.match(prompt, /No on-screen text/i);
  });

  it("prefill bundles concept, brief, and prompt", () => {
    const pack = prefillExplosionUnboxFields("neon cyber cafe");
    assert.equal(pack.conceptIdea, "neon cyber cafe");
    assert.match(pack.creativeVideoBrief, /neon cyber cafe/);
    assert.match(pack.videoPrompt, /neon cyber cafe/);
  });
});
