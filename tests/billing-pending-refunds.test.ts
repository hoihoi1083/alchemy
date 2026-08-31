import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("generate-image carousel gate", () => {
  it("blocks campaign/teaching-carousel modes below Standard on multipart path", () => {
    const src = read("app/api/generate-image/route.ts");
    assert.match(src, /imageOutputMode === "campaign"/);
    assert.match(src, /teaching-carousel/);
    assert.match(src, /planMeetsMinimum\(userPlan, "standard"\)/);
    assert.match(src, /carousel_needs_standard/);
  });
});

describe("billing pending refunds", () => {
  it("records and replays failed refunds", () => {
    const src = read("lib/billing/pending-refunds.ts");
    assert.match(src, /recordPendingRefund/);
    assert.match(src, /processPendingRefundsForBilledUser/);
    assert.match(src, /status: "pending"/);
  });
});
