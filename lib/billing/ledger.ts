import {
  FREE_SIGNUP_GRANT_TOKENS,
  normalizeUserPlan,
  tokenExpiresAt,
} from "@/lib/billing/plans";
import type { DbUser } from "@/lib/db/types";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { randomUUID } from "crypto";

export type CreditReason =
  | "signup_grant"
  | "subscription_grant"
  | "trial_bonus"
  | "topup"
  | "consume"
  | "refund"
  | "admin_adjust"
  | "expire";

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

export type TokenBatch = {
  id: string;
  remaining: number;
  grantedAt: Date;
  expiresAt: Date;
  source: string;
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

function sumRemaining(batches: TokenBatch[]): number {
  return batches.reduce((s, b) => s + Math.max(0, b.remaining), 0);
}

function asBatch(raw: unknown): TokenBatch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const remaining = typeof r.remaining === "number" ? r.remaining : null;
  const grantedAt = r.grantedAt instanceof Date ? r.grantedAt : new Date(String(r.grantedAt ?? ""));
  const expiresAt = r.expiresAt instanceof Date ? r.expiresAt : new Date(String(r.expiresAt ?? ""));
  const source = typeof r.source === "string" ? r.source : "unknown";
  if (!id || remaining == null || Number.isNaN(grantedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    return null;
  }
  return { id, remaining, grantedAt, expiresAt, source };
}

function normalizeBatches(raw: unknown): TokenBatch[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asBatch).filter((b): b is TokenBatch => b != null && b.remaining > 0);
}

/**
 * Convert legacy single balance into one 6‑month batch (once).
 * Drop expired batch remainders and resync creditBalance.
 */
async function migrateAndPruneBatches(
  clerkId: string,
): Promise<{ balance: number; batches: TokenBatch[] } | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  if (!user) return null;

  const now = new Date();
  let batches = normalizeBatches(user.tokenBatches);
  let dirty = false;
  const balance = Math.max(0, user.creditBalance ?? 0);

  if (!user.tokenBatchesMigratedAt) {
    if (batches.length === 0 && balance > 0) {
      batches = [
        {
          id: randomUUID(),
          remaining: balance,
          grantedAt: now,
          expiresAt: tokenExpiresAt(now),
          source: "legacy_migration",
        },
      ];
    }
    dirty = true;
  }

  const alive: TokenBatch[] = [];
  let expiredAmt = 0;
  for (const b of batches) {
    if (b.expiresAt.getTime() <= now.getTime()) {
      expiredAmt += b.remaining;
      dirty = true;
    } else if (b.remaining > 0) {
      alive.push(b);
    } else {
      dirty = true;
    }
  }

  const nextBalance = sumRemaining(alive);
  if (dirty || nextBalance !== balance || !user.tokenBatchesMigratedAt) {
    await db.collection<DbUser>("users").updateOne(
      { clerkId },
      {
        $set: {
          creditBalance: nextBalance,
          tokenBatches: alive,
          tokenBatchesMigratedAt: user.tokenBatchesMigratedAt ?? now,
          updatedAt: now,
        },
      },
    );
    if (expiredAmt > 0) {
      await db.collection<CreditTransaction>("credit_transactions").insertOne({
        clerkId,
        delta: -expiredAmt,
        reason: "expire",
        meta: { source: "prune_expired_batches" },
        balanceAfter: nextBalance,
        createdAt: now,
      });
    }
  }

  return { balance: nextBalance, batches: alive };
}

export async function getUserBalance(clerkId: string): Promise<{
  balance: number;
  plan: ReturnType<typeof normalizeUserPlan>;
} | null> {
  if (!isMongoConfigured()) return null;
  const pruned = await migrateAndPruneBatches(clerkId);
  if (!pruned) {
    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ clerkId });
    if (!user) return null;
    return {
      balance: user.creditBalance ?? 0,
      plan: normalizeUserPlan(user.plan),
    };
  }
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  return {
    balance: pruned.balance,
    plan: normalizeUserPlan(user?.plan),
  };
}

/** Throws InsufficientTokensError if balance < cost. No-op when Mongo unset (dev). */
export async function assertCanAfford(clerkId: string, cost: number): Promise<number> {
  if (!isMongoConfigured() || cost <= 0) return 0;
  const bal = await getUserBalance(clerkId);
  if (!bal) {
    throw new InsufficientTokensError(0, cost);
  }
  if (bal.balance < cost) {
    throw new InsufficientTokensError(bal.balance, cost);
  }
  return bal.balance;
}

/**
 * Atomically deduct tokens (oldest batch first).
 */
export async function consumeTokens(
  clerkId: string,
  cost: number,
  opts?: { ref?: string; meta?: Record<string, unknown> },
): Promise<number | null> {
  if (!isMongoConfigured() || cost <= 0) return null;
  await migrateAndPruneBatches(clerkId);
  const db = await getDb();
  const user = await db.collection<DbUser>("users").findOne({ clerkId });
  if (!user || (user.creditBalance ?? 0) < cost) {
    throw new InsufficientTokensError(user?.creditBalance ?? 0, cost);
  }

  let left = cost;
  const now = new Date();
  const nextBatches: TokenBatch[] = [];
  const ordered = normalizeBatches(user.tokenBatches).sort(
    (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime() || a.grantedAt.getTime() - b.grantedAt.getTime(),
  );

  for (const b of ordered) {
    if (b.expiresAt.getTime() <= now.getTime()) continue;
    if (left <= 0) {
      nextBatches.push(b);
      continue;
    }
    const take = Math.min(b.remaining, left);
    left -= take;
    const remaining = b.remaining - take;
    if (remaining > 0) nextBatches.push({ ...b, remaining });
  }

  if (left > 0) {
    throw new InsufficientTokensError(user.creditBalance ?? 0, cost);
  }

  const balanceAfter = sumRemaining(nextBatches);
  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId, creditBalance: { $gte: cost } },
    {
      $set: {
        creditBalance: balanceAfter,
        tokenBatches: nextBatches,
        tokenBatchesMigratedAt: user.tokenBatchesMigratedAt ?? now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!result) {
    const bal = await getUserBalance(clerkId);
    throw new InsufficientTokensError(bal?.balance ?? 0, cost);
  }

  await db.collection<CreditTransaction>("credit_transactions").insertOne({
    clerkId,
    delta: -cost,
    reason: "consume",
    ...(opts?.ref ? { ref: opts.ref } : {}),
    ...(opts?.meta ? { meta: opts.meta } : {}),
    balanceAfter: result.creditBalance ?? 0,
    createdAt: now,
  });
  return result.creditBalance ?? 0;
}

/**
 * Credit tokens (signup, subscription, top-up, trial, refund, admin).
 * Adds a 6‑month FIFO batch.
 */
export async function grantTokens(
  clerkId: string,
  amount: number,
  reason: Exclude<CreditReason, "consume" | "expire">,
  opts?: { ref?: string; meta?: Record<string, unknown> },
): Promise<number | null> {
  if (!isMongoConfigured() || amount <= 0) return null;
  await migrateAndPruneBatches(clerkId);
  const db = await getDb();
  const now = new Date();
  const batch: TokenBatch = {
    id: randomUUID(),
    remaining: amount,
    grantedAt: now,
    expiresAt: tokenExpiresAt(now),
    source: reason,
  };

  const result = await db.collection<DbUser>("users").findOneAndUpdate(
    { clerkId },
    {
      $inc: { creditBalance: amount },
      $push: { tokenBatches: batch },
      $set: {
        updatedAt: now,
        tokenBatchesMigratedAt: now,
      },
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
    ...(opts?.meta ? { meta: { ...opts.meta, batchId: batch.id, expiresAt: batch.expiresAt } } : { meta: { batchId: batch.id, expiresAt: batch.expiresAt } }),
    balanceAfter,
    createdAt: now,
  });
  return balanceAfter;
}

/**
 * One-time Free pack. Idempotent via `signupGrantAt`.
 */
export async function ensureSignupGrant(clerkId: string): Promise<number | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const now = new Date();
  const claimed = await db.collection<DbUser>("users").findOneAndUpdate(
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
    },
    { returnDocument: "after" },
  );
  if (!claimed) return null;
  return grantTokens(clerkId, FREE_SIGNUP_GRANT_TOKENS, "signup_grant", {
    meta: { source: "ensureSignupGrant" },
  });
}

export function insufficientTokensResponse(err: InsufficientTokensError) {
  return {
    error: err.message,
    code: "INSUFFICIENT_TOKENS" as const,
    balance: err.balance,
    required: err.required,
    offerProTrial: true as const,
  };
}
