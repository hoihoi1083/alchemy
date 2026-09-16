import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billingMetaFromRequest,
  buildChargeRef,
  sanitizeIdempotencyKey,
} from "@/lib/billing/charge-ref";

describe("charge-ref / idempotency", () => {
  it("builds stable charge_ refs from client keys", () => {
    const a = buildChargeRef("550e8400-e29b-41d4-a716-446655440000");
    const b = buildChargeRef("550e8400-e29b-41d4-a716-446655440000");
    assert.equal(a, b);
    assert.match(a, /^charge_[a-f0-9]{32}$/);
  });

  it("sanitizes unsafe keys via hash", () => {
    const key = sanitizeIdempotencyKey("bad key with spaces!");
    assert.ok(key);
    assert.match(key!, /^[a-f0-9]{40}$/);
  });

  it("reads Idempotency-Key from request into charge meta", () => {
    const req = new Request("https://example.com/api/generate", {
      headers: { "Idempotency-Key": "retry-abc-123" },
    });
    const meta = billingMetaFromRequest(req, { kind: "video" });
    assert.equal(meta.idempotencyKey, "retry-abc-123");
    assert.equal(meta.chargeRef, buildChargeRef("retry-abc-123"));
    assert.equal(meta.kind, "video");
  });

  it("preserves explicit chargeRef", () => {
    const req = new Request("https://example.com/api/generate", {
      headers: { "Idempotency-Key": "other" },
    });
    const meta = billingMetaFromRequest(req, {
      kind: "video",
      chargeRef: "charge_custom",
    });
    assert.equal(meta.chargeRef, "charge_custom");
  });
});
