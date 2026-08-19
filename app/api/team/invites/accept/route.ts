import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
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
    const clerkUser = await currentUser().catch(() => null);
    const candidateEmails =
      clerkUser?.emailAddresses
        .map((e) => e.emailAddress)
        .filter((e): e is string => Boolean(e)) ?? [];
    const result = await acceptTeamInvite(auth.user.userId, token, candidateEmails);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TeamError) {
      return NextResponse.json(
        {
          error: err.message,
          invitedEmail: err.invitedEmail ?? null,
          ownerSignedIn: err.ownerSignedIn ?? false,
        },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Failed to accept invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

