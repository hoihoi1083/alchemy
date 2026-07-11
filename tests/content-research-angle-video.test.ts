import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichAngleVideoFromPlan } from "../lib/content-research-angle-video";
import { reelAngle, xhsPlan } from "./fixtures/content-research";

describe("enrichAngleVideoFromPlan", () => {
  it("backfills sourceVideoUrl from plan posts by note id", () => {
    const plan = {
      ...xhsPlan,
      posts: [
        {
          id: "abc123def456789012345678",
          platform: "xiaohongshu" as const,
          title: "影片帖",
          url: "https://www.xiaohongshu.com/explore/abc123def456789012345678",
          snippet: "hook",
          videoUrl: "http://sns-video-v3.xhscdn.com/stream/foo.mp4",
          mediaType: "video" as const,
        },
      ],
    };
    const angle = {
      ...reelAngle,
      id: "angle-1",
      sourceVideoUrl: undefined,
      sourceUrl: "https://www.xiaohongshu.com/explore/abc123def456789012345678",
      format: "single-image" as const,
    };
    const enriched = enrichAngleVideoFromPlan(angle, plan);
    assert.ok(enriched.sourceVideoUrl?.includes(".mp4"));
    assert.equal(enriched.format, "reel");
  });
});
