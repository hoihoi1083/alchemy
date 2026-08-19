import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  comparePaidPlans,
  isBillingInterval,
  isPaidPlan,
  paidPlanRank,
  planFromPriceId,
  priceIdForPlan,
  topUpPriceId,
} from "../lib/stripe/prices";
import { upgradeTokenGrantAmount } from "../lib/stripe/billing-sync";

const ENV_KEYS = [
  "STRIPE_PRICE_STANDARD_MONTHLY",
  "STRIPE_PRICE_STANDARD_YEARLY",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_YEARLY",
  "STRIPE_PRICE_MASTER_MONTHLY",
  "STRIPE_PRICE_MASTER_YEARLY",
  "STRIPE_PRICE_CUSTOM_MONTHLY",
  "STRIPE_PRICE_CUSTOM_YEARLY",
  "STRIPE_PRICE_TOPUP",
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (key in saved) {
      const v = saved[key];
      if (v === undefined) delete process.env[key];
      else process.env[key] = v;
      delete saved[key];
    }
  }
});

function setEnv(map: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (!(key in saved)) saved[key] = process.env[key];
  }
  for (const [k, v] of Object.entries(map)) {
    process.env[k] = v;
  }
}

describe("stripe price mapping", () => {
  it("validates plan and interval helpers", () => {
    assert.equal(isPaidPlan("pro"), true);
    assert.equal(isPaidPlan("custom"), true);
    assert.equal(isPaidPlan("free"), false);
    assert.equal(isBillingInterval("yearly"), true);
    assert.equal(isBillingInterval("weekly"), false);
  });

  it("resolves env price ids and reverse-maps them", () => {
    setEnv({
      STRIPE_PRICE_STANDARD_MONTHLY: "price_std_m",
      STRIPE_PRICE_STANDARD_YEARLY: "price_std_y",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_m",
      STRIPE_PRICE_PRO_YEARLY: "price_pro_y",
      STRIPE_PRICE_MASTER_MONTHLY: "price_mst_m",
      STRIPE_PRICE_MASTER_YEARLY: "price_mst_y",
      STRIPE_PRICE_CUSTOM_MONTHLY: "price_ent_m",
      STRIPE_PRICE_CUSTOM_YEARLY: "price_ent_y",
      STRIPE_PRICE_TOPUP: "price_top",
    });

    assert.equal(priceIdForPlan("standard", "monthly"), "price_std_m");
    assert.equal(priceIdForPlan("pro", "yearly"), "price_pro_y");
    assert.equal(priceIdForPlan("custom", "monthly"), "price_ent_m");
    assert.equal(topUpPriceId(), "price_top");
    assert.deepEqual(planFromPriceId("price_mst_y"), {
      plan: "master",
      interval: "yearly",
    });
    assert.deepEqual(planFromPriceId("price_ent_m"), {
      plan: "custom",
      interval: "monthly",
    });
    assert.equal(planFromPriceId("price_unknown"), null);
  });

  it("ranks paid plans and classifies upgrade vs downgrade", () => {
    assert.ok(paidPlanRank("custom") > paidPlanRank("master"));
    assert.ok(paidPlanRank("master") > paidPlanRank("pro"));
    assert.ok(paidPlanRank("pro") > paidPlanRank("standard"));
    assert.equal(comparePaidPlans("standard", "master"), "upgrade");
    assert.equal(comparePaidPlans("master", "custom"), "upgrade");
    assert.equal(comparePaidPlans("custom", "master"), "downgrade");
    assert.equal(comparePaidPlans("master", "standard"), "downgrade");
    assert.equal(comparePaidPlans("pro", "pro"), "lateral");
    assert.equal(comparePaidPlans("standard", "pro"), "upgrade");
    assert.equal(comparePaidPlans("pro", "standard"), "downgrade");
  });

  it("grants full new-plan tokens on upgrade cycle reset", () => {
    assert.equal(upgradeTokenGrantAmount("standard", "master"), 16000);
    assert.equal(upgradeTokenGrantAmount("pro", "master"), 16000);
    assert.equal(upgradeTokenGrantAmount("master", "custom"), 40000);
    assert.equal(upgradeTokenGrantAmount("standard", "pro"), 8000);
    assert.equal(upgradeTokenGrantAmount("master", "standard"), 0);
    assert.equal(upgradeTokenGrantAmount("pro", "pro"), 0);
  });
});
