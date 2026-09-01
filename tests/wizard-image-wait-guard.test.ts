import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideImageGenerateWait,
  decideVideoGenerateWait,
} from "../lib/wizard-image-wait-guard";

describe("decideImageGenerateWait", () => {
  it("holds on wait while regen is starting with stale output", () => {
    const decision = decideImageGenerateWait({
      guard: { imageGenKey: 3 },
      imageGenKey: 3,
      imageBusy: false,
      hasImageOutput: true,
      error: null,
    });
    assert.equal(decision, "hold_stale");
  });

  it("advances after a new generation bumps imageGenKey", () => {
    const decision = decideImageGenerateWait({
      guard: { imageGenKey: 3 },
      imageGenKey: 4,
      imageBusy: false,
      hasImageOutput: true,
      error: null,
    });
    assert.equal(decision, "advance");
  });
});

describe("decideVideoGenerateWait", () => {
  it("holds while videoUrl is still the pre-regen value", () => {
    const decision = decideVideoGenerateWait({
      guard: { videoUrl: "https://example.com/old.mp4" },
      videoBusy: false,
      videoUrl: "https://example.com/old.mp4",
      error: null,
    });
    assert.equal(decision, "hold_stale");
  });
});
