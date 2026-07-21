import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { generateMusicOptions } from "@/lib/music-generation";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import { persistUserAsset } from "@/lib/storage/persist-asset";
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
  const charged = await chargeTokens(auth.user.userId, tokenCost, { kind: "music" });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const tracks = await generateMusicOptions(promptEn, body.durationSec ?? 10);
    await trackUsage(auth.user.userId, "music");

    // Mirror generated tracks into durable storage so they stay in the library.
    const persisted = await Promise.all(
      tracks.map(async (t) => {
        if (!t.audioUrl) return t;
        const asset = await persistUserAsset({
          clerkId: auth.user.userId,
          kind: "audio",
          sourceUrl: t.audioUrl,
          name: `AI music ${t.label}`,
          prompt: promptEn,
        });
        return asset ? { ...t, assetId: String(asset._id) } : t;
      }),
    );

    return NextResponse.json({
      tracks: persisted,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "music",
      reason: "generation_failed",
    });
    const message = e instanceof Error ? e.message : "Music generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
