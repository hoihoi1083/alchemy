import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferFormatFromPost,
  inferWizardFromPost,
  isImageCarouselAngle,
  resolveFormatForAngleApply,
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

  it("video post → reel routing by promotion mode", () => {
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
    const physical = inferWizardFromPost(post, "physical");
    assert.equal(physical.workflowMode, "combined");
    assert.equal(physical.visualStyleId, "storyboard-video");
    const concept = inferWizardFromPost(post, "concept");
    assert.equal(concept.workflowMode, "video-only");
    assert.equal(concept.visualStyleId, "creative-video");
  });

  it("isImageCarouselAngle", () => {
    assert.equal(isImageCarouselAngle("teaching-carousel", 8), true);
    assert.equal(isImageCarouselAngle("reel", 0), false);
  });

  it("multi-image post with stray videoUrl stays teaching-carousel", () => {
    const post: ContentResearchPost = {
      id: "x2",
      title: "首爾4天3晚攻略",
      url: "https://xhs.com/x2",
      snippet: "攻略",
      imageUrls: Array.from({ length: 6 }, (_, i) => `https://img/${i}.jpg`),
      videoUrl: "https://example.com/stray.mp4",
      mediaType: "image",
      platform: "xiaohongshu",
    };
    assert.equal(inferFormatFromPost(post), "teaching-carousel");
  });

  it("resolveFormatForAngleApply pins teaching-carousel card label", () => {
    const angle = {
      id: "deepseek-carousel-1",
      format: "teaching-carousel" as const,
      sourceImageUrls: Array.from({ length: 6 }, (_, i) => `https://img/${i}.jpg`),
      sourceVideoUrl: "https://example.com/stray.mp4",
      sourceCoverImageUrl: "https://img/0.jpg",
    };
    const inferred = inferWizardFromPost(
      {
        id: "abc",
        title: "攻略",
        url: "https://xhs.com/x2",
        snippet: "",
        videoUrl: "https://example.com/ref.mp4",
        mediaType: "video",
        platform: "xiaohongshu",
      },
      "concept",
    );
    assert.equal(inferred.format, "reel");
    assert.equal(resolveFormatForAngleApply(angle, inferred), "teaching-carousel");
  });
});
