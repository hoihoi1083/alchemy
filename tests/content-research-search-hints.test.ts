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

  it("previews CJK IG hashtags from the typed phrase (no fixed dictionary)", () => {
    const hint = contentResearchSearchHint("instagram", "維他命 C 精華", "image", labels);
    assert.ok(hint?.includes("cjk:"));
    // First-pass candidates keep the user's compact phrase; English translate is async/server-side.
    assert.match(hint ?? "", /#維他命c精華/);
  });

  it("previews Traditional hashtags when the user types Simplified", () => {
    const hint = contentResearchSearchHint("instagram", "上海鲜肉月饼", "image", labels);
    assert.ok(hint?.includes("cjk:"));
    assert.match(hint ?? "", /#上海鮮肉月餅/);
  });

  it("uses reel keyword hint for IG video mode", () => {
    assert.equal(
      contentResearchSearchHint("instagram", "skincare", "video", labels),
      "ig-video",
    );
  });

  it("shows Traditional convert preview for IG video / combined CJK too", () => {
    const videoHint = contentResearchSearchHint("instagram", "上海鲜肉月饼", "video", labels);
    assert.ok(videoHint?.includes("cjk:"));
    assert.match(videoHint ?? "", /上海鮮肉月餅/);

    const combinedHint = contentResearchSearchHint(
      "instagram",
      "上海鲜肉月饼",
      undefined,
      labels,
    );
    assert.ok(combinedHint?.includes("cjk:"));
    assert.match(combinedHint ?? "", /#上海鮮肉月餅/);
  });
});
