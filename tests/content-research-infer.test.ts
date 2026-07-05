import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferFormatFromPost,
  inferWizardFromPost,
  isImageCarouselAngle,
} from "../lib/content-research-infer";
import type { ContentResearchPost } from "../lib/content-research-types";

describe("content-research-infer", () => {
  it("8-image xhs post → teaching-carousel", () => {
    const post: ContentResearchPost = {
      id: "x1",
      title: "水晶攻略",
      url: "https://xhs.com/x1",
      snippet: "教程",
      imageUrls: Array.from({ length: 8 }, (_, i) => `https://img/${i}.jpg`),
      mediaType: "image",
      platform: "xiaohongshu",
    };
    assert.equal(inferFormatFromPost(post), "teaching-carousel");
    const inferred = inferWizardFromPost(post, "physical");
    assert.equal(inferred.imageOutputMode, "teaching-carousel");
    assert.equal(inferred.workflowMode, "image-only");
    assert.equal(inferred.carouselSlideCount, 6);
    assert.ok(inferred.referenceNote?.includes("style-only"));
  });

  it("video post → reel", () => {
    const post: ContentResearchPost = {
      id: "v1",
      title: "上手",
      url: "https://tiktok.com/v1",
      snippet: "",
      videoUrl: "https://v.mp4",
      mediaType: "video",
      platform: "tiktok",
    };
    assert.equal(inferFormatFromPost(post), "reel");
    const inferred = inferWizardFromPost(post, "physical");
    assert.equal(inferred.workflowMode, "video-only");
  });

  it("isImageCarouselAngle", () => {
    assert.equal(isImageCarouselAngle("teaching-carousel", 8), true);
    assert.equal(isImageCarouselAngle("reel", 0), false);
  });
});
