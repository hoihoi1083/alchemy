import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PLAN_DEFINITIONS, normalizeUserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import { setUserSubscription } from "@/lib/stripe/billing-sync";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  isBillingInterval,
  isPaidPlan,
  priceIdForPlan,
  topUpPriceId,
  type BillingInterval,
  type PaidPlan,
} from "@/lib/stripe/prices";

export const runtime = "nodejs";

type Body = {
  kind?: "subscription" | "topup";
  plan?: string;
  interval?: string;
};

const BILLABLE_SUB_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

async function listBillableSubscriptions(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return listed.data.filter((sub) => BILLABLE_SUB_STATUSES.has(sub.status));
}

/**
 * One paid subscription per customer. If they already subscribe, switch the
 * primary sub to the requested price and cancel duplicate actives immediately
 * so Stripe does not bill two plans.
 */
async function switchExistingSubscription(opts: {
  stripe: Stripe;
  clerkId: string;
  customerId: string;
  preferredSubId: string | null | undefined;
  plan: PaidPlan;
  interval: BillingInterval;
  price: string;
}): Promise<{ subscriptionId: string; renewsAt: Date | null }> {
  const billable = await listBillableSubscriptions(opts.stripe, opts.customerId);
  if (!billable.length) {
    throw new Error("NO_ACTIVE_SUB");
  }

  const primary =
    billable.find((sub) => sub.id === opts.preferredSubId) ??
    [...billable].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  for (const extra of billable) {
    if (extra.id === primary.id) continue;
    try {
      await opts.stripe.subscriptions.cancel(extra.id, {
        invoice_now: false,
        prorate: true,
      });
    } catch (e: unknown) {
      console.error(
        "[stripe] failed to cancel duplicate subscription",
        extra.id,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const itemId = primary.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Active subscription has no price item.");
  }

  const updated = await opts.stripe.subscriptions.update(primary.id, {
    items: [{ id: itemId, price: opts.price }],
    metadata: {
      ...primary.metadata,
      clerkId: opts.clerkId,
      plan: opts.plan,
      interval: opts.interval,
    },
    proration_behavior: "create_prorations",
    cancel_at_period_end: false,
  });

  const periodEnd = updated.items.data[0]?.current_period_end ?? null;
  return {
    subscriptionId: updated.id,
    renewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
  };
}

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }
    if (!isMongoConfigured()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const kind = body.kind === "topup" ? "topup" : "subscription";
    const clerkId = auth.user.userId;
    const stripe = getStripe();
    const base = appBaseUrl();
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId });

    if (kind === "topup") {
      const plan = normalizeUserPlan(user?.plan);
      if (!PLAN_DEFINITIONS[plan].canTopUp) {
        return NextResponse.json(
          { error: "Top-ups require an active paid plan. Subscribe first." },
          { status: 403 },
        );
      }
      const price = topUpPriceId();
      if (!price) {
        return NextResponse.json({ error: "STRIPE_PRICE_TOPUP is not set" }, { status: 503 });
      }
      // Must reuse the subscription customer so the invoice lands in the same portal history.
      if (!user?.stripeCustomerId) {
        return NextResponse.json(
          { error: "No Stripe customer on file. Subscribe once first, then top up." },
          { status: 400 },
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/pricing?checkout=success&kind=topup&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing?checkout=cancel`,
        client_reference_id: clerkId,
        customer: user.stripeCustomerId,
        metadata: { clerkId, kind: "topup" },
        allow_promotion_codes: true,
        // One-time Checkout does not create invoices by default — without this,
        // top-ups won't appear in Customer Portal "Billing history".
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: "Alchemy Token Top-up — 1,000 tokens",
            metadata: { clerkId, kind: "topup" },
          },
        },
      });

      return NextResponse.json({ url: session.url });
    }

    const planRaw = body.plan ?? "";
    const intervalRaw = body.interval ?? "monthly";
    if (!isPaidPlan(planRaw)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!isBillingInterval(intervalRaw)) {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }
    const plan = planRaw as PaidPlan;
    const interval = intervalRaw as BillingInterval;
    const price = priceIdForPlan(plan, interval);
    if (!price) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${plan} ${interval}` },
        { status: 503 },
      );
    }

    // Already subscribed → switch plan in-place (never stack a second Stripe sub).
    if (user?.stripeCustomerId) {
      const billable = await listBillableSubscriptions(stripe, user.stripeCustomerId);
      if (billable.length > 0) {
        try {
          const switched = await switchExistingSubscription({
            stripe,
            clerkId,
            customerId: user.stripeCustomerId,
            preferredSubId: user.stripeSubscriptionId,
            plan,
            interval,
            price,
          });
          await setUserSubscription({
            clerkId,
            plan,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: switched.subscriptionId,
            planRenewsAt: switched.renewsAt,
          });
          return NextResponse.json({
            updated: true,
            plan,
            interval,
            subscriptionId: switched.subscriptionId,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Could not update subscription.";
          if (message !== "NO_ACTIVE_SUB") {
            console.error("[stripe] switch subscription failed:", message);
            return NextResponse.json(
              {
                error:
                  "You already have an active subscription. Open Manage billing to change plans.",
                code: "already_subscribed",
              },
              { status: 409 },
            );
          }
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/pricing?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      client_reference_id: clerkId,
      customer: user?.stripeCustomerId || undefined,
      customer_email: user?.stripeCustomerId ? undefined : user?.email || undefined,
      metadata: { clerkId, kind: "subscription", plan, interval },
      subscription_data: {
        metadata: { clerkId, plan, interval },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    console.error("[stripe] checkout error:", message);
    const status =
      message.includes("must be a live key") || message.includes("must be pk_live")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
