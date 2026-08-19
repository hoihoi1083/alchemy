import { NextResponse } from "next/server";
import { TeamError, acceptTeamInvite } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { token?: string };
    const token = body?.token?.trim() ?? "";
    if (!token) {
      return NextResponse.json({ error: "token is required." }, { status: 400 });
    }
    const result = await acceptTeamInvite(auth.user.userId, token);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to accept invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

