import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMp4ProbeReport,
  probeJustOneMp4Pipeline,
} from "../lib/justone-mp4-probe";
import { bufferLooksLikeMp4 } from "../lib/research-post-video-fetch";
import type { ContentResearchPost } from "../lib/content-research-types";

function fakeMp4Buffer(): ArrayBuffer {
  const buf = new Uint8Array(2048);
  buf[4] = "f".charCodeAt(0);
  buf[5] = "t".charCodeAt(0);
  buf[6] = "y".charCodeAt(0);
  buf[7] = "p".charCodeAt(0);
  return buf.buffer;
}

const videoPost: ContentResearchPost = {
  id: "abc123",
  title: "測試短片",
  url: "https://www.xiaohongshu.com/explore/abc123",
  videoUrl: "https://sns-video.example.com/clip.mp4",
  mediaType: "video",
  platform: "xiaohongshu",
};

describe("bufferLooksLikeMp4", () => {
  it("detects ftyp header", () => {
    assert.equal(bufferLooksLikeMp4(fakeMp4Buffer()), true);
    assert.equal(bufferLooksLikeMp4(new ArrayBuffer(8)), false);
  });
});

describe("probeJustOneMp4Pipeline (mocked)", () => {
  it("passes when search returns a downloadable MP4", async () => {
    const report = await probeJustOneMp4Pipeline(
      { keyword: "水晶", maxPosts: 1 },
      {
        searchPosts: async () => ({
          posts: [videoPost],
          endpoint: "/api/xiaohongshu/search-note/v2",
        }),
        resolveVideo: async () => undefined,
        downloadVideo: async () => ({
          ok: true,
          bytes: 2048,
          buffer: fakeMp4Buffer(),
          contentType: "video/mp4",
        }),
      },
    );

    assert.equal(report.anyDownloadOk, true);
    assert.equal(report.anyMp4Ok, true);
    assert.match(formatMp4ProbeReport(report), /anyMp4Ok=true/);
  });

  it("fails when CDN download fails", async () => {
    const report = await probeJustOneMp4Pipeline(
      { keyword: "水晶", maxPosts: 1 },
      {
        searchPosts: async () => ({ posts: [videoPost], endpoint: "test" }),
        resolveVideo: async () => undefined,
        downloadVideo: async () => ({ ok: false, error: "upstream_failed", status: 403 }),
      },
    );

    assert.equal(report.anyDownloadOk, false);
    assert.equal(report.anyMp4Ok, false);
  });

  it("resolves video URL when search omits it", async () => {
    const postNoUrl: ContentResearchPost = {
      ...videoPost,
      videoUrl: undefined,
    };
    let resolved = false;

    const report = await probeJustOneMp4Pipeline(
      { keyword: "水晶", maxPosts: 1 },
      {
        searchPosts: async () => ({ posts: [postNoUrl], endpoint: "test" }),
        resolveVideo: async () => {
          resolved = true;
          return "https://sns-video.example.com/resolved.mp4";
        },
        downloadVideo: async () => ({
          ok: true,
          bytes: 1500,
          buffer: fakeMp4Buffer(),
          contentType: "video/mp4",
        }),
      },
    );

    assert.equal(resolved, true);
    assert.equal(report.rows[0]?.resolvedVideoUrl, "https://sns-video.example.com/resolved.mp4");
    assert.equal(report.anyMp4Ok, true);
  });

  it("reports search failure", async () => {
    const report = await probeJustOneMp4Pipeline(
      { keyword: "水晶" },
      {
        searchPosts: async () => {
          throw new Error("COLLECT FAILED, SEND REQUEST AGAIN");
        },
        resolveVideo: async () => undefined,
        downloadVideo: async () => ({ ok: false, error: "n/a" }),
      },
    );

    assert.equal(report.searchOk, false);
    assert.match(report.searchError ?? "", /COLLECT FAILED/);
  });
});
