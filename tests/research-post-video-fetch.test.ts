import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedResearchVideoUrl } from "../lib/research-post-video-fetch";

describe("isAllowedResearchVideoUrl", () => {
  it("allows XHS sns-video xhscdn stream MP4", () => {
    assert.equal(
      isAllowedResearchVideoUrl(
        "http://sns-video-v3.xhscdn.com/stream/110/258/foo_258.mp4?sign=abc",
      ),
      true,
    );
  });

  it("allows XHS rednotecdn stream MP4 from note-detail resolve", () => {
    assert.equal(
      isAllowedResearchVideoUrl(
        "https://sns-v14-ae.rednotecdn.com/stream/1/110/258/01e9aeac8bc5a48d010370019cd25264bc_258.mp4?sign=57a3c50e42a4b6b18e34b96333237ccb&t=6a543bbe",
      ),
      true,
    );
  });

  it("rejects arbitrary hosts", () => {
    assert.equal(isAllowedResearchVideoUrl("https://evil.example.com/video.mp4"), false);
  });
});
