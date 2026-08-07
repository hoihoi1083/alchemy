import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PLAN_DEFINITIONS, normalizeUserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import {
  grantPlanUpgradeDelta,
  setUserSubscription,
} from "@/lib/stripe/billing-sync";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  isBillingInterval,
  isPaidPlan,
  priceIdForPlan,
  topUpPriceId,
  type BillingInterval,
  type PaidPlan,
} from "@/lib/stripe/prices";
import { switchExistingSubscription } from "@/lib/stripe/switch-subscription";

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
            listBillable: (customerId) => listBillableSubscriptions(stripe, customerId),
          });

          if (switched.effective === "next_cycle") {
            // Keep current entitlements; only record the deferred target.
            await setUserSubscription({
              clerkId,
              plan: switched.activePlan,
              stripeCustomerId: user.stripeCustomerId,
              stripeSubscriptionId: switched.subscriptionId,
              planRenewsAt: switched.renewsAt,
              pendingPlan: switched.pendingPlan,
              pendingPlanInterval: switched.pendingInterval,
              pendingPlanEffectiveAt: switched.pendingEffectiveAt,
            });
          } else if (switched.effective === "immediate") {
            // Grant upgrade delta before flipping Mongo plan so we never rely on
            // the webhook reading an already-updated `user.plan` (race → 0 tokens).
            if (
              switched.periodStart != null &&
              switched.previousPlan !== switched.activePlan
            ) {
              const upgrade = await grantPlanUpgradeDelta({
                clerkId,
                previousPlan: switched.previousPlan,
                newPlan: switched.activePlan,
                subscriptionId: switched.subscriptionId,
                periodStart: switched.periodStart,
                meta: { source: "checkout_switch" },
              });
              if (upgrade.delta > 0 && !upgrade.granted) {
                console.warn("[stripe] upgrade delta not first claim (or failed)", {
                  clerkId,
                  subscriptionId: switched.subscriptionId,
                  previousPlan: switched.previousPlan,
                  plan: switched.activePlan,
                  delta: upgrade.delta,
                });
              }
            }
            await setUserSubscription({
              clerkId,
              plan: switched.activePlan,
              stripeCustomerId: user.stripeCustomerId,
              stripeSubscriptionId: switched.subscriptionId,
              planRenewsAt: switched.renewsAt,
              clearPendingPlanChange: true,
            });
          } else {
            // Same price — preserve any already-scheduled downgrade.
            await setUserSubscription({
              clerkId,
              plan: switched.activePlan,
              stripeCustomerId: user.stripeCustomerId,
              stripeSubscriptionId: switched.subscriptionId,
              planRenewsAt: switched.renewsAt,
              ...(switched.pendingPlan
                ? {
                    pendingPlan: switched.pendingPlan,
                    pendingPlanInterval: switched.pendingInterval,
                    pendingPlanEffectiveAt: switched.pendingEffectiveAt,
                  }
                : {}),
            });
          }

          return NextResponse.json({
            updated: true,
            deferred: switched.effective === "next_cycle",
            effective: switched.effective,
            plan: switched.activePlan,
            interval: switched.activeInterval,
            pendingPlan: switched.pendingPlan,
            pendingInterval: switched.pendingInterval,
            pendingEffectiveAt: switched.pendingEffectiveAt?.toISOString() ?? null,
            subscriptionId: switched.subscriptionId,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Could not update subscription.";
          if (message !== "NO_ACTIVE_SUB") {
            console.error("[stripe] switch subscription failed:", message);
            const looksLikeSchedule =
              /subscription schedule|managed by the schedule|phases/i.test(message);
            return NextResponse.json(
              {
                error: looksLikeSchedule
                  ? "Could not schedule the plan change. Try again from Pricing — Manage billing only cancels; downgrades must be chosen on a lower plan card."
                  : `Could not change plan: ${message}`,
                code: "switch_failed",
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
