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
  it("records and atomically replays failed refunds", () => {
    const src = read("lib/billing/pending-refunds.ts");
    assert.match(src, /recordPendingRefund/);
    assert.match(src, /processPendingRefundsForBilledUser/);
    assert.match(src, /processAllPendingRefunds/);
    assert.match(src, /status: "pending"/);
    assert.match(src, /status: "processing"/);
    assert.match(src, /findOneAndUpdate/);
    assert.match(src, /claimNextPendingRefund/);
    assert.match(src, /markRefundReplayCompleted/);
    assert.match(src, /releaseRefundReplayClaim/);
  });

  it("cron route sweeps all pending refunds with CRON_SECRET", () => {
    const src = read("app/api/cron/replay-pending-refunds/route.ts");
    assert.match(src, /processAllPendingRefunds/);
    assert.match(src, /CRON_SECRET/);
    assert.match(src, /Bearer \$\{secret\}/);
  });
});
