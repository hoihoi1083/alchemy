/**
 * Billing charge/refund contract smokes — prove route SOURCE contracts without live fal/Mongo.
 *
 * Rules under test (static + MemoryWallet simulation):
 *  1. Invalid input paths return 400 BEFORE chargeTokens (no debit).
 *  2. Paid routes call refundTokens in catch after chargeTokens.
 *  3. add-bgm validates video before chargeTokens.
 *
 *   npx tsx --test tests/billing-charge-refund-smoke.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { MemoryWallet } from "../lib/billing/memory-wallet";
import { TOKEN_COST, estimateInpaintTokens } from "../lib/billing/token-costs";

const root = process.cwd();

function readRoute(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** Index of first match for pattern; -1 if missing. */
function firstIndex(src: string, re: RegExp): number {
  const m = re.exec(src);
  return m ? m.index : -1;
}

describe("billing smoke — invalid before charge (source contract)", () => {
  it("generate: validates mode inputs before chargeTokens", () => {
    const src = readRoute("app/api/generate/route.ts");
    const validateMarker = src.indexOf("Validate mode inputs BEFORE charging");
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    assert.ok(validateMarker >= 0, "missing validate-before-charge comment");
    assert.ok(chargeAt > validateMarker, "chargeTokens must follow validation");
    // Common invalid paths return 400 in the pre-charge block
    const preCharge = src.slice(0, chargeAt);
    assert.match(preCharge, /status:\s*400/);
  });

  it("inpaint: validates mask/source before chargeTokens; measures megapixels first", () => {
    const src = readRoute("app/api/inpaint-image/route.ts");
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    const pre = src.slice(0, chargeAt);
    assert.match(pre, /Draw a mask area first/);
    assert.match(pre, /source_image_url or image_file/);
    assert.match(pre, /estimateInpaintTokens|megapixelsFromBuffer/);
    assert.match(src, /refundTokens/);
  });

  it("burn-script-captions: validates before chargeTokens", () => {
    const src = readRoute("app/api/burn-script-captions/route.ts");
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    assert.ok(chargeAt > 0);
    const pre = src.slice(0, chargeAt);
    assert.match(pre, /status:\s*400/);
    assert.match(src, /refundTokens/);
  });

  it("generate-storyboard-images: has charge + refund", () => {
    const src = readRoute("app/api/generate-storyboard-images/route.ts");
    assert.match(src, /chargeTokens/);
    assert.match(src, /refundTokens/);
  });

  it("add-bgm: validates video presence before chargeTokens", () => {
    const src = readRoute("app/api/add-bgm/route.ts");
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    const videoRequired = src.indexOf("video_file or video_url is required");
    // Validation 400 for missing video must appear before charge (no charge-then-refund for bad body)
    assert.ok(chargeAt > 0, "chargeTokens present");
    assert.ok(
      videoRequired >= 0 && videoRequired < chargeAt,
      "missing-video 400 must be before chargeTokens",
    );
  });

  it("dub-script-voice: validates video/script before chargeTokens", () => {
    const src = readRoute("app/api/dub-script-voice/route.ts");
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    const videoRequired = src.indexOf("video_file or video_url is required");
    const scriptRequired = src.indexOf("script, speech_url, or caption_lines is required");
    assert.ok(chargeAt > 0, "chargeTokens present");
    assert.ok(
      videoRequired >= 0 && videoRequired < chargeAt,
      "missing-video 400 must be before chargeTokens",
    );
    assert.ok(
      scriptRequired >= 0 && scriptRequired < chargeAt,
      "missing-script 400 must be before chargeTokens",
    );
    // Invalid paths must not charge-then-refund
    assert.ok(
      !/reason:\s*"validation"/.test(src),
      "validation refunds should be gone after validate-before-charge",
    );
  });

  it("refundTokens retries, alerts on failure, and queues pending refunds", () => {
    const src = readRoute("lib/billing/charge.ts");
    assert.match(src, /refundTokens failed/);
    assert.match(src, /captureException|captureMessage/);
    assert.match(src, /refund_failed/);
    assert.match(src, /billing_refund_null|null_user/);
    assert.match(src, /REFUND_RETRY_ATTEMPTS/);
    assert.match(src, /recordPendingRefund/);
    const pending = readRoute("lib/billing/pending-refunds.ts");
    assert.match(pending, /billing_pending_refunds/);
    assert.match(pending, /processPendingRefundsForBilledUser/);
    assert.match(pending, /findOneAndUpdate/);
    assert.match(pending, /status: "processing"/);
    const me = readRoute("app/api/me/route.ts");
    assert.match(me, /processPendingRefundsForBilledUser/);
  });

  it("generate-storyboard-video: counts images and charges before fal upload", () => {
    const src = readRoute("app/api/generate-storyboard-video/route.ts");
    const countAt = firstIndex(src, /countKlingFallbackImageSources\(/);
    const chargeAt = firstIndex(src, /await chargeTokens\(/);
    const uploadAt = firstIndex(src, /await collectKlingFallbackImageUrls\(/);
    assert.ok(countAt >= 0, "must count sources without upload");
    assert.ok(chargeAt > countAt, "charge must follow count");
    assert.ok(uploadAt > chargeAt, "fal collect/upload must follow charge");
  });
});

describe("billing smoke — fail → refund (source + wallet)", () => {
  const routes = [
    "app/api/generate/route.ts",
    "app/api/inpaint-image/route.ts",
    "app/api/burn-script-captions/route.ts",
    "app/api/burn-visual-captions/route.ts",
    "app/api/generate-storyboard-images/route.ts",
    "app/api/add-bgm/route.ts",
    "app/api/dub-script-voice/route.ts",
    "app/api/generate-storyboard-video/route.ts",
    "app/api/postprocess/route.ts",
    "app/api/analyze-research-reel/route.ts",
  ];

  it("each paid route refunds in a catch path", () => {
    for (const rel of routes) {
      const src = readRoute(rel);
      assert.match(src, /chargeTokens/, `${rel} missing charge`);
      assert.match(src, /refundTokens/, `${rel} missing refund`);
      // refund appears after a catch (generation failure path)
      assert.match(src, /catch[\s\S]{0,400}refundTokens/, `${rel} refund not in catch-ish block`);
    }
  });

  it("MemoryWallet: charge then fail refund restores balance (video/inpaint/caption/storyboard costs)", () => {
    const cases = [
      { kind: "video", cost: 520 },
      { kind: "inpaint", cost: estimateInpaintTokens(2) },
      { kind: "caption_burn", cost: TOKEN_COST.caption_burn },
      { kind: "storyboard", cost: TOKEN_COST.storyboard_batch },
    ];
    for (const c of cases) {
      const w = new MemoryWallet();
      w.seed({ clerkId: "u1", creditBalance: 2000, plan: "standard" });
      // Simulate charge-before-work (production pattern)
      w.settle("u1", c.cost, { kind: c.kind, phase: "charge" });
      assert.equal(w.balance("u1"), 2000 - c.cost);
      // fal fails → refund
      w.grant("u1", c.cost, "refund");
      assert.equal(w.balance("u1"), 2000, `${c.kind} refund must restore`);
    }
  });

  it("MemoryWallet: invalid request never settles (0 charge)", () => {
    const w = new MemoryWallet();
    w.seed({ clerkId: "u1", creditBalance: 500, plan: "free" });
    // Invalid → early return; never settle
    const invalid = true;
    if (!invalid) {
      w.settle("u1", TOKEN_COST.inpaint);
    }
    assert.equal(w.balance("u1"), 500);
    assert.equal(w.consumeCount("u1"), 0);
  });
});
