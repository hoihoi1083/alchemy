import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkoutPaymentCleared,
  subscriptionStatusGrantsPaidEntitlements,
} from "../lib/stripe/payment-cleared";

describe("checkout payment must clear before plan unlock", () => {
  it("rejects unpaid complete Checkout (delayed bank / ACH)", () => {
    assert.equal(
      checkoutPaymentCleared({ payment_status: "unpaid" }),
      false,
    );
  });

  it("accepts paid and $0 / coupon (no_payment_required)", () => {
    assert.equal(checkoutPaymentCleared({ payment_status: "paid" }), true);
    assert.equal(
      checkoutPaymentCleared({ payment_status: "no_payment_required" }),
      true,
    );
  });

  it("does not treat session.status=complete as payment", () => {
    // Regression: confirm-checkout used to scan `paid OR complete`, which
    // unlocked Master on unpaid delayed methods.
    const completeUnpaid = { status: "complete", payment_status: "unpaid" as const };
    assert.equal(checkoutPaymentCleared(completeUnpaid), false);
  });
});

describe("subscription status must be in a paid period before plan unlock", () => {
  it("grants entitlements only for active, trialing, past_due", () => {
    assert.equal(subscriptionStatusGrantsPaidEntitlements("active"), true);
    assert.equal(subscriptionStatusGrantsPaidEntitlements("trialing"), true);
    assert.equal(subscriptionStatusGrantsPaidEntitlements("past_due"), true);
  });

  it("blocks incomplete first invoices (money has not cleared)", () => {
    assert.equal(subscriptionStatusGrantsPaidEntitlements("incomplete"), false);
    assert.equal(subscriptionStatusGrantsPaidEntitlements("paused"), false);
  });

  it("ended statuses stay outside the grant set (webhook clears separately)", () => {
    assert.equal(subscriptionStatusGrantsPaidEntitlements("canceled"), false);
    assert.equal(subscriptionStatusGrantsPaidEntitlements("unpaid"), false);
    assert.equal(
      subscriptionStatusGrantsPaidEntitlements("incomplete_expired"),
      false,
    );
  });
});
