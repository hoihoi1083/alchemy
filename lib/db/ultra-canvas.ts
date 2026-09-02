import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { UltraCanvasSnapshot } from "@/lib/ultra-canvas-snapshot";

export type DbUltraCanvasBoard = {
  clerkId: string;
  name: string;
  snapshot: UltraCanvasSnapshot;
  createdAt: Date;
  updatedAt: Date;
};

export async function listUltraCanvasBoardsForUser(
  clerkId: string,
  limit = 30,
): Promise<WithId<DbUltraCanvasBoard>[]> {
  const db = await getDb();
  return db
    .collection<DbUltraCanvasBoard>("ultra_canvas_boards")
    .find({ clerkId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getUltraCanvasBoardForUser(
  clerkId: string,
  boardId: string,
): Promise<WithId<DbUltraCanvasBoard> | null> {
  if (!ObjectId.isValid(boardId)) return null;
  const db = await getDb();
  return db.collection<DbUltraCanvasBoard>("ultra_canvas_boards").findOne({
    _id: new ObjectId(boardId),
    clerkId,
  });
}

export async function createUltraCanvasBoard(input: {
  clerkId: string;
  name: string;
  snapshot: UltraCanvasSnapshot;
}): Promise<WithId<DbUltraCanvasBoard>> {
  const db = await getDb();
  const now = new Date();
  const doc: DbUltraCanvasBoard = {
    clerkId: input.clerkId,
    name: input.name.trim() || "Untitled board",
    snapshot: input.snapshot,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<DbUltraCanvasBoard>("ultra_canvas_boards").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateUltraCanvasBoard(
  clerkId: string,
  boardId: string,
  patch: { name?: string; snapshot?: UltraCanvasSnapshot },
): Promise<WithId<DbUltraCanvasBoard> | null> {
  if (!ObjectId.isValid(boardId)) return null;
  const db = await getDb();
  const now = new Date();
  const $set: Partial<DbUltraCanvasBoard> & { updatedAt: Date } = { updatedAt: now };
  if (patch.name !== undefined) $set.name = patch.name.trim() || "Untitled board";
  if (patch.snapshot) $set.snapshot = patch.snapshot;
  const result = await db.collection<DbUltraCanvasBoard>("ultra_canvas_boards").findOneAndUpdate(
    { _id: new ObjectId(boardId), clerkId },
    { $set },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deleteUltraCanvasBoard(clerkId: string, boardId: string): Promise<boolean> {
  if (!ObjectId.isValid(boardId)) return false;
  const db = await getDb();
  const result = await db.collection<DbUltraCanvasBoard>("ultra_canvas_boards").deleteOne({
    _id: new ObjectId(boardId),
    clerkId,
  });
  return result.deletedCount === 1;
}
