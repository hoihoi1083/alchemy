import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { requireAppUser } from "@/lib/require-app-user";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill-checkout";

export const runtime = "nodejs";

/**
 * Client-side backup when Stripe webhooks cannot reach this host (common in local
 * `next dev`). Idempotent with the webhook via `billing_event_locks`.
 *
 * POST { sessionId?: string }
 * - with sessionId: fulfill that Checkout Session (must belong to the signed-in user)
 * - without: scan recent paid sessions for the user's Stripe customer (last 48h)
 */
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

    let body: { sessionId?: string } = {};
    try {
      body = (await request.json()) as { sessionId?: string };
    } catch {
      body = {};
    }

    const clerkId = auth.user.userId;
    const stripe = getStripe();
    const results: Array<{
      sessionId: string;
      granted: boolean;
      tokensGranted: number;
      balanceAfter: number | null;
      kind: string;
      reason?: string;
    }> = [];

    const fulfillIfOwned = async (session: Stripe.Checkout.Session) => {
      const owner =
        session.metadata?.clerkId ||
        session.client_reference_id ||
        null;
      if (owner && owner !== clerkId) {
        results.push({
          sessionId: session.id,
          granted: false,
          tokensGranted: 0,
          balanceAfter: null,
          kind: "skipped",
          reason: "wrong_user",
        });
        return;
      }
      const out = await fulfillCheckoutSession(session);
      if (out.clerkId && out.clerkId !== clerkId) {
        results.push({
          sessionId: session.id,
          granted: false,
          tokensGranted: 0,
          balanceAfter: null,
          kind: "skipped",
          reason: "wrong_user",
        });
        return;
      }
      results.push({
        sessionId: session.id,
        granted: out.granted,
        tokensGranted: out.tokensGranted,
        balanceAfter: out.balanceAfter,
        kind: out.kind,
        reason: out.reason,
      });
    };

    const sessionId = body.sessionId?.trim();
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      await fulfillIfOwned(session);
    } else {
      const db = await getDb();
      const user = await db.collection<DbUser>("users").findOne({ clerkId });
      const customerId = user?.stripeCustomerId?.trim();
      if (!customerId) {
        return NextResponse.json({
          ok: true,
          results: [],
          creditBalance: user?.creditBalance ?? 0,
          note: "No Stripe customer on file",
        });
      }
      const createdGte = Math.floor(Date.now() / 1000) - 60 * 60 * 48;
      const listed = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 20,
        created: { gte: createdGte },
      });
      for (const session of listed.data) {
        if (session.payment_status !== "paid" && session.status !== "complete") continue;
        await fulfillIfOwned(session);
      }
    }

    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId });
    const tokensGranted = results.reduce((sum, r) => sum + (r.tokensGranted || 0), 0);

    return NextResponse.json({
      ok: true,
      results,
      tokensGranted,
      creditBalance: user?.creditBalance ?? 0,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Confirm checkout failed";
    console.error("[stripe] confirm-checkout:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
