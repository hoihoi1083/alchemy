import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBestImageUrlFromList, pickImageUrl } from "../lib/justoneapi-client";
import { preferFetchableXhsCover, xhsCoverUrlLooksFetchable } from "../lib/research-cover-url";

describe("pickBestImageUrlFromList", () => {
  it("prefers signed rednotecdn mirror", () => {
    const url = pickBestImageUrlFromList([
      "http://sns-img-hw.xhscdn.net/abc",
      "https://sns-i10.rednotecdn.com/notes_pre_post/abc?sign=1",
    ]);
    assert.ok(url?.includes("rednotecdn.com"));
  });

  it("prefers signed non-heif mirror over signed heif", () => {
    const url = pickBestImageUrlFromList([
      "https://sns-na-i11.xhscdn.com/notes_pre_post/abc?imageView2/2/w/1440/format/heif/q/45&sign=1",
      "https://sns-i10.rednotecdn.com/notes_pre_post/abc?imageView2/2/w/1080/format/webp&sign=1",
    ]);
    assert.ok(url?.includes("format/webp") || url?.includes("rednotecdn.com"));
    assert.ok(!url?.includes("format/heif"));
  });
});

describe("pickImageUrl url_list", () => {
  it("uses best mirror from url_list", () => {
    const url = pickImageUrl({
      url: "http://sns-img-hw.xhscdn.net/dead",
      url_list: [
        "http://sns-img-hw.xhscdn.net/dead",
        "https://sns-i10.rednotecdn.com/notes_pre_post/abc?sign=1",
      ],
    });
    assert.ok(url?.includes("rednotecdn.com"));
  });
});

describe("preferFetchableXhsCover", () => {
  it("skips bare xhscdn when signed mirror exists", () => {
    const cover = preferFetchableXhsCover(
      "http://sns-img-hw.xhscdn.net/abc",
      "https://sns-i10.rednotecdn.com/notes_pre_post/abc?sign=1",
    );
    assert.ok(cover?.includes("rednotecdn.com"));
    assert.ok(xhsCoverUrlLooksFetchable(cover));
  });

  it("returns undefined when only unsigned xhscdn mirrors exist", () => {
    const cover = preferFetchableXhsCover(
      "http://sns-img-hw.xhscdn.net/abc",
      "http://sns-webpic.xhscdn.com/abc",
    );
    assert.equal(cover, undefined);
  });
});
