import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendCompositionToExtra,
  compositionBlocksForPrompt,
  detectCompositionPresetFromExtra,
  prepareCompositionForImagePrompt,
  stripCompositionClauseFromExtra,
} from "../lib/composition-presets";
import { buildConceptSocialImagePrompt, buildPromptVariables } from "../lib/prompt-variables";

describe("composition presets", () => {
  it("returns fisheye blocks for comic-webtoon", () => {
    const blocks = compositionBlocksForPrompt("fisheye-hero", "comic-webtoon");
    assert.ok(blocks);
    assert.match(blocks!.camera, /barrel distortion/i);
    assert.match(blocks!.hero, /foreground/i);
    assert.match(blocks!.avoid, /straight parallel/i);
  });

  it("ignores fisheye for photoreal art style", () => {
    assert.equal(compositionBlocksForPrompt("fisheye-hero", "realistic"), null);
  });

  it("detects fisheye from appended extra", () => {
    const extra = appendCompositionToExtra("", "fisheye-hero", "comic-webtoon");
    assert.equal(detectCompositionPresetFromExtra(extra), "fisheye-hero");
    assert.equal(
      stripCompositionClauseFromExtra(extra),
      "",
    );
  });

  it("injects fisheye camera block into concept-social prompt", () => {
    const vars = buildPromptVariables({
      product: "Alchemy AI Lab",
      headline: "什麼是 Alchemy AI Lab",
      market: "hk",
      framing: "auto",
      artStyle: "comic-webtoon",
      compositionPreset: "fisheye-hero",
    });
    const prompt = buildConceptSocialImagePrompt(vars);
    assert.match(prompt, /MANDATORY CAMERA \/ LENS: extreme fisheye/i);
    assert.match(prompt, /barrel distortion/i);
    assert.match(prompt, /HERO: oversized hand/i);
    assert.doesNotMatch(prompt, /COMPOSITION_PRESET: fisheye-hero/);
  });

  it("prepareComposition strips clause from extra for image prompt", () => {
    const extra = appendCompositionToExtra(
      "soft pink lab lighting",
      "fisheye-hero",
      "anime-2d",
    );
    const prepared = prepareCompositionForImagePrompt({
      artStyle: "anime-2d",
      extra,
    });
    assert.equal(prepared.preset, "fisheye-hero");
    assert.ok(prepared.blocks);
    assert.equal(prepared.extraWithoutComposition, "soft pink lab lighting");
  });
});
