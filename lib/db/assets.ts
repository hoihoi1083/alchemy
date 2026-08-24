import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { AssetKind, DbAsset, DbTeamMember } from "@/lib/db/types";
import type { VideoTimingManifest } from "@/lib/video-timing-manifest";
import { parseTimingManifest } from "@/lib/video-timing-manifest";

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
  timingManifest?: VideoTimingManifest | null;
}): Promise<WithId<DbAsset>> {
  const db = await getDb();
  const timing = parseTimingManifest(input.timingManifest) ?? null;
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
    ...(timing ? { timingManifest: timing } : {}),
    createdAt: new Date(),
  };
  const result = await db.collection<DbAsset>("assets").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateAssetTiming(
  assetId: string,
  timingManifest: VideoTimingManifest,
): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const timing = parseTimingManifest(timingManifest);
  if (!timing) return null;
  const db = await getDb();
  const result = await db.collection<DbAsset>("assets").findOneAndUpdate(
    { _id: new ObjectId(assetId) },
    { $set: { timingManifest: timing } },
    { returnDocument: "after" },
  );
  return result ?? null;
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

/** Pure access rule for team-shared assets (unit-testable). */
export function canAccessTeamSharedAsset(opts: {
  viewerClerkId: string;
  assetOwnerClerkId: string;
  assetTeamShared: boolean;
  assetTeamId: string | null | undefined;
  viewerTeamId: string | null;
  ownerStillActiveOnTeam: boolean;
}): boolean {
  if (opts.assetOwnerClerkId === opts.viewerClerkId) return true;
  return Boolean(
    opts.viewerTeamId &&
      opts.assetTeamShared &&
      opts.assetTeamId === opts.viewerTeamId &&
      opts.ownerStillActiveOnTeam,
  );
}

async function isActiveTeamMember(
  teamId: string,
  clerkId: string,
): Promise<boolean> {
  const db = await getDb();
  const member = await db.collection<DbTeamMember>("team_members").findOne({
    teamId,
    clerkId,
    status: "active",
  });
  return Boolean(member);
}

/** Own asset, or team-shared asset for the caller's active team (owner still seated). */
export async function getAssetAccessibleToUser(
  clerkId: string,
  assetId: string,
  teamId: string | null,
): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(assetId)) return null;
  const db = await getDb();
  const asset = await db.collection<DbAsset>("assets").findOne({
    _id: new ObjectId(assetId),
  });
  if (!asset) return null;
  if (asset.clerkId === clerkId) return asset;
  if (!teamId || asset.teamShared !== true || asset.teamId !== teamId) {
    return null;
  }
  const ownerActive = await isActiveTeamMember(teamId, asset.clerkId);
  if (
    !canAccessTeamSharedAsset({
      viewerClerkId: clerkId,
      assetOwnerClerkId: asset.clerkId,
      assetTeamShared: true,
      assetTeamId: asset.teamId,
      viewerTeamId: teamId,
      ownerStillActiveOnTeam: ownerActive,
    })
  ) {
    return null;
  }
  return asset;
}

export async function listTeamSharedAssets(
  teamId: string,
  limit = 200,
): Promise<WithId<DbAsset>[]> {
  const db = await getDb();
  const activeMembers = await db
    .collection<DbTeamMember>("team_members")
    .find({ teamId, status: "active" })
    .project({ clerkId: 1 })
    .toArray();
  const memberIds = activeMembers.map((m) => m.clerkId);
  if (memberIds.length === 0) return [];
  return db
    .collection<DbAsset>("assets")
    .find({
      teamId,
      teamShared: true,
      clerkId: { $in: memberIds },
    })
    .sort({ sharedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function setAssetTeamShared(input: {
  clerkId: string;
  assetId: string;
  teamId: string;
  shared: boolean;
}): Promise<WithId<DbAsset> | null> {
  if (!ObjectId.isValid(input.assetId)) return null;
  const db = await getDb();
  if (input.shared) {
    const result = await db.collection<DbAsset>("assets").findOneAndUpdate(
      {
        _id: new ObjectId(input.assetId),
        clerkId: input.clerkId,
      },
      {
        $set: {
          teamShared: true,
          teamId: input.teamId,
          sharedAt: new Date(),
          sharedByClerkId: input.clerkId,
        },
      },
      { returnDocument: "after" },
    );
    return result ?? null;
  }
  const result = await db.collection<DbAsset>("assets").findOneAndUpdate(
    {
      _id: new ObjectId(input.assetId),
      clerkId: input.clerkId,
    },
    {
      $set: {
        teamShared: false,
        teamId: null,
        sharedAt: null,
        sharedByClerkId: null,
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

/** When a member leaves or is removed, drop their shares from the team folder. */
export async function clearTeamSharedAssetsForUser(
  teamId: string,
  clerkId: string,
): Promise<number> {
  const db = await getDb();
  const res = await db.collection<DbAsset>("assets").updateMany(
    { teamId, clerkId, teamShared: true },
    {
      $set: {
        teamShared: false,
        teamId: null,
        sharedAt: null,
        sharedByClerkId: null,
      },
    },
  );
  return res.modifiedCount;
}

/** When a team is deactivated (owner leaves Enterprise), drop all shares. */
export async function clearTeamSharedAssetsForTeam(teamId: string): Promise<number> {
  const db = await getDb();
  const res = await db.collection<DbAsset>("assets").updateMany(
    { teamId, teamShared: true },
    {
      $set: {
        teamShared: false,
        teamId: null,
        sharedAt: null,
        sharedByClerkId: null,
      },
    },
  );
  return res.modifiedCount;
}
