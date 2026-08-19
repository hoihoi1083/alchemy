import type Stripe from "stripe";

/**
 * Checkout Session `status: complete` only means the customer finished Checkout.
 * Delayed methods (ACH, bank, etc.) stay `payment_status: unpaid` until funds
 * clear. Paid entitlements must wait for that, matching top-ups.
 *
 * `no_payment_required` covers 100% coupons / $0 invoices — money is not owed.
 */
export function checkoutPaymentCleared(
  session: Pick<Stripe.Checkout.Session, "payment_status">,
): boolean {
  return (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  );
}

/**
 * First invoice not paid yet (`incomplete`) must not flip Mongo to Pro/Master.
 * Keep access for existing paid periods: active, trialing, past_due.
 */
export function subscriptionStatusGrantsPaidEntitlements(
  status: Stripe.Subscription.Status | string,
): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
