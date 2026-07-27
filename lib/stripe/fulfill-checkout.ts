import type Stripe from "stripe";
import {
  TOP_UP_PRICE_USD,
  TOP_UP_TOKENS,
} from "@/lib/billing/plans";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import {
  applyTopUpGrant,
  findClerkIdByStripeCustomer,
  setUserSubscription,
} from "@/lib/stripe/billing-sync";
import { isPaidPlan, type PaidPlan } from "@/lib/stripe/prices";

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if ("deleted" in value && value.deleted) return null;
  return value.id;
}

function subscriptionId(
  value: string | Stripe.Subscription | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id;
}

export async function resolveCheckoutClerkId(opts: {
  metadataClerkId?: string | null;
  clientReferenceId?: string | null;
  customer?: string | null;
}): Promise<string | null> {
  if (opts.metadataClerkId) return opts.metadataClerkId;
  if (opts.clientReferenceId) return opts.clientReferenceId;
  if (opts.customer) return findClerkIdByStripeCustomer(opts.customer);
  return null;
}

export type FulfillCheckoutResult = {
  kind: "topup" | "subscription" | "skipped";
  clerkId: string | null;
  granted: boolean;
  balanceAfter: number | null;
  tokensGranted: number;
  reason?: string;
};

/**
 * Idempotent: same Stripe session can be fulfilled from webhook and/or success-page confirm.
 */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillCheckoutResult> {
  const clerkId = await resolveCheckoutClerkId({
    metadataClerkId: session.metadata?.clerkId,
    clientReferenceId: session.client_reference_id,
    customer: customerId(session.customer),
  });
  if (!clerkId) {
    console.error("[stripe] checkout missing clerkId", session.id);
    return {
      kind: "skipped",
      clerkId: null,
      granted: false,
      balanceAfter: null,
      tokensGranted: 0,
      reason: "missing_clerk_id",
    };
  }

  const kind =
    session.metadata?.kind ?? (session.mode === "payment" ? "topup" : "subscription");
  const cust = customerId(session.customer);

  if (kind === "topup" || session.mode === "payment") {
    if (session.payment_status !== "paid") {
      return {
        kind: "topup",
        clerkId,
        granted: false,
        balanceAfter: null,
        tokensGranted: 0,
        reason: "not_paid",
      };
    }
    const result = await applyTopUpGrant({
      clerkId,
      ref: `checkout_${session.id}`,
      stripeCustomerId: cust,
      meta: { sessionId: session.id },
    });
    if (result.granted) {
      const to = await resolvePurchaseEmail({
        clerkId,
        stripeEmail: session.customer_details?.email ?? session.customer_email,
      });
      if (to) {
        await sendPurchaseConfirmationEmail({
          to,
          kind: "topup",
          tokensGranted: TOP_UP_TOKENS,
          balanceAfter: result.balanceAfter,
          amountLabel: `$${TOP_UP_PRICE_USD.toFixed(2)}`,
          purchasedAt: session.created
            ? new Date(session.created * 1000)
            : new Date(),
        });
      }
    }
    return {
      kind: "topup",
      clerkId,
      granted: result.granted,
      balanceAfter: result.balanceAfter,
      tokensGranted: result.granted ? TOP_UP_TOKENS : 0,
      reason: result.granted ? undefined : "already_granted_or_refused",
    };
  }

  const planMeta = session.metadata?.plan;
  const plan: PaidPlan | null = planMeta && isPaidPlan(planMeta) ? planMeta : null;
  if (!plan) {
    console.error("[stripe] checkout missing plan metadata", session.id);
    return {
      kind: "subscription",
      clerkId,
      granted: false,
      balanceAfter: null,
      tokensGranted: 0,
      reason: "missing_plan",
    };
  }
  await setUserSubscription({
    clerkId,
    plan,
    stripeCustomerId: cust,
    stripeSubscriptionId: subscriptionId(session.subscription),
  });
  // Token grant for subscriptions happens on invoice.paid (idempotent).
  return {
    kind: "subscription",
    clerkId,
    granted: false,
    balanceAfter: null,
    tokensGranted: 0,
    reason: "subscription_synced_await_invoice",
  };
}
