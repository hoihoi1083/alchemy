import { NextResponse } from "next/server";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

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

    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId: auth.user.userId });
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file. Subscribe first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appBaseUrl()}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Billing portal failed.";
    console.error("[stripe] portal error:", message);
    const status =
      message.includes("must be a live key") || message.includes("must be pk_live")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
