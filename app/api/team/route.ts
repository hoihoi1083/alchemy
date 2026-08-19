import { NextResponse } from "next/server";
import { TeamError, getTeamDashboardForOwner } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    const team = await getTeamDashboardForOwner(auth.user.userId);
    return NextResponse.json({ ok: true, team });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load team.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

