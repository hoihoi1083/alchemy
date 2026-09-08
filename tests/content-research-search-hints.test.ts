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
    assert.match(hint ?? "", /#維他命C精華/);
  });

  it("uses reel keyword hint for IG video mode", () => {
    assert.equal(
      contentResearchSearchHint("instagram", "skincare", "video", labels),
      "ig-video",
    );
  });
});
