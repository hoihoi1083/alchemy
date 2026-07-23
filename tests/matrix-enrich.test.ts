import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachSourcePostsToPlan,
  sortedDisplayAngles,
} from "../lib/content-research-enrich";
import type { ContentResearchPlan, ContentResearchPost } from "../lib/content-research-types";
import { makeAngle } from "./fixtures/angle-factory";

describe("research enrich + display angles", () => {
  const posts: ContentResearchPost[] = [
    {
      id: "p1",
      title: "水瓶座水晶",
      url: "https://www.xiaohongshu.com/explore/aaa111",
      snippet: "星座水晶攻略",
      imageUrls: [
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
        "https://example.com/c.jpg",
        "https://example.com/d.jpg",
      ],
      platform: "xiaohongshu",
      likes: 5000,
    },
    {
      id: "p2",
      title: "洗鼻器测评",
      url: "https://www.xiaohongshu.com/explore/bbb222",
      snippet: "儿童洗鼻",
      coverImageUrl: "https://example.com/c.jpg",
      platform: "xiaohongshu",
    },
  ];

  it("attachSourcePostsToPlan enriches angles and adds lite post angles", () => {
    const angle = makeAngle("teaching-carousel", {
      sourceUrl: posts[0].url,
      score: 90,
    });
    const plan: ContentResearchPlan = {
      platform: "xiaohongshu",
      platformLabel: "小紅書",
      topic: "水晶手串",
      summary: "",
      researchMode: "live-web",
      posts,
      candidates: [angle],
      topPicks: [angle],
    };
    const enriched = attachSourcePostsToPlan(plan);
    assert.ok(enriched.candidates.length >= 2);
    const matched = enriched.candidates.find((c) => c.sourceUrl === posts[0].url);
    assert.ok(matched?.sourceImageUrls?.length === 4);
    const lite = enriched.candidates.find((c) => c.id === "post-p2");
    assert.ok(lite);
    assert.ok(sortedDisplayAngles(enriched)[0].score >= sortedDisplayAngles(enriched).at(-1)!.score);
  });

  it("does not reuse the same Facebook cover for every rewritten angle", () => {
    const fbPosts: ContentResearchPost[] = [
      {
        id: "fb1",
        title: "多寶手串",
        url: "https://www.facebook.com/posts/111",
        snippet: "收藏",
        coverImageUrl: "https://example.com/fb1.jpg",
        author: "Yanle Lee",
        platform: "facebook",
      },
      {
        id: "fb2",
        title: "手串真偽",
        url: "https://www.facebook.com/posts/222",
        snippet: "辨別",
        coverImageUrl: "https://example.com/fb2.jpg",
        author: "Other",
        platform: "facebook",
      },
      {
        id: "fb3",
        title: "材質比較",
        url: "https://www.facebook.com/posts/333",
        snippet: "材質",
        coverImageUrl: "https://example.com/fb3.jpg",
        author: "Other2",
        platform: "facebook",
      },
    ];
    // Planner often cites the same viral post for all 3 rewritten directions.
    const sharedUrl = fbPosts[0].url;
    const angles = [92, 89, 88].map((score, i) =>
      makeAngle("teaching-carousel", {
        id: `a${i + 1}`,
        sourceUrl: sharedUrl,
        sourceTitle: fbPosts[0].title,
        score,
      }),
    );
    const plan: ContentResearchPlan = {
      platform: "facebook",
      platformLabel: "Facebook",
      topic: "手串",
      summary: "",
      researchMode: "live-web",
      posts: fbPosts,
      candidates: angles,
      topPicks: angles,
    };
    const enriched = attachSourcePostsToPlan(plan);
    const covers = enriched.topPicks.map((a) => a.sourceCoverImageUrl);
    assert.equal(new Set(covers).size, 3);
    assert.ok(covers.includes("https://example.com/fb1.jpg"));
    assert.ok(covers.includes("https://example.com/fb2.jpg"));
    assert.ok(covers.includes("https://example.com/fb3.jpg"));
  });
});
