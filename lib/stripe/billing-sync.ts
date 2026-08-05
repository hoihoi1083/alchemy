import {
  PLAN_DEFINITIONS,
  TOP_UP_TOKENS,
  normalizeUserPlan,
  type UserPlan,
} from "@/lib/billing/plans";
import { grantTokens } from "@/lib/billing/ledger";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import type { BillingInterval, PaidPlan } from "@/lib/stripe/prices";

/**
 * Idempotent credit: claim a lock on `ref`, then grant once.
 * Returns { granted, balanceAfter }.
 *
 * If grant fails after the lock is claimed, the lock is released so Stripe
 * webhook / confirm-checkout retries can succeed (paid → 0 tokens forever).
 */
export async function grantTokensOnce(
  clerkId: string,
  amount: number,
  reason: "subscription_grant" | "topup",
  ref: string,
  meta?: Record<string, unknown>,
): Promise<{ granted: boolean; balanceAfter: number | null }> {
  if (!isMongoConfigured() || amount <= 0 || !ref) {
    return { granted: false, balanceAfter: null };
  }
  const db = await getDb();
  type BillingLock = {
    _id: string;
    clerkId: string;
    reason: string;
    createdAt: Date;
  };
  const locks = db.collection<BillingLock>("billing_event_locks");
  // returnDocument:"before" + upsert → null means we just claimed the lock.
  const prior = await locks.findOneAndUpdate(
    { _id: ref },
    {
      $setOnInsert: {
        clerkId,
        reason,
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "before" },
  );
  // Driver returns the doc before update; null/undefined ⇒ first claim.
  if (prior) {
    const existing = await db.collection("credit_transactions").findOne({ ref });
    return { granted: false, balanceAfter: (existing?.balanceAfter as number) ?? null };
  }

  try {
    const balanceAfter = await grantTokens(clerkId, amount, reason, { ref, meta });
    if (balanceAfter != null) {
      return { granted: true, balanceAfter };
    }
    // User missing / grant no-op — drop lock so a later retry can credit.
    await locks.deleteOne({ _id: ref });
    console.error("[billing] grantTokensOnce released lock after null grant", {
      clerkId,
      reason,
      ref,
      amount,
    });
    return { granted: false, balanceAfter: null };
  } catch (err) {
    await locks.deleteOne({ _id: ref }).catch(() => undefined);
    console.error("[billing] grantTokensOnce released lock after grant error", {
      clerkId,
      reason,
      ref,
      amount,
      err,
    });
    throw err;
  }
}

export async function setUserSubscription(opts: {
  clerkId: string;
  plan: PaidPlan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planRenewsAt?: Date | null;
  pendingPlan?: PaidPlan | null;
  pendingPlanInterval?: BillingInterval | null;
  pendingPlanEffectiveAt?: Date | null;
  /** Drop deferred downgrade fields (upgrade, schedule applied, cancel). */
  clearPendingPlanChange?: boolean;
}): Promise<void> {
  if (!isMongoConfigured()) return;
  const db = await getDb();
  const now = new Date();
  const $set: Partial<DbUser> & { updatedAt: Date } = {
    plan: opts.plan,
    updatedAt: now,
  };
  if (opts.stripeCustomerId !== undefined) $set.stripeCustomerId = opts.stripeCustomerId;
  if (opts.stripeSubscriptionId !== undefined) {
    $set.stripeSubscriptionId = opts.stripeSubscriptionId;
  }
  if (opts.planRenewsAt !== undefined) $set.planRenewsAt = opts.planRenewsAt;
  if (opts.clearPendingPlanChange) {
    $set.pendingPlan = null;
    $set.pendingPlanInterval = null;
    $set.pendingPlanEffectiveAt = null;
  } else {
    if (opts.pendingPlan !== undefined) $set.pendingPlan = opts.pendingPlan;
    if (opts.pendingPlanInterval !== undefined) {
      $set.pendingPlanInterval = opts.pendingPlanInterval;
    }
    if (opts.pendingPlanEffectiveAt !== undefined) {
      $set.pendingPlanEffectiveAt = opts.pendingPlanEffectiveAt;
    }
  }

  await db.collection<DbUser>("users").updateOne(
    { clerkId: opts.clerkId },
    {
      $set,
      $setOnInsert: {
        clerkId: opts.clerkId,
        email: null,
        name: null,
        imageUrl: null,
        region: process.env.REGION === "cn" ? "cn" : "hk",
        creditBalance: 0,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function clearPaidSubscription(clerkId: string): Promise<void> {
  if (!isMongoConfigured()) return;
  const db = await getDb();
  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    {
      $set: {
        plan: "free" satisfies UserPlan,
        stripeSubscriptionId: null,
        planRenewsAt: null,
        pendingPlan: null,
        pendingPlanInterval: null,
        pendingPlanEffectiveAt: null,
        updatedAt: new Date(),
      },
    },
  );
}

export async function findClerkIdByStripeCustomer(
  customerId: string,
): Promise<string | null> {
  if (!isMongoConfigured() || !customerId) return null;
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ stripeCustomerId: customerId });
  return user?.clerkId ?? null;
}

export function tokensForPaidPlan(plan: PaidPlan): number {
  return PLAN_DEFINITIONS[plan].monthlyTokens;
}

export async function applySubscriptionGrant(opts: {
  clerkId: string;
  plan: PaidPlan;
  ref: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planRenewsAt?: Date | null;
  meta?: Record<string, unknown>;
}): Promise<{ granted: boolean; balanceAfter: number | null }> {
  await setUserSubscription({
    clerkId: opts.clerkId,
    plan: opts.plan,
    stripeCustomerId: opts.stripeCustomerId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    planRenewsAt: opts.planRenewsAt,
  });
  return grantTokensOnce(
    opts.clerkId,
    tokensForPaidPlan(opts.plan),
    "subscription_grant",
    opts.ref,
    { plan: opts.plan, ...opts.meta },
  );
}

export async function applyTopUpGrant(opts: {
  clerkId: string;
  ref: string;
  stripeCustomerId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<{ granted: boolean; balanceAfter: number | null }> {
  if (!isMongoConfigured()) return { granted: false, balanceAfter: null };
  const db = await getDb();
  if (opts.stripeCustomerId) {
    await db.collection<DbUser>("users").updateOne(
      { clerkId: opts.clerkId },
      { $set: { stripeCustomerId: opts.stripeCustomerId, updatedAt: new Date() } },
    );
  }
  const user = await db.collection<DbUser>("users").findOne({ clerkId: opts.clerkId });
  const plan = normalizeUserPlan(user?.plan);
  if (!PLAN_DEFINITIONS[plan].canTopUp) {
    console.warn("[stripe] top-up refused — user not on paid plan", opts.clerkId, plan);
    return { granted: false, balanceAfter: user?.creditBalance ?? null };
  }
  return grantTokensOnce(opts.clerkId, TOP_UP_TOKENS, "topup", opts.ref, opts.meta);
}
