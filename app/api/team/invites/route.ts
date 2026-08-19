import { NextResponse } from "next/server";
import { TeamError, createTeamInvite } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { email?: string };
    const email = body?.email?.trim() ?? "";
    const data = await createTeamInvite(auth.user.userId, email);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to create invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

