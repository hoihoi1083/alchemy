import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickVideoUrlFromXhsNote, xhsNoteDetailParams } from "../lib/xhs-note-detail";

describe("xhs-note-detail", () => {
  it("xhsNoteDetailParams includes noteUrl when provided", () => {
    assert.deepEqual(xhsNoteDetailParams("abc123", "https://www.xiaohongshu.com/explore/abc123?xsec_token=foo"), {
      noteId: "abc123",
      noteUrl: "https://www.xiaohongshu.com/explore/abc123?xsec_token=foo",
    });
  });

  it("pickVideoUrlFromXhsNote reads nested video.media.stream", () => {
    const url = pickVideoUrlFromXhsNote({
      video: {
        media: {
          stream: {
            h264: [{ master_url: "http://sns-video-v14.xhscdn.com/stream/110/259/foo.mp4" }],
          },
        },
      },
    });
    assert.ok(url?.includes(".mp4"));
  });
});
