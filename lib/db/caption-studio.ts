import { ObjectId, type WithId } from "mongodb";
import type { CaptionStudioSnapshot } from "@/lib/caption-studio-snapshot";
import { getDb } from "@/lib/mongodb";

export type DbCaptionStudioPack = {
  clerkId: string;
  name: string;
  snapshot: CaptionStudioSnapshot;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "caption_studio_packs";

export async function listCaptionStudioPacksForUser(
  clerkId: string,
  limit = 40,
): Promise<WithId<DbCaptionStudioPack>[]> {
  const db = await getDb();
  return db
    .collection<DbCaptionStudioPack>(COLLECTION)
    .find({ clerkId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getCaptionStudioPackForUser(
  clerkId: string,
  packId: string,
): Promise<WithId<DbCaptionStudioPack> | null> {
  if (!ObjectId.isValid(packId)) return null;
  const db = await getDb();
  return db.collection<DbCaptionStudioPack>(COLLECTION).findOne({
    _id: new ObjectId(packId),
    clerkId,
  });
}

export async function createCaptionStudioPack(input: {
  clerkId: string;
  name: string;
  snapshot: CaptionStudioSnapshot;
}): Promise<WithId<DbCaptionStudioPack>> {
  const db = await getDb();
  const now = new Date();
  const doc: DbCaptionStudioPack = {
    clerkId: input.clerkId,
    name: input.name.trim() || "Untitled captions",
    snapshot: input.snapshot,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<DbCaptionStudioPack>(COLLECTION).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateCaptionStudioPack(
  clerkId: string,
  packId: string,
  patch: { name?: string; snapshot?: CaptionStudioSnapshot },
): Promise<WithId<DbCaptionStudioPack> | null> {
  if (!ObjectId.isValid(packId)) return null;
  const db = await getDb();
  const now = new Date();
  const $set: Partial<DbCaptionStudioPack> & { updatedAt: Date } = {
    updatedAt: now,
  };
  if (patch.name !== undefined) {
    $set.name = patch.name.trim() || "Untitled captions";
  }
  if (patch.snapshot) $set.snapshot = patch.snapshot;
  const result = await db
    .collection<DbCaptionStudioPack>(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(packId), clerkId },
      { $set },
      { returnDocument: "after" },
    );
  return result ?? null;
}

export async function deleteCaptionStudioPack(
  clerkId: string,
  packId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(packId)) return false;
  const db = await getDb();
  const result = await db.collection<DbCaptionStudioPack>(COLLECTION).deleteOne({
    _id: new ObjectId(packId),
    clerkId,
  });
  return result.deletedCount === 1;
}
