import type Stripe from "stripe";
import {
  PRO_TRIAL_BONUS_TOKENS,
  TOP_UP_PRICE_USD,
  TOP_UP_TOKENS,
  normalizeUserPlan,
} from "@/lib/billing/plans";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  applyTopUpGrant,
  attachStripeCustomerWithoutPlanChange,
  findClerkIdByStripeCustomer,
  grantTokensOnce,
  markProTrialUsed,
  setUserSubscription,
} from "@/lib/stripe/billing-sync";
import { checkoutPaymentCleared } from "@/lib/stripe/payment-cleared";
import { isPaidPlan, type PaidPlan } from "@/lib/stripe/prices";
import { getStripe } from "@/lib/stripe/client";

const BILLABLE_SUB_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

function proTrialBonusRef(clerkId: string): string {
  return `pro_trial_bonus_${clerkId}`;
}

async function hasProTrialBonusGranted(clerkId: string): Promise<boolean> {
  if (!isMongoConfigured()) return false;
  const db = await getDb();
  const ref = proTrialBonusRef(clerkId);
  const existing = await db.collection("credit_transactions").findOne({ ref });
  return Boolean(existing);
}

/**
 * Re-validate at fulfill time (webhook / confirm may run after checkout API checks).
 * Idempotent retries are allowed when +700 was already granted for this clerkId.
 */
async function assertProTrialFulfillEligible(opts: {
  clerkId: string;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
}): Promise<{ ok: true; idempotent: boolean } | { ok: false; reason: string }> {
  const idempotent = await hasProTrialBonusGranted(opts.clerkId);
  if (idempotent) {
    return { ok: true, idempotent: true };
  }

  if (!isMongoConfigured()) {
    return { ok: false, reason: "trial_not_eligible_no_db" };
  }

  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId: opts.clerkId });
  if (!user) {
    return { ok: false, reason: "trial_not_eligible_no_user" };
  }

  if (normalizeUserPlan(user.plan) !== "free") {
    return { ok: false, reason: "trial_not_eligible_plan" };
  }
  if (user.hasUsedProTrial) {
    return { ok: false, reason: "trial_already_used" };
  }

  if (!opts.subscriptionId) {
    return { ok: false, reason: "trial_not_eligible_no_sub" };
  }

  try {
    const stripe = getStripe();
    if (opts.stripeCustomerId) {
      const listed = await stripe.subscriptions.list({
        customer: opts.stripeCustomerId,
        status: "all",
        limit: 20,
      });
      const otherBillable = listed.data.filter(
        (s) =>
          BILLABLE_SUB_STATUSES.has(s.status) && s.id !== opts.subscriptionId,
      );
      if (otherBillable.length > 0) {
        return { ok: false, reason: "trial_not_eligible_existing_sub" };
      }
    }
    const sub = await stripe.subscriptions.retrieve(opts.subscriptionId);
    if (sub.status !== "trialing") {
      return { ok: false, reason: "trial_not_trialing" };
    }
  } catch (err) {
    console.warn("[stripe] pro_trial fulfill eligibility check failed", err);
    return { ok: false, reason: "trial_eligibility_check_failed" };
  }

  return { ok: true, idempotent: false };
}

async function readTrialEndsAt(subId: string | null): Promise<Date | null> {
  if (!subId) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(subId);
    if (sub.trial_end) return new Date(sub.trial_end * 1000);
  } catch {
    /* ignore */
  }
  return null;
}

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
    if (!checkoutPaymentCleared(session)) {
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

  const subId = subscriptionId(session.subscription);
  if (!checkoutPaymentCleared(session)) {
    await attachStripeCustomerWithoutPlanChange({
      clerkId,
      stripeCustomerId: cust,
      stripeSubscriptionId: subId,
    });
    return {
      kind: "subscription",
      clerkId,
      granted: false,
      balanceAfter: null,
      tokensGranted: 0,
      reason: "not_paid",
    };
  }

  // Pro trial: grant +700 first, then unlock Pro; full monthly tokens on first paid invoice.
  if (kind === "pro_trial") {
    const eligibility = await assertProTrialFulfillEligible({
      clerkId,
      stripeCustomerId: cust,
      subscriptionId: subId,
    });
    if (!eligibility.ok) {
      console.warn("[stripe] pro_trial fulfill rejected", {
        sessionId: session.id,
        clerkId,
        reason: eligibility.reason,
      });
      await attachStripeCustomerWithoutPlanChange({
        clerkId,
        stripeCustomerId: cust,
        stripeSubscriptionId: subId,
      });
      return {
        kind: "subscription",
        clerkId,
        granted: false,
        balanceAfter: null,
        tokensGranted: 0,
        reason: eligibility.reason,
      };
    }

    const bonusRef = proTrialBonusRef(clerkId);
    const bonus = await grantTokensOnce(
      clerkId,
      PRO_TRIAL_BONUS_TOKENS,
      "trial_bonus",
      bonusRef,
      { sessionId: session.id, plan: "pro" },
    );

    const bonusAlreadyThere = eligibility.idempotent || (await hasProTrialBonusGranted(clerkId));
    if (!bonus.granted && !bonusAlreadyThere) {
      console.error("[stripe] pro_trial bonus grant failed — plan not upgraded", {
        sessionId: session.id,
        clerkId,
      });
      await attachStripeCustomerWithoutPlanChange({
        clerkId,
        stripeCustomerId: cust,
        stripeSubscriptionId: subId,
      });
      return {
        kind: "subscription",
        clerkId,
        granted: false,
        balanceAfter: bonus.balanceAfter,
        tokensGranted: 0,
        reason: "trial_bonus_failed",
      };
    }

    const trialEndsAt = await readTrialEndsAt(subId);
    await setUserSubscription({
      clerkId,
      plan: "pro",
      stripeCustomerId: cust,
      stripeSubscriptionId: subId,
      planRenewsAt: trialEndsAt,
    });
    await markProTrialUsed(clerkId, { proTrialEndsAt: trialEndsAt });

    return {
      kind: "subscription",
      clerkId,
      granted: bonus.granted,
      balanceAfter: bonus.balanceAfter,
      tokensGranted: bonus.granted ? PRO_TRIAL_BONUS_TOKENS : 0,
      reason: bonus.granted
        ? "pro_trial_started"
        : bonusAlreadyThere
          ? "pro_trial_synced"
          : "pro_trial_partial",
    };
  }

  await setUserSubscription({
    clerkId,
    plan,
    stripeCustomerId: cust,
    stripeSubscriptionId: subId,
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
