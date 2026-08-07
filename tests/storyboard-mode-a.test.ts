import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateImageTokens } from "../lib/billing/token-costs";
import { buildStoryboardLogoModeAPrompt } from "../lib/image-refine-prompt";

describe("storyboard Mode A billing + prompt", () => {
  it("doubles tokens when passesPerScene is 2", () => {
    const base = estimateImageTokens({ mode: "storyboard", sceneCount: 4, passesPerScene: 1 });
    const modeA = estimateImageTokens({ mode: "storyboard", sceneCount: 4, passesPerScene: 2 });
    assert.equal(modeA, base * 2);
  });

  it("Mode A prompt keeps still + exact logo with natural placement", () => {
    const p = buildStoryboardLogoModeAPrompt();
    assert.match(p, /IMAGE 1/);
    assert.match(p, /IMAGE 2/);
    assert.match(p, /exact/i);
    assert.match(p, /gibberish/i);
    assert.match(p, /natural|you choose/i);
    assert.doesNotMatch(p, /END CARD|centered hero/i);
  });
});
