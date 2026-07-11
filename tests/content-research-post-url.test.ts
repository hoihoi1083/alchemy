import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectPlatformFromPostUrl,
  extractPostRefFromUrl,
  instagramShortcodeFromUrl,
  normalizePostUrlInput,
  xhsNoteIdFromUrl,
} from "../lib/content-research-post-url";
import { exploreIdFromUrl } from "../lib/content-research-enrich";

describe("content-research-post-url", () => {
  it("detects xhslink and xiaohongshu hosts", () => {
    assert.equal(detectPlatformFromPostUrl("http://xhslink.com/o/1ixi8MQ6y6k"), "xiaohongshu");
    assert.equal(
      detectPlatformFromPostUrl("https://www.xiaohongshu.com/explore/6a37ce650000000021023ac6"),
      "xiaohongshu",
    );
  });

  it("extracts explore note id from canonical and discovery URLs", () => {
    const id = "6a37ce650000000021023ac6";
    assert.equal(
      xhsNoteIdFromUrl(`https://www.xiaohongshu.com/explore/${id}`),
      id,
    );
    assert.equal(
      exploreIdFromUrl(`https://www.xiaohongshu.com/discovery/item/${id}`),
      id,
    );
  });

  it("extracts Instagram shortcode", () => {
    assert.equal(
      instagramShortcodeFromUrl("https://www.instagram.com/reel/ABC123xyz/"),
      "ABC123xyz",
    );
  });

  it("normalizes URLs without scheme", () => {
    assert.equal(normalizePostUrlInput("xhslink.com/o/abc"), "https://xhslink.com/o/abc");
  });

  it("extractPostRefFromUrl for xhs and ig", () => {
    assert.deepEqual(
      extractPostRefFromUrl(
        "xiaohongshu",
        "https://www.xiaohongshu.com/explore/abc123def4567890123456",
      ),
      { noteId: "abc123def4567890123456" },
    );
    assert.deepEqual(
      extractPostRefFromUrl("instagram", "https://www.instagram.com/p/XYZ/"),
      { igCode: "XYZ" },
    );
  });
});
