import { NextResponse } from "next/server";
import { requireTokens, settleTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { generateMusicOptions } from "@/lib/music-generation";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { promptEn?: string; durationSec?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const promptEn = body.promptEn?.trim();
  if (!promptEn) {
    return NextResponse.json({ error: "promptEn is required." }, { status: 400 });
  }

  const tokenCost = TOKEN_COST.music;
  const tokenGate = await requireTokens(auth.user.userId, tokenCost);
  if (tokenGate) return tokenGate;

  try {
    const tracks = await generateMusicOptions(promptEn, body.durationSec ?? 10);
    await trackUsage(auth.user.userId, "music");
    const balanceAfter = await settleTokens(auth.user.userId, tokenCost, {
      kind: "music",
    });
    return NextResponse.json({
      tracks,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Music generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
