import { NextResponse } from "next/server";
import { TeamError, leaveTeam } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    await leaveTeam(auth.user.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to leave team.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
