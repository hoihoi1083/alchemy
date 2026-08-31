import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  estimateKlingStoryboardTokens,
  klingClipTokens,
  KLING_TURBO_PRO,
} from "../lib/billing/token-costs";
import {
  isStoryboardGridApprovedFlag,
  klingClipDurationForScene,
  klingClipDurationForStoryboard,
  klingSceneMotionPrompt,
} from "../lib/kling-storyboard-fallback";

describe("Kling storyboard fallback billing", () => {
  it("prices 5s and 10s clips from fal Turbo Pro rates", () => {
    assert.equal(klingClipTokens(5), KLING_TURBO_PRO.tokens5s);
    assert.equal(klingClipTokens(5), 284);
    assert.equal(klingClipTokens(10), 284 + 57 * 5);
    assert.equal(klingClipTokens(10), 569);
  });

  it("estimates N scenes × clip length", () => {
    assert.equal(estimateKlingStoryboardTokens(4, 5), 1136);
    assert.equal(estimateKlingStoryboardTokens(4, 10), 2276);
    assert.equal(estimateKlingStoryboardTokens(1, 5), 284);
  });
});

describe("Kling storyboard clip duration helpers", () => {
  it("maps scene span to 5 or 10 seconds", () => {
    assert.equal(klingClipDurationForScene(0, 2), 5);
    assert.equal(klingClipDurationForScene(0, 5), 5);
    assert.equal(klingClipDurationForScene(0, 6), 10);
    assert.equal(klingClipDurationForScene(2, 10), 10);
  });

  it("picks default clip length from total duration / scene count", () => {
    assert.equal(klingClipDurationForStoryboard(4, 8), 5);
    assert.equal(klingClipDurationForStoryboard(2, 12), 10);
    assert.equal(klingClipDurationForStoryboard(1, 8), 10);
  });

  it("builds a motion prompt that preserves identity", () => {
    const prompt = klingSceneMotionPrompt({
      sceneIndex: 2,
      sceneCount: 4,
      sceneDescription: "女主角微笑看向鏡頭",
      theme: "週末咖啡",
    });
    assert.match(prompt, /scene 2\/4/i);
    assert.match(prompt, /週末咖啡/);
    assert.match(prompt, /女主角微笑/);
    assert.match(prompt, /Keep the same people/);
  });

  it("accepts only explicit storyboard approve flags", () => {
    assert.equal(isStoryboardGridApprovedFlag("1"), true);
    assert.equal(isStoryboardGridApprovedFlag("true"), true);
    assert.equal(isStoryboardGridApprovedFlag("YES"), true);
    assert.equal(isStoryboardGridApprovedFlag("0"), false);
    assert.equal(isStoryboardGridApprovedFlag(""), false);
    assert.equal(isStoryboardGridApprovedFlag(null), false);
    assert.equal(isStoryboardGridApprovedFlag(undefined), false);
  });

  it("forbids readable invented text in motion prompts", () => {
    const prompt = klingSceneMotionPrompt({
      sceneIndex: 1,
      sceneCount: 1,
      theme: "product demo",
      role: "hero",
    });
    assert.match(prompt, /do not invent.*readable text/i);
    assert.match(prompt, /CRITICAL/i);
  });
});

describe("storyboard approve gate (per-cell + checkbox, no regen-all skip)", () => {
  const root = process.cwd();

  it("API rejects video before charge unless storyboard_grid_approved", () => {
    const src = readFileSync(
      join(root, "app/api/generate-storyboard-video/route.ts"),
      "utf8",
    );
    const approveAt = src.indexOf("isStoryboardGridApprovedFlag");
    const chargeAt = src.indexOf("await chargeTokens");
    assert.ok(approveAt > 0, "must check approve flag");
    assert.ok(chargeAt > approveAt, "approve must run before charge");
  });

  it("wizard generateVideo + storyboard POST send the approve flag", () => {
    const src = readFileSync(join(root, "hooks/useStudioWizard.ts"), "utf8");
    assert.match(src, /isStoryboardOutput && !storyboardGridApproved/);
    assert.match(src, /fd\.set\("storyboard_grid_approved"/);
    assert.match(src, /storyboardApproveRequiredHint/);
  });

  it("hides storyboard regen-all; keeps per-cell regen + approve checkbox", () => {
    const gallery = readFileSync(
      join(root, "components/studio/ImageReviewGallery.tsx"),
      "utf8",
    );
    const micro = readFileSync(
      join(root, "components/studio/micro-wizard/MicroWizard.tsx"),
      "utf8",
    );
    assert.match(gallery, /view\.kind !== "storyboard"/);
    assert.match(gallery, /isStoryboardReview \? undefined : handleRegenerateAll/);
    assert.match(gallery, /regenerateStoryboardSceneWithAi/);
    assert.match(gallery, /storyboardGridApproved/);
    assert.match(micro, /isCombinedSceneReview\s*\?\s*undefined/);
    const videoStep = readFileSync(
      join(root, "components/studio/VideoStep.tsx"),
      "utf8",
    );
    const preVideo = readFileSync(
      join(root, "components/studio/PreVideoSetupPanel.tsx"),
      "utf8",
    );
    assert.doesNotMatch(videoStep, /KlingStoryboardSettings/);
    assert.doesNotMatch(preVideo, /KlingStoryboardSettings/);
  });
});
