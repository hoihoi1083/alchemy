import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientKeyFromRequest } from "../lib/request-client-key";

describe("request-client-key", () => {
  it("prefers first x-forwarded-for hop", () => {
    const req = new Request("https://example.com/api/studio-assistant", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    assert.equal(clientKeyFromRequest(req), "anon:203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com/api/studio-assistant", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    assert.equal(clientKeyFromRequest(req), "anon:198.51.100.2");
  });

  it("uses unknown when no proxy headers", () => {
    const req = new Request("https://example.com/api/studio-assistant");
    assert.equal(clientKeyFromRequest(req), "anon:unknown");
  });
});
