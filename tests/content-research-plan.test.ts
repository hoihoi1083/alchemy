import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("content research plan JSON repair wiring", () => {
  it("runs a DeepSeek repair pass after invalid plan JSON", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/content-research-plan.ts"),
      "utf8",
    );
    assert.match(src, /repairResearchPlanJson/);
    assert.match(src, /plan JSON invalid — running DeepSeek repair pass/);
    assert.match(src, /Content research plan \(repaired\)/);
  });

  it("aligns plan copy to market after live and playbook research", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/content-research-plan.ts"),
      "utf8",
    );
    assert.match(src, /alignResearchPlanCopy\(plan, input\.market\)/);
    assert.match(src, /rewriteCopyToScript/);
  });
});

describe("research APIs prefer page UI locale for display copy", () => {
  it("content-angles and direct-post route market through uiLocale SSOT", () => {
    for (const file of [
      "app/api/research-content-angles/route.ts",
      "app/api/research-direct-post/route.ts",
      "app/api/remap-research-copy/route.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      assert.match(src, /promptMarketFromUiLocaleOrMarket/);
      assert.match(src, /uiLocale/);
    }
  });

  it("ContentResearchPanel sends uiLocale with research requests", () => {
    const src = readFileSync(
      join(process.cwd(), "components/content-research/ContentResearchPanel.tsx"),
      "utf8",
    );
    assert.match(src, /uiLocale:\s*locale/);
  });

  it("ContentResearchPanel sets plan after keyword AND direct-post success", () => {
    const src = readFileSync(
      join(process.cwd(), "components/content-research/ContentResearchPanel.tsx"),
      "utf8",
    );
    const keywordFn = src.slice(
      src.indexOf("async function runResearch()"),
      src.indexOf("async function runDirectPost()"),
    );
    const directFn = src.slice(
      src.indexOf("async function runDirectPost()"),
      src.indexOf("async function pickAngle("),
    );
    assert.match(keywordFn, /setPlan\(data\.plan as ContentResearchPlan\)/);
    assert.match(keywordFn, /researchSourceNote\([\s\S]*"keyword"\)/);
    assert.match(directFn, /setPlan\(nextPlan\)/);
    assert.match(directFn, /researchSourceNote\(nextPlan, cr, "direct-post"\)/);
  });

  it("research-content-angles allowlist keeps TikTok for combined (no mediaFilter)", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/research-content-angles/route.ts"),
      "utf8",
    );
    assert.match(src, /: "combined"/);
    assert.doesNotMatch(
      src,
      /mediaFilter === "video" \? "video-only" : "image-only"/,
    );
  });
});
