import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { AssetKind, DbAsset } from "@/lib/db/types";

export async function listAssetsForUser(
  clerkId: string,
  limit = 100,
): Promise<WithId<DbAsset>[]> {
  const db = await getDb();
  return db
    .collection<DbAsset>("assets")
    .find({ clerkId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getAssetForUser(
  clerkId: string,
  assetId: string,
): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const db = await getDb();
  return db.collection<DbAsset>("assets").findOne({
    _id: new ObjectId(assetId),
    clerkId,
  });
}

/** Internal lookup by id (unguessable ObjectId) for pipeline rematerialization. */
export async function getAssetById(assetId: string): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const db = await getDb();
  return db.collection<DbAsset>("assets").findOne({ _id: new ObjectId(assetId) });
}

export async function findAssetBySource(
  clerkId: string,
  sourceUrl: string,
): Promise<WithId<DbAsset> | null> {
  const db = await getDb();
  return db.collection<DbAsset>("assets").findOne({ clerkId, sourceUrl });
}

export async function insertAsset(input: {
  clerkId: string;
  projectId?: string | null;
  kind: AssetKind;
  sourceUrl: string;
  r2Key: string;
  contentType: string;
  name?: string | null;
  prompt?: string | null;
  sizeBytes?: number | null;
}): Promise<WithId<DbAsset>> {
  const db = await getDb();
  const doc: DbAsset = {
    clerkId: input.clerkId,
    projectId: input.projectId ?? null,
    kind: input.kind,
    sourceUrl: input.sourceUrl,
    r2Key: input.r2Key,
    contentType: input.contentType,
    name: input.name ?? null,
    prompt: input.prompt ?? null,
    sizeBytes: input.sizeBytes ?? null,
    createdAt: new Date(),
  };
  const result = await db.collection<DbAsset>("assets").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateAssetContent(
  assetId: string,
  patch: { r2Key: string; contentType: string; sizeBytes?: number | null },
): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const db = await getDb();
  const result = await db.collection<DbAsset>("assets").findOneAndUpdate(
    { _id: new ObjectId(assetId) },
    {
      $set: {
        r2Key: patch.r2Key,
        contentType: patch.contentType,
        ...(patch.sizeBytes !== undefined ? { sizeBytes: patch.sizeBytes } : {}),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deleteAssetForUser(
  clerkId: string,
  assetId: string,
): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const db = await getDb();
  const result = await db.collection<DbAsset>("assets").findOneAndDelete({
    _id: new ObjectId(assetId),
    clerkId,
  });
  return result ?? null;
}
