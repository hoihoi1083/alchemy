import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withCacheBust } from "../lib/caption-studio-url";

describe("withCacheBust", () => {
  it("uses ? when url has no query", () => {
    const out = withCacheBust("/api/pipeline-files/abc/final.mp4");
    assert.match(out, /^\/api\/pipeline-files\/abc\/final\.mp4\?v=\d+$/);
  });

  it("uses & when library url already has inline=1", () => {
    const out = withCacheBust("/api/library/download/abc123?inline=1");
    assert.match(out, /^\/api\/library\/download\/abc123\?inline=1&v=\d+$/);
    assert.doesNotMatch(out, /\?inline=1\?v=/);
  });
});
