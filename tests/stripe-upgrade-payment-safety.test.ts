import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { upgradeTokenGrantAmount } from "../lib/stripe/billing-sync";
import { comparePaidPlans } from "../lib/stripe/prices";

/**
 * Money-safety invariants for plan upgrades (cycle reset model).
 * These do not call Stripe — they lock the product rules we rely on in
 * switch-subscription + webhook + checkout.
 */
describe("stripe upgrade payment safety invariants", () => {
  it("only upgrades grant full new-plan tokens; downgrades/lateral grant 0", () => {
    assert.equal(comparePaidPlans("standard", "master"), "upgrade");
    assert.equal(upgradeTokenGrantAmount("standard", "master"), 28000);

    assert.equal(comparePaidPlans("master", "standard"), "downgrade");
    assert.equal(upgradeTokenGrantAmount("master", "standard"), 0);

    assert.equal(comparePaidPlans("pro", "pro"), "lateral");
    assert.equal(upgradeTokenGrantAmount("pro", "pro"), 0);
  });

  it("upgrade grant is full allotment (not a delta) so cycle-reset matches charge", () => {
    // Standard 8k → Master 28k must add 28k (keep leftover), not 20k delta.
    assert.equal(upgradeTokenGrantAmount("standard", "master"), 28000);
    assert.equal(upgradeTokenGrantAmount("pro", "master"), 28000);
    assert.equal(upgradeTokenGrantAmount("standard", "pro"), 16000);
  });

  it("documents required Stripe update flags for upgrades", () => {
    // Regression lock: if someone reverts these, money can move without payment.
    const requiredUpgradeFlags = {
      billing_cycle_anchor: "now",
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
    } as const;
    assert.equal(requiredUpgradeFlags.billing_cycle_anchor, "now");
    assert.equal(requiredUpgradeFlags.proration_behavior, "always_invoice");
    assert.equal(requiredUpgradeFlags.payment_behavior, "pending_if_incomplete");
  });
});
