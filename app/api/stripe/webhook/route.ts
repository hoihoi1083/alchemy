import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  notifyPaymentFailedOnce,
  notifySubscriptionEndedOnce,
  notifyUpgradeReceiptOnce,
  sendLockedEmail,
} from "@/lib/email/billing-notices";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import {
  applySubscriptionGrant,
  clearPaidSubscriptionIfNoActiveSub,
  findClerkIdByStripeCustomer,
  grantPlanUpgradeDelta,
  setUserSubscription,
  tokensForPaidPlan,
} from "@/lib/stripe/billing-sync";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  fulfillCheckoutSession,
  resolveCheckoutClerkId,
} from "@/lib/stripe/fulfill-checkout";
import { subscriptionStatusGrantsPaidEntitlements } from "@/lib/stripe/payment-cleared";
import { isPaidPlan, planFromPriceId, type PaidPlan } from "@/lib/stripe/prices";
import { isMongoConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";

/** Only these invoice reasons should credit a full monthly subscription grant. */
const SUBSCRIPTION_GRANT_REASONS = new Set([
  "subscription_create",
  "subscription_cycle",
]);

function customerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  await fulfillCheckoutSession(session);
}

async function handleCheckoutAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
) {
  await fulfillCheckoutSession(session);
}

async function handleCheckoutAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
) {
  console.info("[stripe] checkout.session.async_payment_failed — plan not unlocked", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const cust = customerId(invoice.customer);
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subId = subscriptionId(subRef ?? null);

  const stripe = getStripe();
  let plan: PaidPlan | null = null;
  let clerkId: string | null = null;
  let renewsAt: Date | null = null;
  let previousPlanMeta: PaidPlan | null = null;
  let periodStart: number | null = null;

  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    clerkId = sub.metadata?.clerkId ?? null;
    const planMeta = sub.metadata?.plan;
    if (planMeta && isPaidPlan(planMeta)) plan = planMeta;
    const prevRaw = sub.metadata?.previousPlan;
    if (prevRaw && isPaidPlan(prevRaw)) previousPlanMeta = prevRaw;
    const priceId = sub.items.data[0]?.price?.id;
    if (!plan && priceId) {
      plan = planFromPriceId(priceId)?.plan ?? null;
    }
    const periodEnd = sub.items.data[0]?.current_period_end ?? null;
    periodStart = sub.items.data[0]?.current_period_start ?? null;
    if (periodEnd) renewsAt = new Date(periodEnd * 1000);

    if (sub.pending_update && invoice.billing_reason === "subscription_update") {
      console.info(
        "[stripe] invoice.paid subscription_update — pending_update still set, skip",
        { invoiceId: invoice.id, clerkId },
      );
      return;
    }
  }

  if (!clerkId) {
    clerkId = await resolveCheckoutClerkId({
      metadataClerkId: invoice.metadata?.clerkId,
      customer: cust,
    });
  }
  if (!clerkId || !plan) {
    console.error("[stripe] invoice.paid missing clerkId/plan", invoice.id, {
      clerkId,
      plan,
    });
    return;
  }

  const amountPaid =
    typeof invoice.amount_paid === "number"
      ? `$${(invoice.amount_paid / 100).toFixed(2)}`
      : null;

  // Cycle-reset upgrade invoice — backup grant + receipt (idempotent with checkout).
  if (invoice.billing_reason === "subscription_update") {
    await setUserSubscription({
      clerkId,
      plan,
      stripeCustomerId: cust,
      stripeSubscriptionId: subId,
      planRenewsAt: renewsAt,
      clearPendingPlanChange: true,
    });

    if (
      subId &&
      previousPlanMeta &&
      previousPlanMeta !== plan &&
      periodStart != null
    ) {
      const upgrade = await grantPlanUpgradeDelta({
        clerkId,
        previousPlan: previousPlanMeta,
        newPlan: plan,
        subscriptionId: subId,
        periodStart,
        meta: {
          source: "invoice_paid_subscription_update",
          invoiceId: invoice.id,
        },
      });
      if (upgrade.delta > 0) {
        await notifyUpgradeReceiptOnce({
          clerkId,
          subscriptionId: subId,
          periodStart,
          plan,
          tokensGranted: upgrade.delta,
          balanceAfter: upgrade.balanceAfter,
          renewsAt,
          amountLabel: amountPaid,
          stripeEmail: invoice.customer_email,
        });
      }
      // Clear breadcrumb after upgrade invoice is handled (checkout already used it).
      try {
        await stripe.subscriptions.update(subId, {
          metadata: { previousPlan: "" },
        });
      } catch (err) {
        console.warn(
          "[stripe] clear previousPlan metadata failed",
          subId,
          err instanceof Error ? err.message : err,
        );
      }
      console.info("[stripe] invoice.paid subscription_update — upgrade grant", {
        invoiceId: invoice.id,
        clerkId,
        plan,
        previousPlan: previousPlanMeta,
        granted: upgrade.granted,
        amount: upgrade.delta,
      });
    } else {
      console.info(
        "[stripe] invoice.paid subscription_update — no upgrade grant needed",
        { invoiceId: invoice.id, clerkId, plan, previousPlan: previousPlanMeta },
      );
    }
    return;
  }

  if (!SUBSCRIPTION_GRANT_REASONS.has(invoice.billing_reason ?? "")) {
    console.info("[stripe] invoice.paid — skip grant for billing_reason", {
      invoiceId: invoice.id,
      billingReason: invoice.billing_reason,
      clerkId,
      plan,
    });
    return;
  }

  const result = await applySubscriptionGrant({
    clerkId,
    plan,
    ref: `invoice_${invoice.id}`,
    stripeCustomerId: cust,
    stripeSubscriptionId: subId,
    planRenewsAt: renewsAt,
    meta: {
      invoiceId: invoice.id,
      billingReason: invoice.billing_reason,
    },
  });

  if (invoice.billing_reason === "subscription_cycle") {
    await setUserSubscription({
      clerkId,
      plan,
      stripeCustomerId: cust,
      stripeSubscriptionId: subId,
      planRenewsAt: renewsAt,
      clearPendingPlanChange: true,
    });
  }

  await sendLockedEmail({
    ref: `email_invoice_${invoice.id}`,
    clerkId,
    reason: "subscription_receipt",
    stripeEmail: invoice.customer_email,
    send: (to) =>
      sendPurchaseConfirmationEmail({
        to,
        kind: "subscription",
        plan,
        tokensGranted: tokensForPaidPlan(plan),
        balanceAfter: result.balanceAfter,
        renewsAt,
        amountLabel: amountPaid,
      }),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const cust = customerId(invoice.customer);
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subId = subscriptionId(subRef ?? null);

  let clerkId: string | null = null;
  if (subId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subId);
      clerkId = sub.metadata?.clerkId ?? null;
    } catch (err) {
      console.error(
        "[stripe] invoice.payment_failed retrieve sub failed",
        invoice.id,
        err,
      );
    }
  }
  if (!clerkId) {
    clerkId = await resolveCheckoutClerkId({
      metadataClerkId: invoice.metadata?.clerkId,
      customer: cust,
    });
  }
  if (!clerkId) {
    console.error("[stripe] invoice.payment_failed missing clerkId", invoice.id);
    return;
  }

  // Do not clear plan here — subscription.updated unpaid handles entitlement drop.
  // One email per invoice (Stripe retries must not spam).
  await notifyPaymentFailedOnce({
    clerkId,
    invoiceId: invoice.id,
    stripeEmail: invoice.customer_email,
  });
}

function previousPlanFromSubscriptionEvent(
  previousAttributes: Partial<Stripe.Subscription> | undefined,
): PaidPlan | null {
  if (!previousAttributes) return null;

  const prevMetaPlan = previousAttributes.metadata?.plan;
  if (prevMetaPlan && isPaidPlan(prevMetaPlan)) return prevMetaPlan;

  const prevItems = previousAttributes.items;
  const prevPrice = prevItems?.data?.[0]?.price;
  const prevPriceId =
    typeof prevPrice === "string" ? prevPrice : prevPrice?.id ?? null;
  if (prevPriceId) {
    return planFromPriceId(prevPriceId)?.plan ?? null;
  }
  return null;
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  previousAttributes?: Partial<Stripe.Subscription>,
) {
  const clerkId =
    sub.metadata?.clerkId ??
    (await findClerkIdByStripeCustomer(customerId(sub.customer) ?? ""));
  if (!clerkId) return;

  // Keep paid entitlements while the subscription is still in a paid period.
  // Portal "cancel" usually sets cancel_at_period_end=true with status still active/trialing.
  // Only drop to free when Stripe says the subscription has actually ended.
  const ended =
    sub.status === "canceled" ||
    sub.status === "unpaid" ||
    sub.status === "incomplete_expired";
  if (ended) {
    const result = await clearPaidSubscriptionIfNoActiveSub({
      clerkId,
      customerId: customerId(sub.customer),
      endingSubscriptionId: sub.id,
    });
    // Email only when entitlements were actually dropped (and not for canceled —
    // subscription.deleted handles that). Unpaid / incomplete_expired may not
    // always emit deleted.
    if (result.cleared && sub.status !== "canceled") {
      await notifySubscriptionEndedOnce({
        clerkId,
        reason: "unpaid",
        subscriptionId: sub.id,
      });
    }
    return;
  }

  if (!subscriptionStatusGrantsPaidEntitlements(sub.status)) {
    console.info(
      "[stripe] subscription.updated — skip plan until payment clears",
      { subscriptionId: sub.id, clerkId, status: sub.status },
    );
    return;
  }

  // Payment for an upgrade/switch failed or needs authentication — plan change
  // is NOT applied yet. Do not grant tokens or flip Mongo to the pending price.
  if (sub.pending_update) {
    console.info(
      "[stripe] subscription.updated — pending_update, skip grant/plan flip",
      { subscriptionId: sub.id, clerkId },
    );
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  const fromPrice = priceId ? planFromPriceId(priceId) : null;
  const planMeta = sub.metadata?.plan;
  // Price is source of truth for active entitlements (metadata can lag on schedules).
  const plan: PaidPlan | null =
    fromPrice?.plan ??
    (planMeta && isPaidPlan(planMeta) ? planMeta : null);
  if (!plan) return;

  const pendingRaw = sub.metadata?.pendingPlan;
  const pendingPlan =
    pendingRaw && isPaidPlan(pendingRaw) ? pendingRaw : null;
  const pendingIntervalRaw = sub.metadata?.pendingInterval;
  const pendingInterval =
    pendingIntervalRaw === "monthly" || pendingIntervalRaw === "yearly"
      ? pendingIntervalRaw
      : null;

  // Only upgrade-grant when Stripe previous_attributes show a real plan/price
  // change. Do NOT use metadata.previousPlan alone — it stays on the sub after
  // upgrade and would re-grant on renewals when periodStart changes (new ref).
  // Token backup for upgrades is: checkout API + invoice.paid subscription_update.
  const previousFromEvent = previousPlanFromSubscriptionEvent(previousAttributes);

  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  const periodStart = sub.items.data[0]?.current_period_start ?? null;

  if (previousFromEvent && periodStart != null) {
    const result = await grantPlanUpgradeDelta({
      clerkId,
      previousPlan: previousFromEvent,
      newPlan: plan,
      subscriptionId: sub.id,
      periodStart,
      meta: { source: "webhook_previous_attributes" },
    });
    if (result.delta > 0) {
      await notifyUpgradeReceiptOnce({
        clerkId,
        subscriptionId: sub.id,
        periodStart,
        plan,
        tokensGranted: result.delta,
        balanceAfter: result.balanceAfter,
        renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      });
    }
  }

  const pendingStillActive = Boolean(pendingPlan && pendingPlan !== plan);

  await setUserSubscription({
    clerkId,
    plan,
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
    planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    ...(pendingStillActive
      ? {
          pendingPlan,
          pendingPlanInterval: pendingInterval,
          pendingPlanEffectiveAt: periodEnd ? new Date(periodEnd * 1000) : null,
        }
      : { clearPendingPlanChange: true }),
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const clerkId =
    sub.metadata?.clerkId ??
    (await findClerkIdByStripeCustomer(customerId(sub.customer) ?? ""));
  if (!clerkId) return;
  const result = await clearPaidSubscriptionIfNoActiveSub({
    clerkId,
    customerId: customerId(sub.customer),
    endingSubscriptionId: sub.id,
  });
  // Only email "ended" when we actually dropped them to free.
  if (result.cleared) {
    await notifySubscriptionEndedOnce({
      clerkId,
      reason: "canceled",
      subscriptionId: sub.id,
    });
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe] webhook signature failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutAsyncPaymentSucceeded(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.async_payment_failed":
        await handleCheckoutAsyncPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          event.data.previous_attributes as
            | Partial<Stripe.Subscription>
            | undefined,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
