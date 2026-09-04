import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendUltraProToPrompt,
  DEFAULT_ULTRA_IMAGE_PRO,
  DEFAULT_ULTRA_VIDEO_PRO,
  canvasScriptUsesPlanQuota,
  estimateCanvasImageTokens,
  estimateCanvasScriptTokens,
  estimateCanvasSpliceTokens,
  estimateCanvasVideoTokens,
  isUltraVideoCameraAuto,
  ultraVideoCameraForApi,
  ULTRA_VIDEO_CAMERA_AUTO,
} from "../lib/ultra-pro-controls";

describe("ultra-pro-controls", () => {
  it("appends lighting, background, and art style to prompt", () => {
    const out = appendUltraProToPrompt("Hero product shot", {
      ...DEFAULT_ULTRA_IMAGE_PRO,
      lightingPreset: "neon_cyber",
      backgroundPreset: "gradient_dark",
      artStyleId: "cinematic",
    });
    assert.match(out, /Hero product shot/);
    assert.match(out, /Lighting:/);
    assert.match(out, /Background:/);
    assert.match(out, /cinematic/i);
  });

  it("uses custom lighting and background text", () => {
    const out = appendUltraProToPrompt("Test", {
      ...DEFAULT_ULTRA_IMAGE_PRO,
      lightingPreset: "custom",
      lightingCustom: "Moody red gel key light",
      backgroundPreset: "custom",
      backgroundCustom: "Rain-soaked alley",
    });
    assert.match(out, /Moody red gel key light/);
    assert.match(out, /Rain-soaked alley/);
  });

  it("estimates single image token cost", () => {
    assert.equal(estimateCanvasImageTokens(), 65);
  });

  it("estimates video tokens from duration and resolution", () => {
    assert.ok(
      estimateCanvasVideoTokens({ resolution: "480p", duration: "8", fast: true }) > 0,
    );
  });

  it("splice stitch is free; BGM mix charges only when audio connected", () => {
    assert.equal(estimateCanvasSpliceTokens({ hasMusic: false }), 0);
    assert.equal(estimateCanvasSpliceTokens({ hasMusic: true }), 5);
  });

  it("script plan uses plan quota not tokens", () => {
    assert.equal(estimateCanvasScriptTokens(), 0);
    assert.equal(canvasScriptUsesPlanQuota(), true);
  });

  it("defaults video camera to Auto and strips Auto for API", () => {
    assert.equal(DEFAULT_ULTRA_VIDEO_PRO.camera, ULTRA_VIDEO_CAMERA_AUTO);
    assert.equal(isUltraVideoCameraAuto("Auto"), true);
    assert.equal(isUltraVideoCameraAuto("auto follow"), true);
    assert.equal(isUltraVideoCameraAuto(""), true);
    assert.equal(isUltraVideoCameraAuto("Slow Push In"), false);
    assert.equal(ultraVideoCameraForApi("Auto"), "");
    assert.equal(ultraVideoCameraForApi("Slow Push In"), "Slow Push In");
  });
});
