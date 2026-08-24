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
  H3_TOKENS_PER_SEC,
  KLING_TURBO_PRO,
  MASTER_YEARLY_USD_PER_TOKEN,
  TOKEN_COST,
  VIDEO_TOKENS_PER_SEC,
  cogsUsdForTokens,
  estimateH3Tokens,
  h3BillingResolutionForPlan,
  h3TokenCost,
  tokensForFalUsd,
  videoTokenCost,
} from "../lib/billing/token-costs";

describe("billing token economics", () => {
  it("anchors 1000 tokens to Master-yearly 75% fal COGS (~USD 1.23)", () => {
    assert.equal(TOKEN_COGS_USD_PER_1000, 1.234375);
    assert.equal(cogsUsdForTokens(1000), 1.23);
    assert.equal(cogsUsdForTokens(3000), 3.7);
  });

  it("sizes fal actions at ~75% on Master yearly $0.0049375/token", () => {
    assert.equal(MASTER_YEARLY_USD_PER_TOKEN, 79 / 16_000);
    assert.equal(tokensForFalUsd(0.08), 65);
    assert.equal(tokensForFalUsd(0.35), 284);
    assert.equal(TOKEN_COST.image, 65);
    assert.equal(H3_TOKENS_PER_SEC["480P"], 41);
    assert.equal(H3_TOKENS_PER_SEC["768P"], 65);
    assert.equal(H3_TOKENS_PER_SEC["2K"], 106);
    assert.equal(KLING_TURBO_PRO.tokens5s, 284);
    const user = 65 * MASTER_YEARLY_USD_PER_TOKEN;
    const margin = (user - 0.08) / user;
    assert.ok(margin >= 0.74 && margin <= 0.76, `image margin ${margin}`);
  });

  it("Free signup grant is below one image + one 8s 480P video combo", () => {
    assert.equal(FREE_PACK.image, TOKEN_COST.image);
    assert.equal(FREE_PACK.video8s480p, h3TokenCost("480P", 8));
    assert.equal(FREE_PACK.total, 393);
    assert.equal(FREE_PACK.grant, 300);
    assert.ok(FREE_PACK.total > FREE_PACK.grant);
    assert.equal(PLAN_DEFINITIONS.free.grantCogsUsd, 0.37);
    assert.equal(cogsUsdForTokens(300), 0.37);
  });

  it("8s video matches the 75% table at each H3 enum", () => {
    assert.equal(estimateH3Tokens({ resolution: "480p", duration: 8 }), 328);
    assert.equal(estimateH3Tokens({ resolution: "480P", duration: 8 }), 328);
    assert.equal(estimateH3Tokens({ resolution: "768P", duration: 8 }), 520);
    assert.equal(estimateH3Tokens({ resolution: "720p", duration: 8 }), 520);
    assert.equal(estimateH3Tokens({ resolution: "2K", duration: 8 }), 848);
    assert.equal(estimateH3Tokens({ resolution: "1080p", duration: 8 }), 848);
    assert.equal(h3BillingResolutionForPlan("free"), "480P");
    assert.equal(h3BillingResolutionForPlan("standard"), "768P");
    assert.equal(h3BillingResolutionForPlan("pro"), "2K");
    assert.equal(h3TokenCost("480P", 12), 492);
  });

  it("Seedance 8s is priced so we do not lose money vs fal", () => {
    assert.equal(videoTokenCost("480p", 8), VIDEO_TOKENS_PER_SEC["480p"] * 8);
    assert.equal(videoTokenCost("720p", 8), 1968);
    assert.equal(videoTokenCost("1080p", 8), 4424);
  });

  it("Standard yearly stays at or above ~75% on full token burn", () => {
    const std = PLAN_DEFINITIONS.standard;
    assert.equal(std.monthlyTokens, 8000);
    assert.equal(std.grantCogsUsd, 9.88);
    assert.ok(marginPct(std.monthlyPriceUsd!, std.grantCogsUsd) >= 80);
    assert.ok(marginPct(std.yearlyPriceUsd!, std.grantCogsUsd) >= 75);
  });

  it("Pro / Master yearly stay at or above ~75% on full token burn", () => {
    const pro = PLAN_DEFINITIONS.pro;
    const master = PLAN_DEFINITIONS.master;
    assert.ok(marginPct(pro.yearlyPriceUsd!, pro.grantCogsUsd) >= 75);
    assert.ok(marginPct(master.yearlyPriceUsd!, master.grantCogsUsd) >= 75);
    assert.ok(marginPct(pro.monthlyPriceUsd!, pro.grantCogsUsd) >= 80);
    assert.ok(marginPct(master.monthlyPriceUsd!, master.grantCogsUsd) >= 79);
  });

  it("normalizes legacy payg → standard", () => {
    assert.equal(normalizeUserPlan("payg"), "standard");
    assert.equal(normalizeUserPlan("pro"), "pro");
    assert.equal(normalizeUserPlan("master"), "master");
  });
});
