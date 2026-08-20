import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentResearchSearchHint } from "../lib/content-research-search-hints";

const labels = {
  xhsKeyword: "xhs",
  igImageHashtag: "ig-image",
  igImageHashtagPreview: (tags: string) => `tags:${tags}`,
  igImageCjkSuggest: "cjk:",
  igVideoKeyword: "ig-video",
  facebookKeyword: "fb",
  tiktokVideo: "tt",
};

describe("contentResearchSearchHint", () => {
  it("suggests XHS for default platform guidance", () => {
    assert.equal(contentResearchSearchHint("xiaohongshu", "護膚", "image", labels), "xhs");
  });

  it("shows mapped IG hashtags for CJK product phrases", () => {
    const hint = contentResearchSearchHint("instagram", "維他命 C 精華", "image", labels);
    assert.ok(hint?.includes("cjk:"));
    assert.match(hint ?? "", /#vitaminc|#vitamincserum|#serum/);
  });

  it("uses reel keyword hint for IG video mode", () => {
    assert.equal(
      contentResearchSearchHint("instagram", "skincare", "video", labels),
      "ig-video",
    );
  });
});
