import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickVideoUrl } from "../lib/justoneapi-client";

/** Shape returned by Just One get-note-detail/v5 for XHS video notes (2026). */
const xhsDetailVideo = {
  capa: { duration: 131 },
  media: {
    stream: {
      h264: [
        {
          master_url:
            "http://sns-video-v14.xhscdn.com/stream/110/259/01e69ce7262cbb540103730390d4ea6f1e_259.mp4?sign=abc&t=123",
          backup_urls: [
            "http://sns-bak-v8.xhscdn.com/stream/110/259/01e69ce7262cbb540103730390d4ea6f1e_259.mp4",
          ],
          format: "mp4",
        },
      ],
      h265: [],
    },
  },
};

describe("pickVideoUrl XHS v5 detail", () => {
  it("extracts master_url from video.media.stream.h264", () => {
    const url = pickVideoUrl(xhsDetailVideo);
    assert.ok(url?.includes("sns-video-v14.xhscdn.com"));
    assert.ok(url?.includes(".mp4"));
  });
});
