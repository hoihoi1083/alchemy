import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSocialPackPlatform,
  sanitizeSocialPackAspectRatio,
  SOCIAL_PACK_PLATFORMS,
} from "@/lib/social-pack-plan";

describe("social-pack-plan", () => {
  it("parses allowed platforms and rejects tiktok", () => {
    assert.equal(parseSocialPackPlatform("instagram"), "instagram");
    assert.equal(parseSocialPackPlatform("RedNote"), null);
    assert.equal(parseSocialPackPlatform("xiaohongshu"), "xiaohongshu");
    assert.equal(parseSocialPackPlatform("tiktok"), null);
    assert.ok(!SOCIAL_PACK_PLATFORMS.includes("tiktok" as never));
  });

  it("sanitizes aspect ratios", () => {
    assert.equal(sanitizeSocialPackAspectRatio("4:5", "1:1"), "4:5");
    assert.equal(sanitizeSocialPackAspectRatio("nope", "3:4"), "3:4");
    assert.equal(sanitizeSocialPackAspectRatio("", "bad"), "4:5");
  });
});
