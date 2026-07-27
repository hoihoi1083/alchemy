import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateImageTokens } from "../lib/billing/token-costs";
import {
  buildStoryboardEndCardLogoModeAPrompt,
  buildStoryboardEndCardStillPrompt,
  buildStoryboardLogoModeAPrompt,
} from "../lib/image-refine-prompt";

describe("storyboard Mode A billing + prompt", () => {
  it("doubles tokens when passesPerScene is 2", () => {
    const base = estimateImageTokens({ mode: "storyboard", sceneCount: 4, passesPerScene: 1 });
    const modeA = estimateImageTokens({ mode: "storyboard", sceneCount: 4, passesPerScene: 2 });
    assert.equal(modeA, base * 2);
  });

  it("Mode A prompt keeps still + exact logo", () => {
    const p = buildStoryboardLogoModeAPrompt();
    assert.match(p, /IMAGE 1/);
    assert.match(p, /IMAGE 2/);
    assert.match(p, /exact/i);
    assert.match(p, /gibberish/i);
  });

  it("end card still leaves center empty for brand logo", () => {
    const p = buildStoryboardEndCardStillPrompt("alchemy");
    assert.match(p, /END CARD|end card/i);
    assert.match(p, /CENTER|center/);
    assert.match(p, /NO readable text|NO fake logos/i);
  });

  it("end card Mode A prompt centers brand logo as hero", () => {
    const p = buildStoryboardEndCardLogoModeAPrompt();
    assert.match(p, /CENTERED|centered/);
    assert.match(p, /HERO|hero/);
    assert.match(p, /exact/i);
  });
});
