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

function emailMatchFilter(emailNormalized: string) {
  const escaped = emailNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    $or: [
      { emailNormalized },
      { email: { $regex: `^${escaped}$`, $options: "i" } },
    ],
  };
}

export async function findActiveUsersByEmail(
  emailNormalized: string,
): Promise<DbUser[]> {
  if (!isMongoConfigured() || !emailNormalized) return [];
  const db = await getDb();
  return db
    .collection<DbUser>("users")
    .find({
      $and: [
        emailMatchFilter(emailNormalized),
        {
          $or: [{ supersededBy: null }, { supersededBy: { $exists: false } }],
        },
      ],
    })
    .toArray();
}

/**
 * True if this email already received the one-time Free signup pack
 * (any clerkId, including superseded duplicates). Prevents re-signup farming.
 */
export async function emailAlreadyClaimedSignupGrant(
  emailNormalized: string | null,
): Promise<boolean> {
  if (!isMongoConfigured() || !emailNormalized) return false;
  const db = await getDb();
  const claim = await db.collection("signup_grant_claims").findOne({
    emailNormalized,
  });
  if (claim) return true;
  const users = await db
    .collection<DbUser>("users")
    .find(emailMatchFilter(emailNormalized))
    .project({ clerkId: 1, signupGrantAt: 1 })
    .toArray();
  if (users.some((u) => Boolean(u.signupGrantAt))) return true;
  const clerkIds = users.map((u) => u.clerkId).filter(Boolean);
  if (clerkIds.length === 0) return false;
  const prior = await db.collection("credit_transactions").findOne({
    clerkId: { $in: clerkIds },
    reason: "signup_grant",
  });
  return Boolean(prior);
}

/**
 * Atomically reserve the Free signup pack for this email.
 * Returns true if this clerkId may credit tokens; false if already claimed.
 * Email-less users skip the email lock (clerkId signupGrantAt still applies).
 */
export async function tryReserveSignupGrantForEmail(
  emailNormalized: string | null,
  clerkId: string,
): Promise<boolean> {
  if (!emailNormalized) return true;
  if (!isMongoConfigured() || !clerkId.trim()) return false;
  const db = await getDb();
  try {
    await db.collection("signup_grant_claims").insertOne({
      emailNormalized,
      clerkId,
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? Number((err as { code?: unknown }).code)
        : 0;
    // Duplicate key — another clerkId already claimed this email.
    if (code === 11000) return false;
    throw err;
  }
}

/**
 * Stamp signupGrantAt without crediting — used when this email already claimed
 * the free pack under a prior clerkId.
 */
export async function markSignupGrantClaimedWithoutCredit(
  clerkId: string,
): Promise<void> {
  if (!isMongoConfigured() || !clerkId.trim()) return;
  const db = await getDb();
  const now = new Date();
  await db.collection<DbUser>("users").updateOne(
    {
      clerkId,
      $or: [{ signupGrantAt: { $exists: false } }, { signupGrantAt: null }],
    },
    { $set: { signupGrantAt: now, updatedAt: now } },
  );
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

    // Carry one-time Free pack flag so a new clerkId cannot re-claim signup tokens.
    if (other.signupGrantAt && !survivor.signupGrantAt) {
      await db.collection<DbUser>("users").updateOne(
        {
          clerkId: opts.clerkId,
          $or: [{ signupGrantAt: { $exists: false } }, { signupGrantAt: null }],
        },
        { $set: { signupGrantAt: other.signupGrantAt, updatedAt: now } },
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
      signupGrantCarried: Boolean(other.signupGrantAt),
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
