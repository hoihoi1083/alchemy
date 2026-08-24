import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv();

export type ResetProTrialResult = {
  clerkId: string;
  priorBalance: number;
  targetBalance: number;
};

/** Reset E2E Clerk user for a fresh Pro trial run. */
export async function resetE2eUserForProTrial(opts?: {
  balance?: number;
}): Promise<ResetProTrialResult> {
  const {
    FREE_SIGNUP_GRANT_TOKENS,
    PRO_TRIAL_BONUS_TOKENS,
  } = await import("../../lib/billing/plans");
  const { getDb, isMongoConfigured } = await import("../../lib/mongodb");
  const { getStripe, isStripeConfigured } = await import("../../lib/stripe/client");
  type DbUser = import("../../lib/db/types").DbUser;

  const clerkId = process.env.E2E_CLERK_USER_ID?.trim();
  if (!clerkId) {
    throw new Error("E2E_CLERK_USER_ID is not set in .env.local");
  }
  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI is not set in .env.local");
  }
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const targetBalance = opts?.balance ?? 50;
  const db = await getDb();
  const stripe = getStripe();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  const priorBalance = user?.creditBalance ?? 0;

  const customerId = user?.stripeCustomerId?.trim();
  if (customerId) {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    for (const sub of subs.data) {
      if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`[reset] canceled Stripe sub ${sub.id} (${sub.status})`);
      } catch (e) {
        console.warn(`[reset] could not cancel sub ${sub.id}:`, e);
      }
    }
  }

  const bonusRef = `pro_trial_bonus_${clerkId}`;
  await db.collection("credit_transactions").deleteMany({ ref: bonusRef });
  await db
    .collection<{ _id: string }>("billing_event_locks")
    .deleteMany({ _id: bonusRef });

  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    {
      $set: {
        plan: "free",
        creditBalance: targetBalance,
        hasUsedProTrial: false,
        proTrialEndsAt: null,
        stripeSubscriptionId: null,
        planRenewsAt: null,
        updatedAt: new Date(),
      },
    },
    { upsert: false },
  );

  console.log(
    `[reset] ${clerkId}: plan=free balance=${targetBalance} (was ${priorBalance})`,
  );
  console.log(
    `[reset] after trial expect ~${targetBalance + PRO_TRIAL_BONUS_TOKENS} tokens (signup ${FREE_SIGNUP_GRANT_TOKENS})`,
  );

  return { clerkId, priorBalance, targetBalance };
}

if (process.argv[1]?.includes("reset-pro-trial-user")) {
  resetE2eUserForProTrial()
    .then((r) => {
      console.log("Reset OK:", r);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
