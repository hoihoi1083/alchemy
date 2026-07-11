import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveReelResearchRouting } from "../lib/content-research-reel-routing";

describe("resolveReelResearchRouting", () => {
  it("physical combined → storyboard under image-to-video", () => {
    assert.equal(
      resolveReelResearchRouting("physical", "combined").visualStyleId,
      "storyboard-video",
    );
  });

  it("physical video-only → direct R2V product style", () => {
    assert.equal(resolveReelResearchRouting("physical", "video-only").visualStyleId, "product");
  });

  it("concept combined → storyboard under image-to-video", () => {
    assert.equal(
      resolveReelResearchRouting("concept", "combined").visualStyleId,
      "storyboard-video",
    );
  });

  it("concept video-only → direct R2V (no storyboard)", () => {
    assert.equal(resolveReelResearchRouting("concept", "video-only").visualStyleId, "product");
  });
});
