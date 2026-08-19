import { NextResponse } from "next/server";
import { TeamError, revokeTeamInvite } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { inviteId?: string };
    const inviteId = body?.inviteId?.trim() ?? "";
    if (!inviteId) {
      return NextResponse.json({ error: "inviteId is required." }, { status: 400 });
    }
    await revokeTeamInvite(auth.user.userId, inviteId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to revoke invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

