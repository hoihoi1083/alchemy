import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angleMatchesMediaFilter,
  filterPostsByMedia,
  mediaFilterFromWorkflowMode,
  mediaFilterMismatchMessage,
  platformMediaMismatch,
  postMatchesMediaFilter,
} from "../lib/content-research-media-filter";
import type { ContentResearchPost } from "../lib/content-research-types";

const imagePost: ContentResearchPost = {
  id: "1",
  title: "carousel",
  url: "https://xhs.com/1",
  snippet: "",
  coverImageUrl: "https://img/1.jpg",
  imageUrls: ["https://img/1.jpg", "https://img/2.jpg"],
  mediaType: "image",
  platform: "xiaohongshu",
};

const videoPost: ContentResearchPost = {
  id: "2",
  title: "reel",
  url: "https://tiktok.com/2",
  snippet: "",
  videoUrl: "https://v/2.mp4",
  mediaType: "video",
  platform: "tiktok",
};

describe("content-research-media-filter", () => {
  it("workflow mode maps to filter", () => {
    assert.equal(mediaFilterFromWorkflowMode("image-only"), "image");
    assert.equal(mediaFilterFromWorkflowMode("video-only"), "video");
    assert.equal(mediaFilterFromWorkflowMode("combined"), undefined);
  });

  it("filters image vs video posts", () => {
    const posts = [imagePost, videoPost];
    assert.deepEqual(filterPostsByMedia(posts, "image"), [imagePost]);
    assert.deepEqual(filterPostsByMedia(posts, "video"), [videoPost]);
  });

  it("postMatchesMediaFilter distinguishes types", () => {
    assert.equal(postMatchesMediaFilter(imagePost, "image"), true);
    assert.equal(postMatchesMediaFilter(videoPost, "image"), false);
    assert.equal(postMatchesMediaFilter(videoPost, "video"), true);
  });

  it("mediaFilterMismatchMessage does not call image-only posts video when images missing", () => {
    const sparseImage: ContentResearchPost = {
      id: "3",
      title: "partial",
      url: "https://xhs.com/3",
      snippet: "",
      mediaType: "image",
      platform: "xiaohongshu",
    };
    const msg = mediaFilterMismatchMessage(sparseImage, "image");
    assert.ok(!msg.includes("This post is a video"));
    assert.ok(msg.includes("Could not load images"));
  });

  it("tiktok blocked for image-only research", () => {
    assert.equal(platformMediaMismatch("tiktok", "image"), "tiktok-image");
    assert.equal(platformMediaMismatch("xiaohongshu", "image"), null);
  });

  it("angle format matches workflow filter", () => {
    assert.equal(angleMatchesMediaFilter("teaching-carousel", "image"), true);
    assert.equal(angleMatchesMediaFilter("reel", "image"), false);
    assert.equal(angleMatchesMediaFilter("reel", "video"), true);
  });
});
