import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flattenSearchItems } from "../lib/justoneapi-client";

/** Fixture shaped like Just One code=0 hashtag response (iphone). */
const HASHTAG_OK = {
  code: 0,
  data: {
    data: {
      hashtag: {
        id: "17843716558033060",
        name: "iphone",
        edge_hashtag_to_media: {
          count: 10,
          edges: [
            {
              node: {
                __typename: "GraphImage",
                id: "3980789958003563474",
                shortcode: "Dc-m2AsPpvS",
                display_url: "https://cdn.example/display.jpg",
                edge_media_to_caption: {
                  edges: [{ node: { text: "#iphone luxury hoodie" } }],
                },
                edge_liked_by: { count: 12 },
                edge_media_to_comment: { count: 1 },
                is_video: false,
              },
            },
            {
              node: {
                __typename: "GraphVideo",
                id: "3980789958003563999",
                shortcode: "DcVideoReel1",
                display_url: "https://cdn.example/reel-cover.jpg",
                video_url: "https://cdn.example/reel.mp4",
                edge_media_to_caption: {
                  edges: [{ node: { text: "reel about phones" } }],
                },
                is_video: true,
              },
            },
          ],
        },
      },
    },
    status: "ok",
    attempts: 1,
  },
};

describe("Instagram hashtag flatten", () => {
  it("flattens nested data.data.hashtag GraphQL edges from Just One", () => {
    const items = flattenSearchItems(HASHTAG_OK);
    assert.equal(items.length, 2);
    assert.equal((items[0] as { shortcode: string }).shortcode, "Dc-m2AsPpvS");
    assert.equal((items[0] as { display_url: string }).display_url, "https://cdn.example/display.jpg");
  });

  it("returns empty on COLLECT FAILED body", () => {
    const items = flattenSearchItems({
      code: 301,
      data: null,
      message: "COLLECT FAILED, SEND REQUEST AGAIN",
    });
    assert.equal(items.length, 0);
  });
});
