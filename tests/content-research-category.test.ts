import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  liveResearchAngleCount,
  mergeResearchPosts,
  researchPostDedupeKey,
} from "../lib/content-research-category";
import type { ContentResearchPost } from "../lib/content-research-types";

function post(
  partial: Partial<ContentResearchPost> & Pick<ContentResearchPost, "id" | "title" | "url">,
): ContentResearchPost {
  return {
    snippet: "",
    platform: "xiaohongshu",
    ...partial,
  };
}

describe("content-research-category", () => {
  it("uses DeepSeek only for category phrases — no offline char-slice heuristic", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/content-research-category.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /heuristicCategoryKeywords/);
    assert.match(src, /DeepSeek only/);
  });

  it("merges category posts without duplicating ids/urls", () => {
    const primary = [
      post({ id: "a", title: "A", url: "https://xhslink.com/a" }),
      post({ id: "b", title: "B", url: "https://xhslink.com/b" }),
    ];
    const extra = [
      post({ id: "b", title: "B dup", url: "https://xhslink.com/b" }),
      post({ id: "c", title: "C", url: "https://xhslink.com/c" }),
      // Same URL, different id — must still collapse.
      post({ id: "c-alt", title: "C alt", url: "https://xhslink.com/c" }),
    ];
    const merged = mergeResearchPosts(primary, extra, 9);
    assert.equal(merged.length, 3);
    assert.deepEqual(
      merged.map((p) => p.id),
      ["a", "b", "c"],
    );
  });

  it("dedupes by URL ahead of id", () => {
    assert.equal(
      researchPostDedupeKey(
        post({ id: "Note1", title: "x", url: "https://www.xiaohongshu.com/explore/abc" }),
      ),
      "xiaohongshu:url:https://www.xiaohongshu.com/explore/abc",
    );
  });

  it("ignores synthetic fallback ids so primary+category rows do not collide", () => {
    const a = post({
      id: "xhs-1",
      title: "Primary note",
      url: "",
      coverImageUrl: "https://cdn.example.com/a.jpg",
    });
    const b = post({
      id: "xhs-1",
      title: "Category note",
      url: "",
      coverImageUrl: "https://cdn.example.com/b.jpg",
    });
    assert.notEqual(researchPostDedupeKey(a), researchPostDedupeKey(b));
    const merged = mergeResearchPosts([a], [b], 9);
    assert.equal(merged.length, 2);
  });

  it("caps live angle count to unique posts", () => {
    assert.equal(liveResearchAngleCount(0), 6);
    assert.equal(liveResearchAngleCount(2), 2);
    assert.equal(liveResearchAngleCount(4), 4);
    assert.equal(liveResearchAngleCount(12), 9);
  });
});

describe("TikTok search keyword nets", () => {
  it("translates CJK → English and runs category fill like IG/XHS", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/justoneapi-platform-search.ts"),
      "utf8",
    );
    assert.match(src, /translateKeywordToTiktokKeywords/);
    assert.match(src, /searchTiktokPosts/);
    assert.match(src, /TikTok empty — translated/);
    const needs = src.slice(src.indexOf("const needsCategory"));
    assert.match(needs, /platform === "tiktok"/);
  });
});
