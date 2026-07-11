import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachSourcePostsToPlan } from "../lib/content-research-enrich";
import type { ContentResearchPost } from "../lib/content-research-types";
import { inferFormatFromPost } from "../lib/content-research-infer";
import { formatLabelForAngleFormat } from "../lib/content-research-apply";

function buildPinnedPlan(post: ContentResearchPost) {
  const format = inferFormatFromPost(post);
  const imageCount = post.imageUrls?.length ?? (post.coverImageUrl ? 1 : 0);
  const pinned = {
    id: `pinned-${post.id}`,
    title: post.title,
    hook: post.snippet.slice(0, 120) || post.title,
    scriptOutline: post.snippet,
    format,
    formatLabel: formatLabelForAngleFormat(format, imageCount),
    whyItWorks: "Pinned reference",
    bulletPoints: [] as string[],
    cta: "",
    score: 100,
    sourceUrl: post.url,
    sourceTitle: post.title,
    sourceCoverImageUrl: post.coverImageUrl,
    sourceImageUrls: post.imageUrls,
  };
  return attachSourcePostsToPlan({
    platform: post.platform,
    platformLabel: "小紅書",
    topic: "黑曜石",
    summary: `Pinned: ${post.title}`,
    researchMode: "live-web",
    searchProvider: "justoneapi",
    posts: [post],
    candidates: [pinned],
    topPicks: [pinned],
  });
}

describe("direct post plan", () => {
  it("pins carousel edu post as teaching-carousel with score 100", () => {
    const post: ContentResearchPost = {
      id: "note-1",
      title: "一篇看懂黑曜石｜种类颜色、真假、产地怎么分",
      url: "https://www.xiaohongshu.com/explore/abc123def4567890123456",
      snippet: "很多人以为黑曜石就是黑色珠子…",
      coverImageUrl: "https://ci.xiaohongshu.com/cover.jpg",
      imageUrls: Array.from({ length: 8 }, (_, i) => `https://ci.xiaohongshu.com/s${i}.jpg`),
      mediaType: "image",
      platform: "xiaohongshu",
      likes: 1200,
    };
    const plan = buildPinnedPlan(post);
    assert.equal(plan.candidates[0]?.score, 100);
    assert.equal(plan.candidates[0]?.format, "teaching-carousel");
    assert.equal(plan.candidates[0]?.sourceImageUrls?.length, 8);
    assert.equal(plan.topPicks[0]?.id, plan.candidates[0]?.id);
  });
});
