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

  it("salts charge refs by kind so multi-charge requests do not collide", () => {
    const key = "retry-abc-123";
    const video = buildChargeRef(key, { kind: "video" });
    const h3 = buildChargeRef(key, { kind: "minimax_h3", via: "generate_auto_fallback" });
    const kling = buildChargeRef(key, {
      kind: "kling_storyboard_fallback",
      via: "generate_auto",
    });
    assert.notEqual(video, h3);
    assert.notEqual(h3, kling);
    assert.equal(video, buildChargeRef(key, { kind: "video" }));
  });

  it("salts repeated same-kind charges by chargeSeq", () => {
    const key = "matte-loop";
    const a = buildChargeRef(key, {
      kind: "smart_layers_matte",
      mode: "person-crop",
      chargeSeq: 0,
    });
    const b = buildChargeRef(key, {
      kind: "smart_layers_matte",
      mode: "person-crop",
      chargeSeq: 1,
    });
    assert.notEqual(a, b);
  });

  it("sanitizes unsafe keys via hash", () => {
    const key = sanitizeIdempotencyKey("bad key with spaces!");
    assert.ok(key);
    assert.match(key!, /^[a-f0-9]{40}$/);
  });

  it("reads Idempotency-Key from request into salted charge meta", () => {
    const req = new Request("https://example.com/api/generate", {
      headers: { "Idempotency-Key": "retry-abc-123" },
    });
    const meta = billingMetaFromRequest(req, { kind: "video" });
    assert.equal(meta.idempotencyKey, "retry-abc-123");
    assert.equal(
      meta.chargeRef,
      buildChargeRef("retry-abc-123", { kind: "video" }),
    );
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
