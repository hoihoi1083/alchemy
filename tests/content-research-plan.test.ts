import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeLiveResearchPlan } from "../lib/content-research-plan";
import type { ContentResearchPost } from "../lib/content-research-types";

function mockPosts(count: number): ContentResearchPost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    platform: "xiaohongshu" as const,
    url: `https://www.xiaohongshu.com/explore/abc${i + 1}`,
    title: `水晶手串筆記 ${i + 1}`,
    snippet: `分享第 ${i + 1} 款水晶手串搭配`,
    coverImageUrl: `https://cdn.example.com/cover-${i + 1}.jpg`,
    mediaType: "image" as const,
    likes: 100 + i,
  }));
}

describe("finalizeLiveResearchPlan", () => {
  it("backfills top picks from XHS posts when DeepSeek returns too few angles", () => {
    const plan = finalizeLiveResearchPlan(
      {
        summary: "partial",
        candidates: [
          {
            id: "1",
            title: "One angle",
            hook: "hook",
            format: "single-image",
            score: 80,
          },
        ],
        topPicks: [],
      },
      {
        topic: "水晶手串",
        platform: "xiaohongshu",
        researchMode: "live-web",
        searchProvider: "justoneapi",
        posts: mockPosts(5),
      },
    );

    assert.equal(plan.topPicks.length, 3);
    assert.ok(plan.candidates.length >= 5);
    assert.ok(plan.topPicks.every((a) => a.sourceUrl || a.title));
  });
});
