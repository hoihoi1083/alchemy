import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

/** After a failed ensure, wait before retrying (avoids spam on every getDb). */
const INDEX_RETRY_COOLDOWN_MS = 60_000;

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoDb: Db | undefined;
  indexesOnce: Promise<void> | undefined;
  indexesFailedAt: number | undefined;
};

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

async function ensureCreditTransactionsRefIndex(db: Db): Promise<void> {
  const col = db.collection("credit_transactions");
  const existing = await col.indexes();
  const refIndex = existing.find((idx) => {
    const key = idx.key as Record<string, number> | undefined;
    return key && Object.keys(key).length === 1 && key.ref === 1;
  });

  const wantsPartial =
    refIndex?.unique === true &&
    Boolean(
      (refIndex as { partialFilterExpression?: unknown }).partialFilterExpression,
    );

  if (refIndex && !wantsPartial) {
    // Old sparse unique indexes treat `ref: null` as a key and collide.
    await col.dropIndex(refIndex.name as string);
  }

  await col.createIndex(
    { ref: 1 },
    {
      unique: true,
      partialFilterExpression: { ref: { $type: "string" } },
    },
  );
}

async function ensureStripeCustomerIdIndex(db: Db): Promise<void> {
  const col = db.collection("users");
  const existing = await col.indexes();
  const idx = existing.find((i) => {
    const key = i.key as Record<string, number> | undefined;
    return key && Object.keys(key).length === 1 && key.stripeCustomerId === 1;
  });
  const partial = (idx as { partialFilterExpression?: { stripeCustomerId?: { $type?: string } } } | undefined)
    ?.partialFilterExpression;
  const wantsPartial = partial?.stripeCustomerId?.$type === "string";
  if (idx && !wantsPartial) {
    await col.dropIndex(idx.name as string);
  }
  await col.createIndex(
    { stripeCustomerId: 1 },
    {
      unique: true,
      partialFilterExpression: { stripeCustomerId: { $type: "string" } },
    },
  );
}

async function createAllIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ clerkId: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { sparse: true });
  // One active (non-superseded) Mongo identity per normalized email.
  await db.collection("users").createIndex(
    { emailNormalized: 1 },
    {
      unique: true,
      partialFilterExpression: {
        emailNormalized: { $type: "string" },
        supersededBy: null,
      },
    },
  );
  await ensureStripeCustomerIdIndex(db);
  await db.collection("projects").createIndex({ clerkId: 1, updatedAt: -1 });
  await db.collection("brand_kits").createIndex({ clerkId: 1 }, { unique: true });
  await db.collection("usage_events").createIndex({ clerkId: 1, createdAt: -1 });
  await db.collection("credit_transactions").createIndex({ clerkId: 1, createdAt: -1 });
  await ensureCreditTransactionsRefIndex(db);
  await db.collection("connection_tests").createIndex({ createdAt: -1 });
  // Drop Stripe idempotency locks after 90 days.
  await db.collection("billing_event_locks").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 3600 },
  );
  await db.collection("assets").createIndex({ clerkId: 1, createdAt: -1 });
  await db.collection("assets").createIndex({ clerkId: 1, sourceUrl: 1 });
}

/** Idempotent index ensure — shared by getDb (fire-and-forget) and /api/db-health. */
function indexesOnce(db: Db): Promise<void> {
  if (globalForMongo.indexesOnce) return globalForMongo.indexesOnce;

  const failedAt = globalForMongo.indexesFailedAt;
  if (failedAt != null && Date.now() - failedAt < INDEX_RETRY_COOLDOWN_MS) {
    return Promise.resolve();
  }

  globalForMongo.indexesOnce = createAllIndexes(db)
    .then(() => {
      globalForMongo.indexesFailedAt = undefined;
    })
    .catch((err) => {
      globalForMongo.indexesOnce = undefined;
      globalForMongo.indexesFailedAt = Date.now();
      throw err;
    });
  return globalForMongo.indexesOnce;
}

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (globalForMongo.mongoDb) {
    void indexesOnce(globalForMongo.mongoDb).catch((err) => {
      console.error("[mongodb] ensureIndexes failed:", err);
    });
    return globalForMongo.mongoDb;
  }

  const client = globalForMongo.mongoClient ?? new MongoClient(uri);
  if (!globalForMongo.mongoClient) {
    await client.connect();
    globalForMongo.mongoClient = client;
  }

  const db = client.db("alchemy");
  globalForMongo.mongoDb = db;
  // Fire-and-forget so TTL / unique indexes exist without hitting /api/db-health.
  void indexesOnce(db).catch((err) => {
    console.error("[mongodb] ensureIndexes failed:", err);
  });
  return db;
}

export async function ensureIndexes(): Promise<void> {
  if (!uri) return;
  const db = await getDb();
  await indexesOnce(db);
}
