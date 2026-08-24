import { NextResponse } from "next/server";
import { listTeamSharedAssets } from "@/lib/db/assets";
import type { DbUser } from "@/lib/db/types";
import { getDb } from "@/lib/mongodb";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { getActiveTeamMembership } from "@/lib/team/service";
import { parseTimingManifest } from "@/lib/video-timing-manifest";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const membership = await getActiveTeamMembership(auth.user.userId);
  if (!membership) {
    return NextResponse.json({ available: false, assets: [] });
  }

  const assets = await listTeamSharedAssets(membership.teamId, 200);
  const sharerIds = [
    ...new Set(
      assets
        .map((a) => a.sharedByClerkId || a.clerkId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const db = await getDb();
  const users =
    sharerIds.length > 0
      ? await db
          .collection<DbUser>("users")
          .find({ clerkId: { $in: sharerIds } })
          .project({ clerkId: 1, name: 1, email: 1 })
          .toArray()
      : [];
  const labelByClerk = new Map(
    users.map((u) => [
      u.clerkId,
      u.name?.trim() || u.email?.trim() || u.clerkId.slice(0, 8),
    ]),
  );

  return NextResponse.json({
    available: true,
    teamId: membership.teamId,
    role: membership.role,
    assets: assets.map((a) => {
      const sharedBy = a.sharedByClerkId || a.clerkId;
      return {
        id: String(a._id),
        kind: a.kind,
        name: a.name,
        contentType: a.contentType,
        projectId: a.projectId ?? null,
        createdAt: a.createdAt,
        sharedAt: a.sharedAt ?? a.createdAt,
        teamShared: true,
        isMine: a.clerkId === auth.user.userId,
        sharedByLabel: labelByClerk.get(sharedBy) ?? sharedBy.slice(0, 8),
        downloadUrl: `/api/library/download/${String(a._id)}`,
        previewUrl: `/api/library/download/${String(a._id)}?inline=1`,
        timingManifest: parseTimingManifest(a.timingManifest) ?? undefined,
      };
    }),
  });
}
