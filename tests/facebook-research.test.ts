import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  directPostUrlSupported,
  facebookPostRefFromUrl,
} from "@/lib/content-research-post-url";
import { mapRawPlatformPost } from "@/lib/justoneapi-platform-search";

describe("facebook research mapping", () => {
  it("hydrates cover from video_thumbnail and maps engagement fields", () => {
    const post = mapRawPlatformPost(
      "facebook",
      {
        post_id: "1065421039304574",
        type: "post",
        url: "https://www.facebook.com/61550019737853/videos/1065421039304574/",
        message: "8.24 crazy sale in natural jadeite bracelet",
        comments_count: 311,
        reactions_count: 31,
        reshare_count: 7,
        reactions: { like: 19, love: 8, care: 2, wow: 2 },
        author: { id: "61550019737853", name: "Crystal Jade" },
        image: null,
        video: "https://www.facebook.com/61550019737853/videos/1065421039304574/",
        video_thumbnail:
          "https://scontent.xx.fbcdn.net/v/t15.5256-10/cover.jpg?oh=abc",
        album_preview: null,
      },
      0,
    );

    assert.ok(post);
    assert.equal(post!.platform, "facebook");
    assert.equal(post!.id, "1065421039304574");
    assert.equal(post!.author, "Crystal Jade");
    assert.equal(post!.likes, 31);
    assert.equal(post!.shares, 7);
    assert.equal(post!.comments, 311);
    assert.equal(post!.mediaType, "image");
    assert.equal(post!.videoUrl, undefined);
    assert.match(post!.coverImageUrl ?? "", /fbcdn\.net/);
  });

  it("marks mediaType video only when a downloadable MP4/m3u8 exists", () => {
    const post = mapRawPlatformPost(
      "facebook",
      {
        post_id: "55",
        url: "https://www.facebook.com/123/videos/55/",
        message: "Reel with file",
        video_files: {
          video_hd_file: "https://video.xx.fbcdn.net/v/t42/clip.mp4",
        },
        video_thumbnail: "https://scontent.xx.fbcdn.net/v/t15/thumb.jpg",
      },
      0,
    );
    assert.ok(post);
    assert.equal(post!.mediaType, "video");
    assert.match(post!.videoUrl ?? "", /\.mp4/);
  });

  it("collects album_preview images for photo posts", () => {
    const post = mapRawPlatformPost(
      "facebook",
      {
        post_id: "99",
        url: "https://www.facebook.com/123/posts/99",
        message: "Serum flat lay",
        reactions_count: 12,
        reshare_count: 1,
        comments_count: 3,
        author: { name: "Glow Lab" },
        album_preview: [
          { image: "https://scontent.xx.fbcdn.net/v/t39/a.jpg" },
          { url: "https://scontent.xx.fbcdn.net/v/t39/b.jpg" },
        ],
      },
      0,
    );

    assert.ok(post);
    assert.equal(post!.mediaType, "image");
    assert.equal(post!.coverImageUrl, "https://scontent.xx.fbcdn.net/v/t39/a.jpg");
    assert.deepEqual(post!.imageUrls, [
      "https://scontent.xx.fbcdn.net/v/t39/a.jpg",
      "https://scontent.xx.fbcdn.net/v/t39/b.jpg",
    ]);
  });
});

describe("facebook post URL refs", () => {
  it("parses profile + post from videos/posts paths", () => {
    assert.deepEqual(
      facebookPostRefFromUrl(
        "https://www.facebook.com/61550019737853/videos/1065421039304574/",
      ),
      { profileId: "61550019737853", postId: "1065421039304574" },
    );
    assert.deepEqual(
      facebookPostRefFromUrl(
        "https://www.facebook.com/SomePage/posts/pfbid02abc/",
      ),
      { profilePath: "/SomePage", postId: "pfbid02abc" },
    );
    assert.deepEqual(
      facebookPostRefFromUrl(
        "https://www.facebook.com/permalink.php?story_fbid=99&id=123",
      ),
      { profileId: "123", postId: "99" },
    );
  });

  it("enables Facebook direct post URLs", () => {
    assert.equal(directPostUrlSupported("facebook"), true);
    assert.equal(directPostUrlSupported("tiktok"), false);
  });
});
