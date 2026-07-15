import { NextResponse } from "next/server";
import { PLAN_DEFINITIONS, normalizeUserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
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

export async function POST(request: Request) {
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
      success_url: `${base}/pricing?checkout=success&kind=topup`,
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/pricing?checkout=success&plan=${plan}`,
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
}
