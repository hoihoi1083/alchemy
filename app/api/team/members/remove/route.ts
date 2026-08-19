import { NextResponse } from "next/server";
import { TeamError, removeTeamMember } from "@/lib/team/service";
import { requireAppUser } from "@/lib/require-app-user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { memberClerkId?: string };
    const memberClerkId = body?.memberClerkId?.trim() ?? "";
    if (!memberClerkId) {
      return NextResponse.json({ error: "memberClerkId is required." }, { status: 400 });
    }
    await removeTeamMember(auth.user.userId, memberClerkId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to remove member.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

