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

describe("generate-image ultra compose gate", () => {
  it("blocks JSON compose mode below Master (Ultra canvas)", () => {
    const route = read("app/api/generate-image/route.ts");
    const helper = read("lib/billing/assert-pro-canvas.ts");
    assert.match(route, /apiMode === "compose"/);
    assert.match(route, /assertProCanvasAllowedForUser/);
    assert.match(helper, /ultra_canvas_needs_master/);
  });
});

describe("platform research Standard+ gate + free for entitled", () => {
  const researchRoutes = [
    "app/api/research-content-angles/route.ts",
    "app/api/research-direct-post/route.ts",
    "app/api/research-resolve-video/route.ts",
    "app/api/research-post-video/route.ts",
    "app/api/research-post-image/route.ts",
    "app/api/remap-research-copy/route.ts",
    "app/api/analyze-research-reel/route.ts",
    "app/api/refine-research-video-script/route.ts",
  ];

  it("every research route asserts Standard+", () => {
    for (const rel of researchRoutes) {
      const src = read(rel);
      assert.match(
        src,
        /assertPlatformResearchAllowed/,
        `${rel} missing Standard+ gate`,
      );
    }
  });

  it("analyze + refine do not charge tokens", () => {
    const analyze = read("app/api/analyze-research-reel/route.ts");
    const refine = read("app/api/refine-research-video-script/route.ts");
    assert.doesNotMatch(analyze, /chargeTokens/);
    assert.doesNotMatch(refine, /chargeTokens/);
    assert.match(analyze, /tokensCharged:\s*0/);
    assert.match(refine, /tokensCharged:\s*0/);
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
    assert.match(src, /grantTokensOnce/);
    assert.match(src, /pending_refund_/);
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
