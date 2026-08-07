/**
 * One-off: cancel orphan Pro for hoihoi1083 + merge Mongo into live Clerk user.
 * Run: npx tsx scripts/cleanup-orphan-email-billing.ts
 */
import { existsSync, readFileSync } from "node:fs";

const LIVE_CLERK = "user_3FZdl9sYJ9VOCbB6ofVguFj3IQB";
const ORPHAN_CLERK = "user_3GUZ24qMihS0zXXdBcoIas2GLtg";
const ORPHAN_SUB = "sub_1TwAy0ECl1ZAgMvGZ5nTqvFZ";
const EMAIL = "hoihoi1083@gmail.com";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}

async function main() {
  loadEnv();

  // Import after env so MONGODB_URI / Stripe keys are visible.
  const Stripe = (await import("stripe")).default;
  const { grantTokens } = await import("../lib/billing/ledger");
  const { normalizeEmail } = await import("../lib/db/email-identity");
  const { getDb } = await import("../lib/mongodb");
  type DbUser = import("../lib/db/types").DbUser;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");

  const stripe = new Stripe(key);
  const db = await getDb();
  const emailNormalized = normalizeEmail(EMAIL)!;

  const live = await db.collection<DbUser>("users").findOne({ clerkId: LIVE_CLERK });
  const orphan = await db.collection<DbUser>("users").findOne({ clerkId: ORPHAN_CLERK });
  if (!live) throw new Error("Live user missing");
  if (!orphan) {
    console.log("Orphan Mongo row already gone — nothing to merge");
  }

  // 1) Cancel orphan Stripe subscription immediately (stop double billing).
  try {
    const sub = await stripe.subscriptions.retrieve(ORPHAN_SUB);
    if (sub.status !== "canceled") {
      const canceled = await stripe.subscriptions.cancel(ORPHAN_SUB, {
        prorate: true,
      });
      console.log("Canceled orphan sub", canceled.id, canceled.status);
    } else {
      console.log("Orphan sub already canceled");
    }
  } catch (err) {
    console.error("Cancel orphan sub failed", err);
    throw err;
  }

  // 2) Backfill emailNormalized on live; transfer tokens; supersede orphan.
  const now = new Date();
  await db.collection<DbUser>("users").updateOne(
    { clerkId: LIVE_CLERK },
    {
      $set: {
        email: EMAIL,
        emailNormalized,
        supersededBy: null,
        supersededAt: null,
        updatedAt: now,
      },
    },
  );

  if (orphan && !orphan.supersededBy) {
    const donorBal = Math.max(0, orphan.creditBalance ?? 0);
    await db.collection<DbUser>("users").updateOne(
      { clerkId: ORPHAN_CLERK },
      {
        $set: {
          email: EMAIL,
          emailNormalized,
          plan: "free",
          planRenewsAt: null,
          pendingPlan: null,
          pendingPlanInterval: null,
          pendingPlanEffectiveAt: null,
          creditBalance: 0,
          supersededBy: LIVE_CLERK,
          supersededAt: now,
          updatedAt: now,
        },
        $unset: { stripeCustomerId: "", stripeSubscriptionId: "" },
      },
    );

    if (donorBal > 0) {
      const after = await grantTokens(LIVE_CLERK, donorBal, "admin_adjust", {
        ref: `email_merge_${ORPHAN_CLERK}_to_${LIVE_CLERK}`,
        meta: { source: "orphan_cleanup_script", fromClerkId: ORPHAN_CLERK },
      });
      console.log("Moved tokens", donorBal, "→ live balance", after);
    } else {
      console.log("No orphan tokens to move");
    }
  } else {
    console.log("Orphan already superseded or missing");
  }

  // 3) Backfill emailNormalized for any other users missing it.
  const missing = await db
    .collection<DbUser>("users")
    .find({
      email: { $type: "string" },
      $or: [
        { emailNormalized: { $exists: false } },
        { emailNormalized: null },
      ],
    })
    .toArray();
  for (const u of missing) {
    const norm = normalizeEmail(u.email);
    if (!norm) continue;
    await db.collection<DbUser>("users").updateOne(
      { clerkId: u.clerkId },
      { $set: { emailNormalized: norm, updatedAt: new Date() } },
    );
  }
  console.log("Backfilled emailNormalized for", missing.length, "users");

  const finalLive = await db.collection<DbUser>("users").findOne({ clerkId: LIVE_CLERK });
  const finalOrphan = await db.collection<DbUser>("users").findOne({ clerkId: ORPHAN_CLERK });
  console.log(
    JSON.stringify(
      {
        live: {
          plan: finalLive?.plan,
          balance: finalLive?.creditBalance,
          stripeCustomerId: finalLive?.stripeCustomerId,
          stripeSubscriptionId: finalLive?.stripeSubscriptionId,
          emailNormalized: finalLive?.emailNormalized,
        },
        orphan: {
          plan: finalOrphan?.plan,
          balance: finalOrphan?.creditBalance,
          supersededBy: finalOrphan?.supersededBy,
          stripeCustomerId: finalOrphan?.stripeCustomerId,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
