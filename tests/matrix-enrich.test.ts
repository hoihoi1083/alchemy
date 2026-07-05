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
      imageUrls: ["a", "b", "c", "d"],
      platform: "xiaohongshu",
      likes: 5000,
    },
    {
      id: "p2",
      title: "洗鼻器测评",
      url: "https://www.xiaohongshu.com/explore/bbb222",
      snippet: "儿童洗鼻",
      coverImageUrl: "c.jpg",
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
});
