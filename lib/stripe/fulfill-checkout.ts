import type Stripe from "stripe";
import {
  TOP_UP_PRICE_USD,
  TOP_UP_TOKENS,
} from "@/lib/billing/plans";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
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
  emailSent?: boolean;
};

/**
 * Send top-up receipt once per Checkout session (separate from token grant lock).
 * Fixes: webhook grants first → confirm-checkout gets granted:false → email never sent.
 */
async function sendTopUpReceiptOnce(opts: {
  session: Stripe.Checkout.Session;
  clerkId: string;
  balanceAfter: number | null;
}): Promise<boolean> {
  const sessionId = opts.session.id;
  const emailRef = `email_checkout_${sessionId}`;

  if (isMongoConfigured()) {
    const db = await getDb();
    type BillingLock = { _id: string; clerkId: string; reason: string; createdAt: Date };
    const locks = db.collection<BillingLock>("billing_event_locks");
    const prior = await locks.findOneAndUpdate(
      { _id: emailRef },
      {
        $setOnInsert: {
          clerkId: opts.clerkId,
          reason: "topup_receipt",
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "before" },
    );
    if (prior) {
      console.info("[email] top-up receipt already sent for session", sessionId);
      return false;
    }
  }

  const to = await resolvePurchaseEmail({
    clerkId: opts.clerkId,
    stripeEmail: opts.session.customer_details?.email ?? opts.session.customer_email,
  });
  if (!to) {
    console.warn("[email] top-up receipt skipped — no recipient", {
      sessionId,
      clerkId: opts.clerkId,
    });
    // Release email lock so a later retry can send once email is known.
    if (isMongoConfigured()) {
      const db = await getDb();
      type BillingLock = { _id: string; clerkId: string; reason: string; createdAt: Date };
      await db
        .collection<BillingLock>("billing_event_locks")
        .deleteOne({ _id: emailRef })
        .catch(() => undefined);
    }
    return false;
  }

  let balanceAfter = opts.balanceAfter;
  if (balanceAfter == null && isMongoConfigured()) {
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId: opts.clerkId });
    balanceAfter = user?.creditBalance ?? null;
  }

  const result = await sendPurchaseConfirmationEmail({
    to,
    kind: "topup",
    tokensGranted: TOP_UP_TOKENS,
    balanceAfter,
    amountLabel:
      typeof opts.session.amount_total === "number"
        ? `$${(opts.session.amount_total / 100).toFixed(2)}`
        : `$${TOP_UP_PRICE_USD.toFixed(2)}`,
    purchasedAt: opts.session.created
      ? new Date(opts.session.created * 1000)
      : new Date(),
  });

  if (!result.sent) {
    console.error("[email] top-up receipt send failed", {
      sessionId,
      to,
      skipped: result.skipped,
      error: result.error,
    });
    if (isMongoConfigured()) {
      const db = await getDb();
      type BillingLock = { _id: string; clerkId: string; reason: string; createdAt: Date };
      await db
        .collection<BillingLock>("billing_event_locks")
        .deleteOne({ _id: emailRef })
        .catch(() => undefined);
    }
    return false;
  }

  console.info("[email] top-up receipt sent", { sessionId, to, id: result.id });
  return true;
}

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
    // Receipt is independent of grant race: webhook may credit first, confirm second.
    const emailSent = await sendTopUpReceiptOnce({
      session,
      clerkId,
      balanceAfter: result.balanceAfter,
    });
    return {
      kind: "topup",
      clerkId,
      granted: result.granted,
      balanceAfter: result.balanceAfter,
      tokensGranted: result.granted ? TOP_UP_TOKENS : 0,
      reason: result.granted ? undefined : "already_granted_or_refused",
      emailSent,
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
