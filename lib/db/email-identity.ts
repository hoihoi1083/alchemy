import { grantTokens } from "@/lib/billing/ledger";
import { normalizeUserPlan, type UserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { paidPlanRank, type PaidPlan } from "@/lib/stripe/prices";

/** Lowercase + trim. Empty → null. */
export function normalizeEmail(email: string | null | undefined): string | null {
  const v = email?.trim().toLowerCase() ?? "";
  return v || null;
}

function planRank(plan: UserPlan | string | null | undefined): number {
  const p = normalizeUserPlan(plan);
  if (p === "free" || p === "custom") return 0;
  return paidPlanRank(p as PaidPlan);
}

/** Prefer the row that already owns Stripe / a higher plan / more tokens. */
export function pickCanonicalUser(a: DbUser, b: DbUser): DbUser {
  const aStripe = Boolean(a.stripeCustomerId);
  const bStripe = Boolean(b.stripeCustomerId);
  if (aStripe !== bStripe) return aStripe ? a : b;

  const aRank = planRank(a.plan);
  const bRank = planRank(b.plan);
  if (aRank !== bRank) return aRank > bRank ? a : b;

  const aBal = a.creditBalance ?? 0;
  const bBal = b.creditBalance ?? 0;
  if (aBal !== bBal) return aBal > bBal ? a : b;

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return aCreated <= bCreated ? a : b;
}

export async function findActiveUsersByEmail(
  emailNormalized: string,
): Promise<DbUser[]> {
  if (!isMongoConfigured() || !emailNormalized) return [];
  const db = await getDb();
  const escaped = emailNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return db
    .collection<DbUser>("users")
    .find({
      $and: [
        {
          $or: [
            { emailNormalized },
            { email: { $regex: `^${escaped}$`, $options: "i" } },
          ],
        },
        {
          $or: [{ supersededBy: null }, { supersededBy: { $exists: false } }],
        },
      ],
    })
    .toArray();
}

/**
 * Fold other non-superseded Mongo users that share this email into `clerkId`
 * (the signed-in identity). Transfers Stripe customer + tokens; marks donors
 * superseded. Auth remains keyed by clerkId.
 */
export async function mergeEmailDuplicatesInto(opts: {
  clerkId: string;
  emailNormalized: string | null;
}): Promise<{ mergedFrom: string[] }> {
  if (!isMongoConfigured() || !opts.emailNormalized) {
    return { mergedFrom: [] };
  }

  const db = await getDb();
  const others = (await findActiveUsersByEmail(opts.emailNormalized)).filter(
    (u) => u.clerkId !== opts.clerkId,
  );
  if (others.length === 0) return { mergedFrom: [] };

  let survivor = await db.collection<DbUser>("users").findOne({
    clerkId: opts.clerkId,
  });
  if (!survivor) return { mergedFrom: [] };

  const mergedFrom: string[] = [];

  for (const other of others) {
    // Never move billing off the signed-in user if they already have a customer.
    // Only adopt donor Stripe when the survivor has none (orphan → new login case).
    const takeBilling =
      !survivor.stripeCustomerId && Boolean(other.stripeCustomerId);

    const donorBal = Math.max(0, other.creditBalance ?? 0);
    const now = new Date();

    // Free unique stripeCustomerId index before adopting onto survivor.
    // Must $unset (not null) — sparse unique indexes still index null.
    await db.collection<DbUser>("users").updateOne(
      { clerkId: other.clerkId },
      {
        $unset: { stripeCustomerId: "", stripeSubscriptionId: "" },
        $set: { updatedAt: now },
      },
    );

    if (takeBilling && other.stripeCustomerId) {
      await db.collection<DbUser>("users").updateOne(
        { clerkId: opts.clerkId },
        {
          $set: {
            stripeCustomerId: other.stripeCustomerId,
            ...(other.stripeSubscriptionId
              ? { stripeSubscriptionId: other.stripeSubscriptionId }
              : {}),
            plan: normalizeUserPlan(other.plan),
            planRenewsAt: other.planRenewsAt ?? null,
            pendingPlan: other.pendingPlan ?? null,
            pendingPlanInterval: other.pendingPlanInterval ?? null,
            pendingPlanEffectiveAt: other.pendingPlanEffectiveAt ?? null,
            updatedAt: now,
          },
          ...(other.stripeSubscriptionId
            ? {}
            : { $unset: { stripeSubscriptionId: "" } }),
        },
      );
    }

    if (donorBal > 0) {
      try {
        await grantTokens(opts.clerkId, donorBal, "admin_adjust", {
          ref: `email_merge_${other.clerkId}_to_${opts.clerkId}`,
          meta: {
            source: "email_identity_merge",
            fromClerkId: other.clerkId,
          },
        });
      } catch (err) {
        console.error("[users] email merge token transfer failed", {
          from: other.clerkId,
          to: opts.clerkId,
          donorBal,
          err,
        });
      }
    }

    await db.collection<DbUser>("users").updateOne(
      { clerkId: other.clerkId },
      {
        $set: {
          plan: "free",
          creditBalance: 0,
          planRenewsAt: null,
          pendingPlan: null,
          pendingPlanInterval: null,
          pendingPlanEffectiveAt: null,
          supersededBy: opts.clerkId,
          supersededAt: now,
          updatedAt: now,
        },
      },
    );

    mergedFrom.push(other.clerkId);
    survivor =
      (await db.collection<DbUser>("users").findOne({ clerkId: opts.clerkId })) ??
      survivor;

    console.info("[users] merged email duplicate into signed-in user", {
      email: opts.emailNormalized,
      survivor: opts.clerkId,
      from: other.clerkId,
      tookBilling: takeBilling,
      tokensMoved: donorBal,
    });
  }

  return { mergedFrom };
}

/**
 * Stripe customer for checkout/portal: this user, else merge from another
 * active row with the same email.
 */
export async function resolveStripeCustomerIdForUser(opts: {
  clerkId: string;
  email?: string | null;
  stripeCustomerId?: string | null;
}): Promise<string | null> {
  if (opts.stripeCustomerId?.trim()) return opts.stripeCustomerId.trim();
  if (!isMongoConfigured()) return null;

  const emailNormalized = normalizeEmail(opts.email);
  if (!emailNormalized) return null;

  const others = (await findActiveUsersByEmail(emailNormalized)).filter(
    (u) => u.clerkId !== opts.clerkId && u.stripeCustomerId,
  );
  if (others.length === 0) return null;

  await mergeEmailDuplicatesInto({
    clerkId: opts.clerkId,
    emailNormalized,
  });

  const db = await getDb();
  const fresh = await db.collection<DbUser>("users").findOne({
    clerkId: opts.clerkId,
  });
  return fresh?.stripeCustomerId?.trim() ?? null;
}
