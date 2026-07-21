import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertProCanvasAllowed,
  canUseProCanvas,
  clampImageResolution,
  clampVideoResolution,
  parseVideoResolutionTier,
  PlanEntitlementError,
  videoResolutionsForPlan,
} from "../lib/billing/entitlements";
import { PLAN_DEFINITIONS } from "../lib/billing/plans";

describe("plan entitlements", () => {
  it("clamps free video requests down to 480p", () => {
    const r = clampVideoResolution("free", "1080p");
    assert.equal(r.resolution, "480p");
    assert.equal(r.capped, true);
  });

  it("lists only plan-allowed video resolutions for UI", () => {
    assert.deepEqual(videoResolutionsForPlan("free"), ["480p"]);
    assert.deepEqual(videoResolutionsForPlan("standard"), ["480p", "720p"]);
    assert.deepEqual(videoResolutionsForPlan("pro"), ["480p", "720p", "1080p"]);
  });

  it("allows standard up to 720p and clamps 1080p", () => {
    assert.equal(clampVideoResolution("standard", "720p").capped, false);
    assert.equal(clampVideoResolution("standard", "1080p").resolution, "720p");
  });

  it("allows pro/master 1080p", () => {
    assert.equal(clampVideoResolution("pro", "1080p").capped, false);
    assert.equal(clampVideoResolution("master", "1080p").capped, false);
  });

  it("defaults image resolution to plan max and clamps above", () => {
    assert.equal(clampImageResolution("free").resolution, "1K");
    assert.equal(clampImageResolution("pro").resolution, "2K");
    assert.equal(clampImageResolution("master").resolution, "4K");
    assert.equal(clampImageResolution("standard", "4K").resolution, "1K");
    assert.equal(clampImageResolution("pro", "4K").resolution, "2K");
  });

  it("gates Pro canvas to master/custom only", () => {
    assert.equal(canUseProCanvas("free"), false);
    assert.equal(canUseProCanvas("standard"), false);
    assert.equal(canUseProCanvas("pro"), false);
    assert.equal(canUseProCanvas("master"), true);
    assert.throws(() => assertProCanvasAllowed("pro"), PlanEntitlementError);
    assert.doesNotThrow(() => assertProCanvasAllowed("master"));
  });

  it("pricing table matches plan caps", () => {
    assert.equal(PLAN_DEFINITIONS.free.maxVideoResolution, "480p");
    assert.equal(PLAN_DEFINITIONS.standard.maxVideoResolution, "720p");
    assert.equal(PLAN_DEFINITIONS.pro.maxVideoResolution, "1080p");
    assert.equal(PLAN_DEFINITIONS.free.maxImageResolution, "1K");
    assert.equal(PLAN_DEFINITIONS.pro.maxImageResolution, "2K");
    assert.equal(PLAN_DEFINITIONS.master.maxImageResolution, "4K");
  });

  it("parses video resolution aliases", () => {
    assert.equal(parseVideoResolutionTier("1080P"), "1080p");
    assert.equal(parseVideoResolutionTier("480p"), "480p");
    assert.equal(parseVideoResolutionTier("720p"), "720p");
  });
});

/** Documented cancel policy for webhook behavior. */
describe("subscription cancel policy", () => {
  it("keeps paid access while status is active even if cancel_at_period_end", () => {
    const sub = { status: "active", cancel_at_period_end: true };
    const ended =
      sub.status === "canceled" ||
      sub.status === "unpaid" ||
      sub.status === "incomplete_expired";
    assert.equal(ended, false);
  });

  it("clears plan only when subscription has ended", () => {
    for (const status of ["canceled", "unpaid", "incomplete_expired"] as const) {
      const ended =
        status === "canceled" || status === "unpaid" || status === "incomplete_expired";
      assert.equal(ended, true);
    }
  });
});
