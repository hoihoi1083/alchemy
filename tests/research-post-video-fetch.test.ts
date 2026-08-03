import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedResearchVideoUrl } from "../lib/research-post-video-fetch";
import {
  assertPublicHttpUrl,
  hostMatchesAllowlist,
  isPrivateOrLocalHost,
} from "../lib/pipeline/safe-url";

describe("isAllowedResearchVideoUrl", () => {
  it("allows XHS sns-video xhscdn stream MP4", () => {
    assert.equal(
      isAllowedResearchVideoUrl(
        "http://sns-video-v3.xhscdn.com/stream/110/258/foo_258.mp4?sign=abc",
      ),
      true,
    );
  });

  it("allows XHS rednotecdn stream MP4 from note-detail resolve", () => {
    assert.equal(
      isAllowedResearchVideoUrl(
        "https://sns-v14-ae.rednotecdn.com/stream/1/110/258/01e9aeac8bc5a48d010370019cd25264bc_258.mp4?sign=57a3c50e42a4b6b18e34b96333237ccb&t=6a543bbe",
      ),
      true,
    );
  });

  it("rejects arbitrary hosts", () => {
    assert.equal(isAllowedResearchVideoUrl("https://evil.example.com/video.mp4"), false);
  });

  it("rejects substring lookalike hosts (SSRF bypass)", () => {
    assert.equal(
      isAllowedResearchVideoUrl("https://xhscdn.com.evil-attacker.com/video.mp4"),
      false,
    );
    assert.equal(
      isAllowedResearchVideoUrl("https://not-scontent.evil.com/video.mp4"),
      false,
    );
  });
});

describe("assertPublicHttpUrl / private fence", () => {
  it("allows any public shop URL", () => {
    assert.equal(assertPublicHttpUrl("https://myshop.example.com/about").hostname, "myshop.example.com");
    assert.equal(assertPublicHttpUrl("http://brand.tw").hostname, "brand.tw");
  });

  it("blocks private and local targets", () => {
    assert.throws(() => assertPublicHttpUrl("http://127.0.0.1/"));
    assert.throws(() => assertPublicHttpUrl("http://169.254.169.254/latest/meta-data/"));
    assert.throws(() => assertPublicHttpUrl("http://192.168.1.1/"));
    assert.throws(() => assertPublicHttpUrl("http://localhost:3000/"));
    assert.ok(isPrivateOrLocalHost("10.0.0.5"));
  });
});

describe("hostMatchesAllowlist", () => {
  const hosts = ["xhscdn.com", "scontent", "sns-video"] as const;

  it("allows real CDN hosts", () => {
    assert.equal(hostMatchesAllowlist("sns-video-v3.xhscdn.com", hosts), true);
    assert.equal(hostMatchesAllowlist("scontent-lax3-1.cdninstagram.com", ["cdninstagram.com", "scontent"]), true);
  });

  it("rejects includes-style lookalikes", () => {
    assert.equal(hostMatchesAllowlist("xhscdn.com.evil.com", hosts), false);
  });
});
