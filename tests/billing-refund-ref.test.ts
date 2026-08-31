import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefundRef } from "@/lib/billing/refund-ref";

describe("buildRefundRef", () => {
  it("is stable for the same charge metadata", () => {
    const meta = { kind: "video", mode: "image", reason: "generation_failed" };
    const a = buildRefundRef("user_a", 904, meta);
    const b = buildRefundRef("user_a", 904, meta);
    assert.equal(a, b);
    assert.match(a, /^refund_/);
  });

  it("honors explicit refundRef when provided", () => {
    assert.equal(
      buildRefundRef("user_a", 100, { refundRef: "refund_custom_1" }),
      "refund_custom_1",
    );
  });

  it("differs when cost or reason changes", () => {
    const base = { kind: "video", mode: "text", reason: "generation_failed" };
    const a = buildRefundRef("user_a", 904, base);
    const b = buildRefundRef("user_a", 904, {
      ...base,
      reason: "reference_materialize_empty",
    });
    assert.notEqual(a, b);
  });
});
