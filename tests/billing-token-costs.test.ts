import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLAN_DEFINITIONS,
  TOKEN_COGS_USD_PER_1000,
  marginPct,
  normalizeUserPlan,
} from "../lib/billing/plans";
import {
  FREE_PACK,
  TOKEN_COST,
  cogsUsdForTokens,
  videoTokenCost,
} from "../lib/billing/token-costs";

describe("billing token economics", () => {
  it("anchors 1000 tokens to ~USD 3.30 COGS", () => {
    assert.equal(TOKEN_COGS_USD_PER_1000, 3.3);
    assert.equal(cogsUsdForTokens(1000), 3.3);
    assert.equal(cogsUsdForTokens(3000), 9.9);
  });

  it("Free pack fits 1 image + 1× 8s 480p inside 1000 tokens", () => {
    assert.equal(FREE_PACK.image, TOKEN_COST.image);
    assert.equal(FREE_PACK.video8s480p, videoTokenCost("480p", 8));
    assert.ok(FREE_PACK.total <= FREE_PACK.grant);
    assert.equal(FREE_PACK.total, 545);
    assert.equal(FREE_PACK.buffer, 455);
  });

  it("Standard monthly promo keeps ~50% margin on full token burn", () => {
    const std = PLAN_DEFINITIONS.standard;
    assert.equal(std.monthlyTokens, 3000);
    assert.equal(std.grantCogsUsd, 9.9);
    assert.equal(marginPct(std.monthlyPriceUsd!, std.grantCogsUsd), 50.5);
    // Yearly is thinner (~33%) by design (50% off list).
    assert.ok(marginPct(std.yearlyPriceUsd!, std.grantCogsUsd) > 30);
  });

  it("Pro / Master monthly promo stay near 50% margin", () => {
    const pro = PLAN_DEFINITIONS.pro;
    const master = PLAN_DEFINITIONS.master;
    assert.ok(Math.abs(marginPct(pro.monthlyPriceUsd!, pro.grantCogsUsd) - 47.2) < 1);
    assert.ok(Math.abs(marginPct(master.monthlyPriceUsd!, master.grantCogsUsd) - 47.2) < 1);
  });

  it("normalizes legacy payg → standard", () => {
    assert.equal(normalizeUserPlan("payg"), "standard");
    assert.equal(normalizeUserPlan("pro"), "pro");
    assert.equal(normalizeUserPlan("master"), "master");
  });
});
