import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTENT_PLATFORMS,
  type ContentResearchPost,
} from "../lib/content-research-types";
import {
  angleMatchesMediaFilter,
  filterPostsByMedia,
  mediaFilterFromWorkflowMode,
  platformMediaMismatch,
} from "../lib/content-research-media-filter";
import { inferFormatFromPost } from "../lib/content-research-infer";
import { WORKFLOW_MODES, stepsForMode } from "../lib/workflow-mode";

describe("platform × workflow UX logic", () => {
  it("every workflow mode has valid step sequence", () => {
    for (const mode of WORKFLOW_MODES) {
      const steps = stepsForMode(mode);
      assert.ok(steps.includes("setup"));
      assert.ok(steps[steps.length - 1] === "done" || steps.includes("video"));
      if (mode === "combined") {
        assert.deepEqual(steps, ["setup", "image", "video", "done"]);
      }
      if (mode === "video-only") {
        assert.deepEqual(stepsForMode("video-only", { storyboardKeyframes: true }), [
          "setup",
          "image",
          "video",
          "done",
        ]);
      }
    }
  });

  it("workflow picker syncs research media filter", () => {
    assert.equal(mediaFilterFromWorkflowMode("image-only"), "image");
    assert.equal(mediaFilterFromWorkflowMode("video-only"), "video");
    assert.equal(mediaFilterFromWorkflowMode("combined"), undefined);
  });

  for (const platform of CONTENT_PLATFORMS) {
    it(`platform ${platform}: image filter blocks video posts`, () => {
      const videoPost: ContentResearchPost = {
        id: "v",
        title: "clip",
        url: "https://example.com/v",
        snippet: "",
        videoUrl: "https://v.mp4",
        mediaType: "video",
        platform,
      };
      const imagePost: ContentResearchPost = {
        id: "i",
        title: "still",
        url: "https://example.com/i",
        snippet: "",
        coverImageUrl: "https://img.jpg",
        mediaType: "image",
        platform,
      };
      assert.equal(filterPostsByMedia([videoPost, imagePost], "image").length, 1);
      assert.equal(filterPostsByMedia([videoPost, imagePost], "video").length, 1);
    });
  }

  it("tiktok image-only shows UX warning", () => {
    assert.equal(platformMediaMismatch("tiktok", "image"), "tiktok-image");
    assert.equal(platformMediaMismatch("xiaohongshu", "image"), null);
  });

  it("reel angles hidden in image-only research", () => {
    assert.equal(angleMatchesMediaFilter("reel", "image"), false);
    assert.equal(angleMatchesMediaFilter("teaching-carousel", "image"), true);
    assert.equal(angleMatchesMediaFilter("reel", "video"), true);
  });

  it("multi-image posts on each platform infer carousel or single", () => {
    for (const platform of CONTENT_PLATFORMS) {
      const carousel: ContentResearchPost = {
        id: "c",
        title: "攻略教程",
        url: "https://example.com/c",
        snippet: "懶人包",
        imageUrls: ["a", "b", "c", "d"],
        platform,
      };
      const fmt = inferFormatFromPost(carousel);
      assert.ok(
        fmt === "teaching-carousel" || fmt === "campaign" || fmt === "single-image",
        `${platform} got ${fmt}`,
      );
    }
  });
});
