import { FREE_SIGNUP_GRANT_TOKENS, normalizeUserPlan } from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export type CreditReason =
  | "signup_grant"
  | "subscription_grant"
  | "topup"
  | "consume"
  | "refund"
  | "admin_adjust";

export type CreditTransaction = {
  _id?: import("mongodb").ObjectId;
  clerkId: string;
  delta: number;
  reason: CreditReason;
  ref?: string;
  meta?: Record<string, unknown>;
  balanceAfter: number;
  createdAt: Date;
};

export class InsufficientTokensError extends Error {
  readonly status = 402;
  readonly balance: number;
  readonly required: number;

  constructor(balance: number, required: number) {
    super(`Not enough tokens. Need ${required}, have ${balance}.`);
    this.name = "InsufficientTokensError";
    this.balance = balance;
    this.required = required;
  }
}

export async function getUserBalance(clerkId: string): Promise<{
  balance: number;
  plan: ReturnType<typeof normalizeUserPlan>;
} | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  if (!user) return null;
  return {
    balance: user.creditBalance ?? 0,
    plan: normalizeUserPlan(user.plan),
  };
}

/** Throws InsufficientTokensError if balance < cost. No-op when Mongo unset (dev). */
export async function assertCanAfford(clerkId: string, cost: number): Promise<number> {
  if (!isMongoConfigured() || cost <= 0) return 0;
  const bal = await getUserBalance(clerkId);
  // Missing user → treat as 0 balance (never allow free gens when Mongo is on).
  if (!bal) {
    throw new InsufficientTokensError(0, cost);
  }
  if (bal.balance < cost) {
    throw new InsufficientTokensError(bal.balance, cost);
  }
  return bal.balance;
}

/**
 * Atomically deduct tokens after a successful generation.
 * Returns new balance, or null if Mongo unset / user missing.
 */
export async function consumeTokens(
  clerkId: string,
  cost: number,
  opts?: { ref?: string; meta?: Record<string, unknown> },
): Promise<number | null> {
  if (!isMongoConfigured() || cost <= 0) return null;
  const db = await getDb();
  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId, creditBalance: { $gte: cost } },
    {
      $inc: { creditBalance: -cost },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );
  if (!result) {
    const bal = await getUserBalance(clerkId);
    throw new InsufficientTokensError(bal?.balance ?? 0, cost);
  }
  const balanceAfter = result.creditBalance ?? 0;
  await db.collection<CreditTransaction>("credit_transactions").insertOne({
    clerkId,
    delta: -cost,
    reason: "consume",
    ...(opts?.ref ? { ref: opts.ref } : {}),
    ...(opts?.meta ? { meta: opts.meta } : {}),
    balanceAfter,
    createdAt: new Date(),
  });
  return balanceAfter;
}

/**
 * Credit tokens (signup, subscription, top-up, admin).
 * Returns new balance, or null if Mongo unset / user missing.
 */
export async function grantTokens(
  clerkId: string,
  amount: number,
  reason: Exclude<CreditReason, "consume">,
  opts?: { ref?: string; meta?: Record<string, unknown> },
): Promise<number | null> {
  if (!isMongoConfigured() || amount <= 0) return null;
  const db = await getDb();
  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId },
    {
      $inc: { creditBalance: amount },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );
  if (!result) return null;
  const balanceAfter = result.creditBalance ?? 0;
  await db.collection<CreditTransaction>("credit_transactions").insertOne({
    clerkId,
    delta: amount,
    reason,
    ...(opts?.ref ? { ref: opts.ref } : {}),
    ...(opts?.meta ? { meta: opts.meta } : {}),
    balanceAfter,
    createdAt: new Date(),
  });
  return balanceAfter;
}

/**
 * One-time Free pack. Idempotent via `signupGrantAt`.
 * Only grants when the user has never received a signup grant and balance is 0.
 */
export async function ensureSignupGrant(clerkId: string): Promise<number | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const now = new Date();
  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    {
      clerkId,
      creditBalance: { $lte: 0 },
      $or: [{ signupGrantAt: { $exists: false } }, { signupGrantAt: null }],
    },
    {
      $set: {
        signupGrantAt: now,
        updatedAt: now,
        plan: "free",
      },
      $inc: { creditBalance: FREE_SIGNUP_GRANT_TOKENS },
    },
    { returnDocument: "after" },
  );
  if (!result) return null;
  const balanceAfter = result.creditBalance ?? 0;
  await db.collection<CreditTransaction>("credit_transactions").insertOne({
    clerkId,
    delta: FREE_SIGNUP_GRANT_TOKENS,
    reason: "signup_grant",
    meta: { source: "ensureSignupGrant" },
    balanceAfter,
    createdAt: now,
  });
  return balanceAfter;
}

export function insufficientTokensResponse(err: InsufficientTokensError) {
  return {
    error: err.message,
    code: "INSUFFICIENT_TOKENS" as const,
    balance: err.balance,
    required: err.required,
  };
}
