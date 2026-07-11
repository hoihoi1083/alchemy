import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractXhsNoteFromDetailResponse,
  mapRawPlatformPost,
} from "../lib/justoneapi-platform-search";
import { xhsCoverUrlLooksFetchable } from "../lib/research-cover-url";

/** Just One get-note-detail/v7 shape (2026) — data is an array with note_list. */
const v7Body = {
  code: 0,
  data: [
    {
      note_list: [
        {
          id: "6a3fb56200000000170280cd",
          type: "normal",
          title: "手串佩戴的四大禁忌，你们戴对了吗？",
          desc: "佩戴规则示例文案",
          images_list: [
            {
              url: "http://sns-img-hw.xhscdn.net/1040g3k0321tsrbbp7a005o0rimgg8cfuv8jq1u0?imageView2/2/w/1080/format/webp",
              original: "http://sns-img-hw.xhscdn.net/1040g3k0321tsrbbp7a005o0rimgg8cfuv8jq1u0",
            },
          ],
          liked_count: 137,
          collected_count: 95,
        },
      ],
    },
  ],
};

describe("extractXhsNoteFromDetailResponse", () => {
  it("unwraps v7 array + note_list", () => {
    const note = extractXhsNoteFromDetailResponse(v7Body);
    assert.equal(note?.id, "6a3fb56200000000170280cd");
    assert.equal(note?.title, "手串佩戴的四大禁忌，你们戴对了吗？");
  });

  it("maps v7 note to post with images (unsigned cover omitted until hydrate)", () => {
    const note = extractXhsNoteFromDetailResponse(v7Body);
    const post = mapRawPlatformPost("xiaohongshu", note, 0);
    assert.ok(post);
    assert.equal(post?.mediaType, "image");
    assert.equal(post?.coverImageUrl, undefined);
    assert.equal(post?.imageUrls?.length, 1);
    assert.ok(post?.imageUrls?.[0]?.includes("sns-img-hw.xhscdn.net"));
  });

  it("returns null for empty v5 data", () => {
    assert.equal(extractXhsNoteFromDetailResponse({ code: 0, data: {} }), null);
  });
});

describe("xhsCoverUrlLooksFetchable", () => {
  it("accepts signed rednotecdn URLs", () => {
    assert.ok(
      xhsCoverUrlLooksFetchable(
        "https://sns-i10.rednotecdn.com/notes_pre_post/abc?sign=1",
      ),
    );
  });

  it("rejects bare sns-img-hw xhscdn paths from v7", () => {
    assert.equal(
      xhsCoverUrlLooksFetchable(
        "http://sns-img-hw.xhscdn.net/1040g3k0321tsrbbp7a005o0rimgg8cfuv8jq1u0",
      ),
      false,
    );
  });

  it("rejects other unsigned xhscdn hosts", () => {
    assert.equal(
      xhsCoverUrlLooksFetchable("http://sns-webpic.xhscdn.com/abc"),
      false,
    );
  });
});
