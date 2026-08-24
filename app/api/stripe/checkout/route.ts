import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PLAN_DEFINITIONS, normalizeUserPlan, PRO_TRIAL_DAYS } from "@/lib/billing/plans";
import { resolveStripeCustomerIdForUser } from "@/lib/db/email-identity";
import type { DbUser } from "@/lib/db/types";
import {
  notifyDowngradeScheduledOnce,
  notifyUpgradeReceiptOnce,
} from "@/lib/email/billing-notices";
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
  kind?: "subscription" | "topup" | "pro_trial";
  plan?: string;
  interval?: string;
};

const BILLABLE_SUB_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

function isNoSuchCustomerError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/No such customer/i.test(message)) return true;
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    "code" in err &&
    String((err as { type?: unknown }).type) === "StripeInvalidRequestError" &&
    String((err as { code?: unknown }).code) === "resource_missing"
  ) {
    return true;
  }
  return false;
}

async function clearStaleStripeCustomerForUser(
  db: Awaited<ReturnType<typeof getDb>>,
  clerkId: string,
): Promise<void> {
  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    {
      $set: { updatedAt: new Date() },
      $unset: { stripeCustomerId: "", stripeSubscriptionId: "" },
    },
  );
}

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

    const kind =
      body.kind === "topup"
        ? "topup"
        : body.kind === "pro_trial"
          ? "pro_trial"
          : "subscription";
    const clerkId = auth.user.userId;
    const stripe = getStripe();
    const base = appBaseUrl();
    const db = await getDb();
    let user = await db.collection<DbUser>("users").findOne({ clerkId });
    let stripeCustomerId = await resolveStripeCustomerIdForUser({
      clerkId,
      email: user?.email,
      stripeCustomerId: user?.stripeCustomerId,
    });
    if (stripeCustomerId && stripeCustomerId !== user?.stripeCustomerId) {
      user = await db.collection<DbUser>("users").findOne({ clerkId });
    }

    if (stripeCustomerId) {
      try {
        // Guard against customer IDs from a different/deleted Stripe account.
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (err) {
        if (isNoSuchCustomerError(err)) {
          console.warn("[stripe] stale stripeCustomerId detected; clearing", {
            clerkId,
            stripeCustomerId,
          });
          await clearStaleStripeCustomerForUser(db, clerkId);
          stripeCustomerId = null;
          user = await db.collection<DbUser>("users").findOne({ clerkId });
        } else {
          throw err;
        }
      }
    }

    if (kind === "pro_trial") {
      const plan = normalizeUserPlan(user?.plan);
      if (plan !== "free") {
        return NextResponse.json(
          { error: "Pro trial is only for Free accounts." },
          { status: 403 },
        );
      }
      if (user?.hasUsedProTrial) {
        return NextResponse.json(
          { error: "You already used the Pro trial." },
          { status: 403 },
        );
      }
      if (stripeCustomerId) {
        const billable = await listBillableSubscriptions(stripe, stripeCustomerId);
        if (billable.length > 0) {
          return NextResponse.json(
            { error: "You already have an active subscription." },
            { status: 409 },
          );
        }
      }
      const price = priceIdForPlan("pro", "monthly");
      if (!price) {
        return NextResponse.json(
          { error: "Missing Stripe price for Pro monthly (trial)." },
          { status: 503 },
        );
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/pricing?checkout=success&kind=pro_trial&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing?checkout=cancel`,
        client_reference_id: clerkId,
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : user?.email || undefined,
        metadata: {
          clerkId,
          kind: "pro_trial",
          plan: "pro",
          interval: "monthly",
        },
        subscription_data: {
          trial_period_days: PRO_TRIAL_DAYS,
          metadata: { clerkId, plan: "pro", interval: "monthly", kind: "pro_trial" },
        },
        payment_method_collection: "always",
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    }

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
      if (!stripeCustomerId) {
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
        customer: stripeCustomerId,
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
    if (stripeCustomerId) {
      let billable: Stripe.Subscription[] = [];
      try {
        billable = await listBillableSubscriptions(stripe, stripeCustomerId);
      } catch (err) {
        if (isNoSuchCustomerError(err)) {
          console.warn("[stripe] billable-sub lookup hit stale customer; clearing", {
            clerkId,
            stripeCustomerId,
          });
          await clearStaleStripeCustomerForUser(db, clerkId);
          stripeCustomerId = null;
          user = await db.collection<DbUser>("users").findOne({ clerkId });
        } else {
          throw err;
        }
      }
      if (stripeCustomerId && billable.length > 0) {
        try {
          const switched = await switchExistingSubscription({
            stripe,
            clerkId,
            customerId: stripeCustomerId,
            preferredSubId: user?.stripeSubscriptionId,
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
              stripeCustomerId,
              stripeSubscriptionId: switched.subscriptionId,
              planRenewsAt: switched.renewsAt,
              pendingPlan: switched.pendingPlan,
              pendingPlanInterval: switched.pendingInterval,
              pendingPlanEffectiveAt: switched.pendingEffectiveAt,
            });
            if (
              switched.pendingPlan &&
              switched.pendingEffectiveAt
            ) {
              await notifyDowngradeScheduledOnce({
                clerkId,
                subscriptionId: switched.subscriptionId,
                currentPlan: switched.activePlan,
                pendingPlan: switched.pendingPlan,
                effectiveAt: switched.pendingEffectiveAt,
              });
            }
          } else if (switched.effective === "immediate") {
            // Grant full new-plan tokens before flipping Mongo plan so we never
            // rely on the webhook reading an already-updated `user.plan`.
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
                console.warn("[stripe] upgrade grant not first claim (or failed)", {
                  clerkId,
                  subscriptionId: switched.subscriptionId,
                  previousPlan: switched.previousPlan,
                  plan: switched.activePlan,
                  amount: upgrade.delta,
                });
              }
              if (upgrade.delta > 0) {
                await notifyUpgradeReceiptOnce({
                  clerkId,
                  subscriptionId: switched.subscriptionId,
                  periodStart: switched.periodStart,
                  plan: switched.activePlan,
                  tokensGranted: upgrade.delta,
                  balanceAfter: upgrade.balanceAfter,
                  renewsAt: switched.renewsAt,
                });
              }
            }
            await setUserSubscription({
              clerkId,
              plan: switched.activePlan,
              stripeCustomerId,
              stripeSubscriptionId: switched.subscriptionId,
              planRenewsAt: switched.renewsAt,
              clearPendingPlanChange: true,
            });
          } else {
            // Same price — preserve any already-scheduled downgrade.
            await setUserSubscription({
              clerkId,
              plan: switched.activePlan,
              stripeCustomerId,
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
            if (
              message.startsWith("PAYMENT_INCOMPLETE") ||
              (e instanceof Error && e.name === "PaymentIncompleteError")
            ) {
              return NextResponse.json(
                {
                  error:
                    "Payment did not go through. Update your card in Manage billing, then try upgrading again. Your previous plan was not changed.",
                  code: "payment_incomplete",
                },
                { status: 402 },
              );
            }
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

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/pricing?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing?checkout=cancel`,
        client_reference_id: clerkId,
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : user?.email || undefined,
        metadata: { clerkId, kind: "subscription", plan, interval },
        subscription_data: {
          metadata: { clerkId, plan, interval },
        },
        allow_promotion_codes: true,
      });
    } catch (err) {
      if (!stripeCustomerId || !isNoSuchCustomerError(err)) throw err;
      // Last safety net: clear stale id and retry once without explicit customer.
      console.warn("[stripe] checkout create hit stale customer; retrying without customer", {
        clerkId,
        stripeCustomerId,
      });
      await clearStaleStripeCustomerForUser(db, clerkId);
      user = await db.collection<DbUser>("users").findOne({ clerkId });
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/pricing?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing?checkout=cancel`,
        client_reference_id: clerkId,
        customer_email: user?.email || undefined,
        metadata: { clerkId, kind: "subscription", plan, interval },
        subscription_data: {
          metadata: { clerkId, plan, interval },
        },
        allow_promotion_codes: true,
      });
    }

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
