import { randomUUID } from "crypto";
import type { Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { tokenExpiresAt } from "../../lib/billing/plans";

let server: MongoMemoryServer | null = null;

export async function startMemoryMongo(): Promise<void> {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri();
}

export async function stopMemoryMongo(): Promise<void> {
  const mongo = await import("../../lib/mongodb");
  try {
    await mongo.ensureIndexes();
  } catch {
    /* index race on shutdown is harmless in tests */
  }
  await mongo.resetMongoForTests();
  if (server) {
    await server.stop();
    server = null;
  }
  delete process.env.MONGODB_URI;
}

export async function getTestDb(): Promise<Db> {
  const { getDb } = await import("../../lib/mongodb");
  return getDb();
}

export async function clearBillingCollections(db: Db): Promise<void> {
  await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("credit_transactions").deleteMany({}),
    db.collection("billing_pending_refunds").deleteMany({}),
    db.collection("billing_event_locks").deleteMany({}),
  ]);
}

export type TestTokenBatch = {
  id: string;
  remaining: number;
  grantedAt: Date;
  expiresAt: Date;
  source: string;
};

export function makeBatch(
  remaining: number,
  opts?: { grantedAt?: Date; expiresAt?: Date; source?: string },
): TestTokenBatch {
  const grantedAt = opts?.grantedAt ?? new Date();
  return {
    id: randomUUID(),
    remaining,
    grantedAt,
    expiresAt: opts?.expiresAt ?? tokenExpiresAt(grantedAt),
    source: opts?.source ?? "test_seed",
  };
}

export async function seedWalletUser(
  db: Db,
  clerkId: string,
  creditBalance: number,
  opts?: {
    plan?: string;
    tokenBatches?: TestTokenBatch[];
    signupGrantAt?: Date | null;
    tokenBatchesMigratedAt?: Date | null;
  },
): Promise<void> {
  const now = new Date();
  const batches =
    opts?.tokenBatches ??
    (creditBalance > 0 ? [makeBatch(creditBalance)] : []);
  await db.collection("users").insertOne({
    clerkId,
    email: `${clerkId}@test.local`,
    emailNormalized: `${clerkId}@test.local`,
    name: null,
    imageUrl: null,
    region: "hk",
    creditBalance,
    tokenBatches: batches,
    tokenBatchesMigratedAt:
      opts?.tokenBatchesMigratedAt ?? (batches.length > 0 ? now : null),
    plan: opts?.plan ?? "free",
    signupGrantAt: opts?.signupGrantAt ?? null,
    createdAt: now,
    updatedAt: now,
  });
}
