import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { normalizeUserPlan } from "@/lib/billing/plans";
import { sendSubscriptionEndedEmail } from "@/lib/email/lifecycle";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import type { DbUser } from "@/lib/db/types";
import {
  applySubscriptionGrant,
  clearPaidSubscription,
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
import { isPaidPlan, planFromPriceId, type PaidPlan } from "@/lib/stripe/prices";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export const runtime = "nodejs";

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

async function notifySubscriptionEnded(
  clerkId: string,
  reason: "canceled" | "unpaid",
  stripeEmail?: string | null,
): Promise<void> {
  const to = await resolvePurchaseEmail({ clerkId, stripeEmail });
  if (!to) return;
  await sendSubscriptionEndedEmail({ to, reason });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  await fulfillCheckoutSession(session);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const cust = customerId(invoice.customer);
  const subRef = invoice.parent?.subscription_details?.subscription;
  const subId = subscriptionId(subRef ?? null);

  const stripe = getStripe();
  let plan: PaidPlan | null = null;
  let clerkId: string | null = null;
  let renewsAt: Date | null = null;

  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    clerkId = sub.metadata?.clerkId ?? null;
    const planMeta = sub.metadata?.plan;
    if (planMeta && isPaidPlan(planMeta)) plan = planMeta;
    const priceId = sub.items.data[0]?.price?.id;
    if (!plan && priceId) {
      plan = planFromPriceId(priceId)?.plan ?? null;
    }
    const periodEnd = sub.items.data[0]?.current_period_end ?? null;
    if (periodEnd) renewsAt = new Date(periodEnd * 1000);
  }

  if (!clerkId) {
    clerkId = await resolveCheckoutClerkId({
      metadataClerkId: invoice.metadata?.clerkId,
      customer: cust,
    });
  }
  if (!clerkId || !plan) {
    console.error("[stripe] invoice.paid missing clerkId/plan", invoice.id, { clerkId, plan });
    return;
  }

  // Mid-cycle plan change invoices are prorations — full monthly tokens would
  // double-count with the upgrade delta on subscription.updated / checkout.
  if (invoice.billing_reason === "subscription_update") {
    await setUserSubscription({
      clerkId,
      plan,
      stripeCustomerId: cust,
      stripeSubscriptionId: subId,
      planRenewsAt: renewsAt,
      clearPendingPlanChange: true,
    });
    console.info("[stripe] invoice.paid subscription_update — skipped full grant", {
      invoiceId: invoice.id,
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

  // New billing cycle (or schedule-applied price) — pending downgrade is done/stale.
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

  // Email once per invoice (idempotent with grant). Log skips so local debugging is possible.
  if (result.granted) {
    const to = await resolvePurchaseEmail({
      clerkId,
      stripeEmail: invoice.customer_email,
    });
    if (!to) {
      console.warn("[email] subscription receipt skipped — no recipient", {
        invoiceId: invoice.id,
        clerkId,
      });
    } else {
      const amountPaid =
        typeof invoice.amount_paid === "number"
          ? `$${(invoice.amount_paid / 100).toFixed(2)}`
          : null;
      const sent = await sendPurchaseConfirmationEmail({
        to,
        kind: "subscription",
        plan,
        tokensGranted: tokensForPaidPlan(plan),
        balanceAfter: result.balanceAfter,
        renewsAt,
        amountLabel: amountPaid,
      });
      if (!sent.sent) {
        console.error("[email] subscription receipt send failed", {
          invoiceId: invoice.id,
          to,
          skipped: sent.skipped,
          error: sent.error,
        });
      } else {
        console.info("[email] subscription receipt sent", {
          invoiceId: invoice.id,
          to,
          id: sent.id,
        });
      }
    }
  } else {
    console.info("[email] subscription receipt skipped — grant not first claim", {
      invoiceId: invoice.id,
      clerkId,
    });
  }
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
      console.error("[stripe] invoice.payment_failed retrieve sub failed", invoice.id, err);
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
  const to = await resolvePurchaseEmail({
    clerkId,
    stripeEmail: invoice.customer_email,
  });
  if (to) {
    await sendSubscriptionEndedEmail({ to, reason: "payment_failed" });
  }
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
    await clearPaidSubscription(clerkId);
    await notifySubscriptionEnded(
      clerkId,
      sub.status === "unpaid" ? "unpaid" : "canceled",
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

  // Prefer Stripe previous_attributes — Mongo `user.plan` is often already the
  // new plan because checkout updates it before this webhook runs.
  const previousPlan = previousPlanFromSubscriptionEvent(previousAttributes);
  let previousPlanForDelta: string | null = previousPlan;
  if (!previousPlanForDelta && isMongoConfigured()) {
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId });
    previousPlanForDelta = normalizeUserPlan(user?.plan);
  }

  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  const periodStart = sub.items.data[0]?.current_period_start ?? null;

  // Mid-cycle upgrade: credit delta before flipping Mongo plan when possible.
  if (previousPlanForDelta && periodStart != null) {
    const result = await grantPlanUpgradeDelta({
      clerkId,
      previousPlan: previousPlanForDelta,
      newPlan: plan,
      subscriptionId: sub.id,
      periodStart,
      meta: {
        source: previousPlan ? "webhook_previous_attributes" : "webhook_mongo_fallback",
      },
    });
    if (result.granted) {
      const to = await resolvePurchaseEmail({ clerkId });
      if (to) {
        await sendPurchaseConfirmationEmail({
          to,
          kind: "subscription",
          plan,
          tokensGranted: result.delta,
          balanceAfter: result.balanceAfter,
          renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
        });
      }
    }
  }

  // Pending downgrade only while price is still the higher (current) plan.
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
  await clearPaidSubscription(clerkId);
  await notifySubscriptionEnded(clerkId, "canceled");
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
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });
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
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
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
          event.data.previous_attributes as Partial<Stripe.Subscription> | undefined,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
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
