import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeRemoteMediaUrl } from "../lib/pipeline/safe-url";

describe("safe remote media hosts", () => {
  it("allows BytePlus / Volcengine TOS outputs", () => {
    const u = assertSafeRemoteMediaUrl(
      "https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/dreamina/x.mp4",
    );
    assert.match(u.hostname, /volces\.com$/);
  });
});
