import { grantTokens } from "@/lib/billing/ledger";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export type PendingRefundDoc = {
  actorClerkId: string;
  billedClerkId: string;
  amount: number;
  meta: Record<string, unknown>;
  errorKind: "null_user" | "throw";
  attempts: number;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
};

const COLLECTION = "billing_pending_refunds";

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

/**
 * Retry queued refunds (e.g. after transient Mongo errors). Safe to call on /api/me.
 */
export async function processPendingRefundsForBilledUser(
  billedClerkId: string,
  limit = 5,
): Promise<number> {
  if (!isMongoConfigured()) return 0;
  const db = await getDb();
  const pending = await db
    .collection<PendingRefundDoc>(COLLECTION)
    .find({ billedClerkId, status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();

  let completed = 0;
  for (const row of pending) {
    const balanceAfter = await grantTokens(row.billedClerkId, row.amount, "refund", {
      meta: { ...row.meta, phase: "refund", pendingRefund: true },
    });
    const now = new Date();
    if (balanceAfter !== null) {
      await db.collection<PendingRefundDoc>(COLLECTION).updateOne(
        { _id: row._id },
        { $set: { status: "completed", updatedAt: now } },
      );
      completed += 1;
    } else {
      await db.collection<PendingRefundDoc>(COLLECTION).updateOne(
        { _id: row._id },
        {
          $inc: { attempts: 1 },
          $set: {
            updatedAt: now,
            lastError: "grantTokens returned null (user row missing)",
          },
        },
      );
    }
  }
  return completed;
}
