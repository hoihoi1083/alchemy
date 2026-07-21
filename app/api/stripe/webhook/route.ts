import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendPurchaseConfirmationEmail } from "@/lib/email/purchase-confirmation";
import { resolvePurchaseEmail } from "@/lib/email/resolve-user-email";
import {
  applySubscriptionGrant,
  applyTopUpGrant,
  clearPaidSubscription,
  findClerkIdByStripeCustomer,
  setUserSubscription,
  tokensForPaidPlan,
} from "@/lib/stripe/billing-sync";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { isPaidPlan, planFromPriceId, type PaidPlan } from "@/lib/stripe/prices";
import { TOP_UP_PRICE_USD, TOP_UP_TOKENS } from "@/lib/billing/plans";
import { isMongoConfigured } from "@/lib/mongodb";

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

async function resolveClerkId(opts: {
  metadataClerkId?: string | null;
  clientReferenceId?: string | null;
  customer?: string | null;
}): Promise<string | null> {
  if (opts.metadataClerkId) return opts.metadataClerkId;
  if (opts.clientReferenceId) return opts.clientReferenceId;
  if (opts.customer) return findClerkIdByStripeCustomer(opts.customer);
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkId = await resolveClerkId({
    metadataClerkId: session.metadata?.clerkId,
    clientReferenceId: session.client_reference_id,
    customer: customerId(session.customer),
  });
  if (!clerkId) {
    console.error("[stripe] checkout.session.completed missing clerkId", session.id);
    return;
  }

  const kind = session.metadata?.kind ?? (session.mode === "payment" ? "topup" : "subscription");
  const cust = customerId(session.customer);

  if (kind === "topup" || session.mode === "payment") {
    if (session.payment_status !== "paid") return;
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
    return;
  }

  // Subscription: sync plan/ids here; token grant happens on invoice.paid (idempotent).
  const planMeta = session.metadata?.plan;
  const plan: PaidPlan | null = planMeta && isPaidPlan(planMeta) ? planMeta : null;
  if (!plan) {
    console.error("[stripe] checkout missing plan metadata", session.id);
    return;
  }
  await setUserSubscription({
    clerkId,
    plan,
    stripeCustomerId: cust,
    stripeSubscriptionId: subscriptionId(session.subscription),
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
    clerkId = await resolveClerkId({
      metadataClerkId: invoice.metadata?.clerkId,
      customer: cust,
    });
  }
  if (!clerkId || !plan) {
    console.error("[stripe] invoice.paid missing clerkId/plan", invoice.id, { clerkId, plan });
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

  // Email on first successful grant for this invoice only (idempotent).
  if (result.granted) {
    const to = await resolvePurchaseEmail({
      clerkId,
      stripeEmail: invoice.customer_email,
    });
    if (to) {
      const amountPaid =
        typeof invoice.amount_paid === "number"
          ? `$${(invoice.amount_paid / 100).toFixed(2)}`
          : null;
      await sendPurchaseConfirmationEmail({
        to,
        kind: "subscription",
        plan,
        tokensGranted: tokensForPaidPlan(plan),
        balanceAfter: result.balanceAfter,
        renewsAt,
        amountLabel: amountPaid,
      });
    }
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
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
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  const fromPrice = priceId ? planFromPriceId(priceId) : null;
  const planMeta = sub.metadata?.plan;
  const plan: PaidPlan | null =
    (planMeta && isPaidPlan(planMeta) ? planMeta : null) ?? fromPrice?.plan ?? null;
  if (!plan) return;

  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  await setUserSubscription({
    clerkId,
    plan,
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
    planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const clerkId =
    sub.metadata?.clerkId ??
    (await findClerkIdByStripeCustomer(customerId(sub.customer) ?? ""));
  if (!clerkId) return;
  await clearPaidSubscription(clerkId);
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
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
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
