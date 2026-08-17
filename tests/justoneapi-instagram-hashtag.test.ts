import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flattenSearchItems } from "../lib/justoneapi-client";
import { mapRawPlatformPost } from "../lib/justoneapi-platform-search";

describe("instagram hashtag search parsing", () => {
  it("flattens edge_hashtag_to_media GraphQL edges", () => {
    const payload = {
      code: 0,
      data: {
        data: {
          hashtag: {
            name: "skincare",
            edge_hashtag_to_media: {
              edges: [
                {
                  node: {
                    __typename: "GraphImage",
                    shortcode: "DcIuEH8FPtf",
                    display_url: "https://cdn.example.com/hero.jpg",
                    edge_media_to_caption: {
                      edges: [{ node: { text: "Happy skin just hits different" } }],
                    },
                    edge_liked_by: { count: 42 },
                    edge_media_to_comment: { count: 3 },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const items = flattenSearchItems(payload);
    assert.equal(items.length, 1);

    const post = mapRawPlatformPost("instagram", items[0], 0);
    assert.ok(post);
    assert.equal(post.platform, "instagram");
    assert.equal(post.mediaType, "image");
    assert.match(post.title, /Happy skin/);
    assert.equal(post.coverImageUrl, "https://cdn.example.com/hero.jpg");
    assert.equal(post.url, "https://www.instagram.com/p/DcIuEH8FPtf/");
    assert.equal(post.likes, 42);
    assert.equal(post.comments, 3);
  });
});
