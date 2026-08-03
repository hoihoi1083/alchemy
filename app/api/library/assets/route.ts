import { NextResponse } from "next/server";
import { listAssetsForUser } from "@/lib/db/assets";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { parseTimingManifest } from "@/lib/video-timing-manifest";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  const assets = await listAssetsForUser(auth.user.userId, 200);
  return NextResponse.json({
    assets: assets.map((a) => ({
      id: String(a._id),
      kind: a.kind,
      name: a.name,
      contentType: a.contentType,
      projectId: a.projectId ?? null,
      createdAt: a.createdAt,
      downloadUrl: `/api/library/download/${String(a._id)}`,
      previewUrl: `/api/library/download/${String(a._id)}?inline=1`,
      timingManifest: parseTimingManifest(a.timingManifest) ?? undefined,
    })),
  });
}
