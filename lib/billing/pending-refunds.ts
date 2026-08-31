import type { ObjectId } from "mongodb";
import { grantTokens } from "@/lib/billing/ledger";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export type PendingRefundStatus = "pending" | "processing" | "completed" | "failed";

export type PendingRefundDoc = {
  actorClerkId: string;
  billedClerkId: string;
  amount: number;
  meta: Record<string, unknown>;
  errorKind: "null_user" | "throw";
  attempts: number;
  status: PendingRefundStatus;
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
};

const COLLECTION = "billing_pending_refunds";
/** Stuck processing claims (crash mid-replay) return to pending. */
const STALE_PROCESSING_MS = 10 * 60 * 1000;

export async function recordPendingRefund(input: {
  actorClerkId: string;
  billedClerkId: string;
  amount: number;
  meta: Record<string, unknown>;
  errorKind: "null_user" | "throw";
  lastError?: string;
}): Promise<void> {
  if (!isMongoConfigured() || input.amount <= 0) return;
  const db = await getDb();
  const now = new Date();
  await db.collection<PendingRefundDoc>(COLLECTION).insertOne({
    actorClerkId: input.actorClerkId,
    billedClerkId: input.billedClerkId,
    amount: input.amount,
    meta: input.meta,
    errorKind: input.errorKind,
    attempts: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...(input.lastError ? { lastError: input.lastError.slice(0, 500) } : {}),
  });
}

async function releaseStaleProcessingClaims(billedClerkId?: string): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS);
  const filter: {
    status: "processing";
    updatedAt: { $lt: Date };
    billedClerkId?: string;
  } = {
    status: "processing",
    updatedAt: { $lt: cutoff },
  };
  if (billedClerkId) filter.billedClerkId = billedClerkId;
  await db.collection<PendingRefundDoc>(COLLECTION).updateMany(filter, {
    $set: {
      status: "pending",
      updatedAt: new Date(),
      lastError: "stale processing claim released for retry",
    },
  });
}

/** Atomically claim one pending row — only one concurrent replay can win. */
async function claimNextPendingRefund(
  billedClerkId: string,
): Promise<(PendingRefundDoc & { _id: ObjectId }) | null> {
  const db = await getDb();
  const now = new Date();
  const claimed = await db.collection<PendingRefundDoc>(COLLECTION).findOneAndUpdate(
    { billedClerkId, status: "pending" },
    { $set: { status: "processing", updatedAt: now } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  if (!claimed) return null;
  return claimed as PendingRefundDoc & { _id: ObjectId };
}

async function markRefundReplayCompleted(id: ObjectId): Promise<void> {
  const db = await getDb();
  await db.collection<PendingRefundDoc>(COLLECTION).updateOne(
    { _id: id, status: "processing" },
    { $set: { status: "completed", updatedAt: new Date() } },
  );
}

async function releaseRefundReplayClaim(
  id: ObjectId,
  lastError: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<PendingRefundDoc>(COLLECTION).updateOne(
    { _id: id, status: "processing" },
    {
      $inc: { attempts: 1 },
      $set: {
        status: "pending",
        updatedAt: new Date(),
        lastError: lastError.slice(0, 500),
      },
    },
  );
}

/**
 * Retry queued refunds (e.g. after transient Mongo errors). Safe to call on /api/me.
 * Each row is claimed pending→processing before grantTokens so concurrent replays
 * cannot double-credit the same refund.
 */
export async function processPendingRefundsForBilledUser(
  billedClerkId: string,
  limit = 5,
): Promise<number> {
  if (!isMongoConfigured()) return 0;

  await releaseStaleProcessingClaims(billedClerkId);

  let completed = 0;
  for (let i = 0; i < limit; i++) {
    const row = await claimNextPendingRefund(billedClerkId);
    if (!row) break;

    try {
      const balanceAfter = await grantTokens(row.billedClerkId, row.amount, "refund", {
        meta: { ...row.meta, phase: "refund", pendingRefund: true, pendingRefundId: String(row._id) },
      });
      if (balanceAfter !== null) {
        await markRefundReplayCompleted(row._id);
        completed += 1;
      } else {
        await releaseRefundReplayClaim(
          row._id,
          "grantTokens returned null (user row missing)",
        );
      }
    } catch (err) {
      await releaseRefundReplayClaim(
        row._id,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return completed;
}

export type PendingRefundSweepResult = {
  usersProcessed: number;
  completed: number;
  pendingRemaining: number;
};

/**
 * Cron sweep: replay pending refunds for every wallet with queued rows.
 * Uses the same atomic claim as /api/me — safe to run concurrently.
 */
export async function processAllPendingRefunds(opts?: {
  maxUsers?: number;
  perUserLimit?: number;
}): Promise<PendingRefundSweepResult> {
  if (!isMongoConfigured()) {
    return { usersProcessed: 0, completed: 0, pendingRemaining: 0 };
  }

  await releaseStaleProcessingClaims();

  const db = await getDb();
  const maxUsers = Math.max(1, opts?.maxUsers ?? 50);
  const perUserLimit = Math.max(1, opts?.perUserLimit ?? 10);

  const billedIds = await db
    .collection<PendingRefundDoc>(COLLECTION)
    .distinct("billedClerkId", { status: "pending" });

  let completed = 0;
  const users = billedIds.slice(0, maxUsers);
  for (const billedClerkId of users) {
    completed += await processPendingRefundsForBilledUser(billedClerkId, perUserLimit);
  }

  const pendingRemaining = await db
    .collection<PendingRefundDoc>(COLLECTION)
    .countDocuments({ status: "pending" });

  return {
    usersProcessed: users.length,
    completed,
    pendingRemaining,
  };
}
