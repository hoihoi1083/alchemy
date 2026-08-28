import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESEARCH_UI_PLATFORMS,
  intakePathForTab,
  intakeTabFromPath,
  researchUiPlatforms,
} from "@/lib/wizard-intake-contract";

describe("wizard-intake-contract", () => {
  it("excludes TikTok from default/image research platforms", () => {
    assert.ok(!RESEARCH_UI_PLATFORMS.includes("tiktok"));
    assert.deepEqual([...RESEARCH_UI_PLATFORMS], [
      "xiaohongshu",
      "instagram",
    ]);
  });

  it("includes TikTok only for video / combined workflows", () => {
    assert.ok(!researchUiPlatforms("image-only").includes("tiktok"));
    assert.ok(researchUiPlatforms("video-only").includes("tiktok"));
    assert.ok(researchUiPlatforms("combined").includes("tiktok"));
    assert.deepEqual([...researchUiPlatforms("video-only")], [
      "xiaohongshu",
      "instagram",
      "tiktok",
    ]);
  });

  it("maps research/template tabs to intake paths", () => {
    assert.equal(intakePathForTab("research"), "research");
    assert.equal(intakePathForTab("template"), "direct");
    assert.equal(intakeTabFromPath("research"), "research");
    assert.equal(intakeTabFromPath("direct"), "template");
    assert.equal(intakeTabFromPath(null), null);
  });
});
