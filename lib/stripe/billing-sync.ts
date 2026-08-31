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
 * If a prior lock exists with no credit_transaction (crash mid-grant), the
 * stale lock is released and the grant is retried.
 */
export async function grantTokensOnce(
  clerkId: string,
  amount: number,
  reason:
    | "subscription_grant"
    | "topup"
    | "trial_bonus"
    | "refund"
    | "admin_adjust",
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
  let prior = await locks.findOneAndUpdate(
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
    if (existing) {
      return {
        granted: false,
        balanceAfter: (existing.balanceAfter as number) ?? null,
      };
    }
    // Lock claimed but no ledger row — process likely crashed mid-grant.
    // Release and re-claim so the user is not stuck with paid → 0 tokens.
    console.warn("[billing] grantTokensOnce recovering stale lock (no transaction)", {
      clerkId,
      reason,
      ref,
      amount,
    });
    await locks.deleteOne({ _id: ref }).catch(() => undefined);
    prior = await locks.findOneAndUpdate(
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
    if (prior) {
      const raced = await db.collection("credit_transactions").findOne({ ref });
      return {
        granted: false,
        balanceAfter: (raced?.balanceAfter as number) ?? null,
      };
    }
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

/**
 * Claim a one-shot email lock. Returns true if this caller should send.
 * On send failure, caller should `releaseEmailLock(ref)`.
 */
export async function claimEmailLockOnce(
  ref: string,
  clerkId: string,
  reason: string,
): Promise<boolean> {
  if (!isMongoConfigured() || !ref) return true;
  const db = await getDb();
  type BillingLock = {
    _id: string;
    clerkId: string;
    reason: string;
    createdAt: Date;
  };
  const prior = await db.collection<BillingLock>("billing_event_locks").findOneAndUpdate(
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
  return !prior;
}

export async function releaseEmailLock(ref: string): Promise<void> {
  if (!isMongoConfigured() || !ref) return;
  const db = await getDb();
  type BillingLock = {
    _id: string;
    clerkId: string;
    reason: string;
    createdAt: Date;
  };
  await db
    .collection<BillingLock>("billing_event_locks")
    .deleteOne({ _id: ref })
    .catch(() => undefined);
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
  void import("@/lib/team/service")
    .then(({ syncOwnerTeamForPlan }) =>
      syncOwnerTeamForPlan(opts.clerkId, opts.plan),
    )
    .catch((err) => {
      console.error("[billing] syncOwnerTeamForPlan failed", err);
    });
}

/**
 * Persist Stripe ids from an unpaid-but-complete Checkout without flipping plan.
 * Needed so later invoice.paid / async_payment_succeeded can find the user.
 */
export async function attachStripeCustomerWithoutPlanChange(opts: {
  clerkId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<void> {
  if (!isMongoConfigured()) return;
  if (!opts.stripeCustomerId && !opts.stripeSubscriptionId) return;
  const db = await getDb();
  const now = new Date();
  const $set: Partial<DbUser> & { updatedAt: Date } = { updatedAt: now };
  if (opts.stripeCustomerId) $set.stripeCustomerId = opts.stripeCustomerId;
  if (opts.stripeSubscriptionId) {
    $set.stripeSubscriptionId = opts.stripeSubscriptionId;
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

/**
 * Mark Pro trial as consumed. Never cleared on cancel — one trial per account.
 */
export async function markProTrialUsed(
  clerkId: string,
  opts?: { proTrialEndsAt?: Date | null },
): Promise<void> {
  if (!isMongoConfigured()) return;
  const db = await getDb();
  await db.collection<DbUser>("users").updateOne(
    { clerkId },
    {
      $set: {
        hasUsedProTrial: true,
        ...(opts && "proTrialEndsAt" in opts
          ? { proTrialEndsAt: opts.proTrialEndsAt ?? null }
          : {}),
        updatedAt: new Date(),
      },
    },
    { upsert: false },
  );
}

export async function clearPaidSubscription(clerkId: string): Promise<void> {
  if (!isMongoConfigured()) return;
  const db = await getDb();
  // Do not clear hasUsedProTrial — trial is one-time even after cancel.
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
        proTrialEndsAt: null,
        updatedAt: new Date(),
      },
    },
  );
  void import("@/lib/team/service")
    .then(({ syncOwnerTeamForPlan }) => syncOwnerTeamForPlan(clerkId, "free"))
    .catch((err) => {
      console.error("[billing] syncOwnerTeamForPlan failed", err);
    });
}

/**
 * Drop paid entitlements only when this customer has no other billable sub.
 * Prevents: cancel/replace old Standard → wipe Mongo while a new Pro is still active.
 */
export async function clearPaidSubscriptionIfNoActiveSub(opts: {
  clerkId: string;
  customerId: string | null;
  endingSubscriptionId: string;
}): Promise<{ cleared: boolean; keptActiveSubId: string | null }> {
  if (!isMongoConfigured()) {
    return { cleared: false, keptActiveSubId: null };
  }

  if (opts.customerId && process.env.STRIPE_SECRET_KEY?.trim()) {
    try {
      const { getStripe } = await import("@/lib/stripe/client");
      const stripe = getStripe();
      const listed = await stripe.subscriptions.list({
        customer: opts.customerId,
        status: "all",
        limit: 20,
      });
      const stillBillable = listed.data.find(
        (s) =>
          s.id !== opts.endingSubscriptionId &&
          (s.status === "active" ||
            s.status === "trialing" ||
            s.status === "past_due"),
      );
      if (stillBillable) {
        const item = stillBillable.items.data[0];
        const priceId =
          typeof item?.price === "string" ? item.price : item?.price?.id;
        const { planFromPriceId } = await import("@/lib/stripe/prices");
        const mapped = priceId ? planFromPriceId(priceId) : null;
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;
        if (mapped) {
          await setUserSubscription({
            clerkId: opts.clerkId,
            plan: mapped.plan,
            stripeCustomerId: opts.customerId,
            stripeSubscriptionId: stillBillable.id,
            planRenewsAt: periodEnd,
            clearPendingPlanChange: true,
          });
          console.info(
            "[stripe] clearPaidSubscription skipped — other active sub kept",
            {
              clerkId: opts.clerkId,
              ending: opts.endingSubscriptionId,
              kept: stillBillable.id,
              plan: mapped.plan,
            },
          );
          return { cleared: false, keptActiveSubId: stillBillable.id };
        }
      }
    } catch (err) {
      console.error(
        "[stripe] clearPaidSubscriptionIfNoActiveSub check failed",
        err,
      );
    }
  }

  await clearPaidSubscription(opts.clerkId);
  return { cleared: true, keptActiveSubId: null };
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

/** Idempotent key for upgrade cycle-reset grant (checkout + webhook share this). */
export function upgradeGrantRef(
  subscriptionId: string,
  plan: PaidPlan,
  periodStart: number,
): string {
  return `upgrade_${subscriptionId}_${plan}_${periodStart}`;
}

/**
 * Tokens to grant when upgrading with a billing-cycle reset.
 * Full new-plan allotment (remaining balance carries). 0 if not an upgrade.
 */
export function upgradeTokenGrantAmount(
  previousPlan: UserPlan | PaidPlan | string,
  newPlan: PaidPlan,
): number {
  const oldPlanTokens =
    PLAN_DEFINITIONS[normalizeUserPlan(previousPlan)].monthlyTokens;
  const newPlanTokens = tokensForPaidPlan(newPlan);
  if (newPlanTokens <= oldPlanTokens) return 0;
  return newPlanTokens;
}

/**
 * Credit the full new-plan monthly tokens when upgrading (cycle resets to now).
 * Remaining balance is kept; unused old-plan tokens are not clawed back.
 * Safe to call from checkout and customer.subscription.updated — same ref.
 * `delta` on the return value is the granted amount (full allotment, not a diff).
 */
export async function grantPlanUpgradeDelta(opts: {
  clerkId: string;
  previousPlan: UserPlan | PaidPlan | string;
  newPlan: PaidPlan;
  subscriptionId: string;
  periodStart: number;
  meta?: Record<string, unknown>;
}): Promise<{ granted: boolean; balanceAfter: number | null; delta: number }> {
  const oldPlanTokens =
    PLAN_DEFINITIONS[normalizeUserPlan(opts.previousPlan)].monthlyTokens;
  const newPlanTokens = tokensForPaidPlan(opts.newPlan);
  const amount = upgradeTokenGrantAmount(opts.previousPlan, opts.newPlan);
  if (amount <= 0 || opts.periodStart == null) {
    return { granted: false, balanceAfter: null, delta: 0 };
  }
  const result = await grantTokensOnce(
    opts.clerkId,
    amount,
    "subscription_grant",
    upgradeGrantRef(opts.subscriptionId, opts.newPlan, opts.periodStart),
    {
      plan: opts.newPlan,
      upgrade: true,
      cycleReset: true,
      oldPlanTokens,
      newPlanTokens,
      grantAmount: amount,
      ...opts.meta,
    },
  );
  // `delta` kept as the granted amount for existing callers / emails.
  return { ...result, delta: amount };
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
  // Grant tokens first so a crash cannot leave "paid plan + 0 tokens forever"
  // with a held lock and no ledger row (plan would already look active).
  const result = await grantTokensOnce(
    opts.clerkId,
    tokensForPaidPlan(opts.plan),
    "subscription_grant",
    opts.ref,
    { plan: opts.plan, ...opts.meta },
  );
  await setUserSubscription({
    clerkId: opts.clerkId,
    plan: opts.plan,
    stripeCustomerId: opts.stripeCustomerId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    planRenewsAt: opts.planRenewsAt,
  });
  return result;
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
  // Checkout API already blocks Free top-ups before Stripe charges.
  // Do not re-check plan here: user may cancel Pro trial between pay and webhook
  // (plan flips to free) — they already paid and must receive tokens.
  return grantTokensOnce(opts.clerkId, TOP_UP_TOKENS, "topup", opts.ref, opts.meta);
}
