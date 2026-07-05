import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ProjectSnapshot } from "@/lib/project-snapshot";
import type { DbProject } from "@/lib/db/types";

export async function listProjectsForUser(
  clerkId: string,
  limit = 20,
): Promise<WithId<DbProject>[]> {
  const db = await getDb();
  return db
    .collection<DbProject>("projects")
    .find({ clerkId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getProjectForUser(
  clerkId: string,
  projectId: string,
): Promise<WithId<DbProject> | null> {
  if (!ObjectId.isValid(projectId)) return null;
  const db = await getDb();
  return db.collection<DbProject>("projects").findOne({
    _id: new ObjectId(projectId),
    clerkId,
  });
}

export async function createProject(input: {
  clerkId: string;
  name: string;
  snapshot: ProjectSnapshot;
}): Promise<WithId<DbProject>> {
  const db = await getDb();
  const now = new Date();
  const doc: DbProject = {
    clerkId: input.clerkId,
    name: input.name.trim() || "Untitled project",
    promotionMode: input.snapshot.settings.promotionMode,
    templateId: input.snapshot.settings.templateId,
    snapshot: input.snapshot,
    imageUrl: input.snapshot.media.imageUrl,
    videoUrl: input.snapshot.media.videoUrl,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<DbProject>("projects").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateProject(
  clerkId: string,
  projectId: string,
  patch: {
    name?: string;
    snapshot?: ProjectSnapshot;
  },
): Promise<WithId<DbProject> | null> {
  if (!ObjectId.isValid(projectId)) return null;
  const db = await getDb();
  const now = new Date();
  const $set: Partial<DbProject> & { updatedAt: Date } = { updatedAt: now };
  if (patch.name !== undefined) $set.name = patch.name.trim() || "Untitled project";
  if (patch.snapshot) {
    $set.snapshot = patch.snapshot;
    $set.promotionMode = patch.snapshot.settings.promotionMode;
    $set.templateId = patch.snapshot.settings.templateId;
    $set.imageUrl = patch.snapshot.media.imageUrl;
    $set.videoUrl = patch.snapshot.media.videoUrl;
  }
  const result = await db.collection<DbProject>("projects").findOneAndUpdate(
    { _id: new ObjectId(projectId), clerkId },
    { $set },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deleteProject(clerkId: string, projectId: string): Promise<boolean> {
  if (!ObjectId.isValid(projectId)) return false;
  const db = await getDb();
  const result = await db.collection<DbProject>("projects").deleteOne({
    _id: new ObjectId(projectId),
    clerkId,
  });
  return result.deletedCount === 1;
}
