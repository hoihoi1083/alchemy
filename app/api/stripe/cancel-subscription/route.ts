import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import {
  clearPaidSubscription,
  markProTrialUsed,
} from "@/lib/stripe/billing-sync";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

const BILLABLE = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

/**
 * Cancel subscription from Account.
 * - Trialling (Pro trial): cancel immediately — keep leftover tokens, drop Pro features.
 * - Active paid: cancel at period end (access until renewsAt).
 */
export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }
    if (!isMongoConfigured()) {
      return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
    }

    const auth = await requireAppUser();
    if (!auth.ok) return auth.response;

    const clerkId = auth.user.userId;
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId });
    const subId = user?.stripeSubscriptionId?.trim();
    if (!subId) {
      return NextResponse.json({ error: "No subscription to cancel." }, { status: 400 });
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    if (!BILLABLE.has(sub.status) && sub.status !== "incomplete") {
      await clearPaidSubscription(clerkId);
      return NextResponse.json({
        ok: true,
        mode: "already_ended",
        message: "Subscription already ended.",
      });
    }

    if (sub.status === "trialing") {
      // Mark trial consumed before cancel so a fulfill race cannot open a second trial.
      await markProTrialUsed(clerkId);
      await stripe.subscriptions.cancel(subId);
      await clearPaidSubscription(clerkId);
      return NextResponse.json({
        ok: true,
        mode: "trial_canceled",
        message: "Trial canceled. Pro features ended; remaining tokens kept.",
      });
    }

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });
    const endsAt = updated.cancel_at
      ? new Date(updated.cancel_at * 1000)
      : updated.items.data[0]?.current_period_end
        ? new Date(updated.items.data[0].current_period_end * 1000)
        : null;

    return NextResponse.json({
      ok: true,
      mode: "cancel_at_period_end",
      endsAt: endsAt?.toISOString() ?? null,
      message: "Cancellation scheduled. Access continues until the end of the period.",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Cancel failed.";
    console.error("[stripe] cancel-subscription:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
