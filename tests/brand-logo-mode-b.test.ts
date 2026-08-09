import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brandKitLogoImagePromptBlock,
  brandLogoPreserveInVideoPrompt,
} from "../lib/brand-merge";
import { klingSceneMotionPrompt } from "../lib/kling-storyboard-fallback";

describe("Mode B brand logo prompts", () => {
  it("brandKitLogoImagePromptBlock references IMAGE N and exact geometry", () => {
    const block = brandKitLogoImagePromptBlock(3);
    assert.match(block, /IMAGE 3/);
    assert.match(block, /REAL logo|exact|pixel-faithful/i);
    assert.match(block, /natural/i);
    assert.doesNotMatch(block, /do not AI-composite/i);
  });

  it("video preserve prompt keeps existing mark", () => {
    const p = brandLogoPreserveInVideoPrompt();
    assert.match(p, /preserve/i);
    assert.match(p, /logo/i);
  });

  it("Kling motion preserves logo already in still", () => {
    const p = klingSceneMotionPrompt({
      sceneIndex: 1,
      sceneCount: 4,
      sceneDescription: "自动生成可编辑 Prompt",
      theme: "launch",
      role: "edit",
    });
    assert.match(p, /brand logo|logo/i);
    assert.match(p, /preserve|Preserve/i);
    assert.doesNotMatch(p, /自动生成|Prompt/);
    assert.match(p, /Camera:/);
    assert.match(p, /orbit|push|drift|motion/i);
  });

  it("asks Kling to blur accidental gibberish text", () => {
    const p = klingSceneMotionPrompt({
      sceneIndex: 2,
      sceneCount: 4,
      theme: "demo",
    });
    assert.match(p, /FALLBACK|heavily out-of-focus|unreadable/i);
  });

  it("retired END CARD beat stays off; logo opt-in preserves the mark in-still", () => {
    const off = klingSceneMotionPrompt({
      sceneIndex: 6,
      sceneCount: 6,
      role: "cta",
      theme: "alchemy",
    });
    assert.doesNotMatch(off, /END CARD/);

    const p = klingSceneMotionPrompt({
      sceneIndex: 6,
      sceneCount: 6,
      role: "cta",
      theme: "alchemy",
      endWithBrandLogo: true,
      useBrandLogo: true,
    });
    assert.doesNotMatch(p, /END CARD/);
    assert.match(p, /corner brand logo badge|second mark or slogan/i);
    assert.match(p, /push-in|parallax/i);
  });
});
