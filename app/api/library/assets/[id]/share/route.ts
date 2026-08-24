import { NextResponse } from "next/server";
import { setAssetTeamShared } from "@/lib/db/assets";
import { isMongoReady, mongoRequiredErrorMessage } from "@/lib/mongodb-production";
import { requireAppUser } from "@/lib/require-app-user";
import { getActiveTeamMembership } from "@/lib/team/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  if (!isMongoReady()) {
    return NextResponse.json({ error: mongoRequiredErrorMessage() }, { status: 503 });
  }

  let body: { shared?: unknown };
  try {
    body = (await request.json()) as { shared?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.shared !== "boolean") {
    return NextResponse.json({ error: "Body must include shared: boolean." }, { status: 400 });
  }

  const membership = await getActiveTeamMembership(auth.user.userId);
  // Sharing into the folder requires an active Enterprise seat.
  // Unsharing is always allowed for the asset owner (incl. after team deactivate).
  if (body.shared && !membership) {
    return NextResponse.json(
      { error: "Team folder is only available on an Enterprise team." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const asset = await setAssetTeamShared({
    clerkId: auth.user.userId,
    assetId: id,
    teamId: membership?.teamId ?? "",
    shared: body.shared,
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: String(asset._id),
    teamShared: asset.teamShared === true,
  });
}
