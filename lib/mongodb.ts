import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoDb: Db | undefined;
};

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (globalForMongo.mongoDb) {
    return globalForMongo.mongoDb;
  }

  const client = globalForMongo.mongoClient ?? new MongoClient(uri);
  if (!globalForMongo.mongoClient) {
    await client.connect();
    globalForMongo.mongoClient = client;
  }

  const db = client.db("alchemy");
  globalForMongo.mongoDb = db;
  return db;
}

export async function ensureIndexes(): Promise<void> {
  if (!uri) return;

  const db = await getDb();
  await db.collection("users").createIndex({ clerkId: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { sparse: true });
  await db.collection("projects").createIndex({ clerkId: 1, updatedAt: -1 });
  await db.collection("usage_events").createIndex({ clerkId: 1, createdAt: -1 });
  await db.collection("connection_tests").createIndex({ createdAt: -1 });
}
