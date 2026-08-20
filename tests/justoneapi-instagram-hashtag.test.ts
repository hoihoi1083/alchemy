import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flattenSearchItems } from "../lib/justoneapi-client";
import { instagramHashtagCandidates, mapRawPlatformPost } from "../lib/justoneapi-platform-search";

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

  it("flattens stringified data and top-post edges", () => {
    const inner = {
      hashtag: {
        name: "vitaminc",
        edge_hashtag_to_top_posts: {
          edges: [
            {
              node: {
                __typename: "GraphSidecar",
                shortcode: "AbC123",
                display_url: "https://cdn.example.com/slide.jpg",
                edge_media_to_caption: {
                  edges: [{ node: { text: "C serum carousel" } }],
                },
              },
            },
          ],
        },
      },
    };
    const items = flattenSearchItems({ code: 0, data: JSON.stringify(inner) });
    assert.equal(items.length, 1);
    const post = mapRawPlatformPost("instagram", items[0], 0);
    assert.ok(post);
    assert.equal(post.mediaType, "image");
    assert.equal(post.url, "https://www.instagram.com/p/AbC123/");
  });

  it("flattens a top-level data array of posts", () => {
    const items = flattenSearchItems({
      code: 0,
      data: [
        {
          __typename: "GraphImage",
          shortcode: "Arr1",
          display_url: "https://cdn.example.com/a.jpg",
        },
      ],
    });
    assert.equal(items.length, 1);
  });

  it("maps CJK product phrases to Instagram hashtags", () => {
    const tags = instagramHashtagCandidates("維他命 C 精華");
    assert.ok(tags.includes("vitamincserum") || tags.includes("vitaminc"));
    assert.equal(tags[0] === "vitamincserum" || tags[0] === "vitaminc", true);
  });
});
