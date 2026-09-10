import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { generateMusicFromVideo, generateMusicOptions } from "@/lib/music-generation";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  isLibraryAssetUrl,
  libraryAssetIdFromUrl,
  persistAndDurablize,
} from "@/lib/storage/durable-media";
import { SERVER_ERRORS } from "@/lib/api/server-errors";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    promptEn?: string;
    durationSec?: number;
    /** When set, prefer Sonilo video-to-music (analyzes pacing from the clip). */
    videoUrl?: string;
    matchVideo?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: SERVER_ERRORS.invalidInput }, { status: 400 });
  }

  const promptEn = body.promptEn?.trim() ?? "";
  const videoUrl = body.videoUrl?.trim() ?? "";
  const matchVideo = body.matchVideo === true && Boolean(videoUrl);

  if (!matchVideo && !promptEn) {
    return NextResponse.json(
      { error: "promptEn is required (or matchVideo + videoUrl)." },
      { status: 400 },
    );
  }

  const tokenCost = TOKEN_COST.music;
  const charged = await chargeTokens(auth.user.userId, tokenCost, { kind: "music" });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  try {
    const tracks = matchVideo
      ? await generateMusicFromVideo({
          videoUrl,
          promptEn: promptEn || undefined,
          numSamples: 2,
        })
      : await generateMusicOptions(promptEn, body.durationSec ?? 10);
    if (!tracks.length) {
      throw new Error("No music tracks were generated.");
    }

    // Never return ephemeral fal CDN URLs — next step / later reopen will break.
    const persisted = await Promise.all(
      tracks.map(async (t) => {
        if (!t.audioUrl) {
          throw new Error("Music track missing audio URL.");
        }
        const audioUrl = await persistAndDurablize({
          clerkId: auth.user.userId,
          kind: "audio",
          sourceUrl: t.audioUrl,
          fallbackUrl: t.audioUrl,
          name: matchVideo ? `Video-matched music ${t.label}` : `AI music ${t.label}`,
          prompt: promptEn || (matchVideo ? `video-to-music:${videoUrl}` : undefined),
        });
        if (!isLibraryAssetUrl(audioUrl)) {
          throw new Error(
            "Music could not be saved to My library. Configure cloud storage (R2) and try again.",
          );
        }
        return {
          ...t,
          assetId: libraryAssetIdFromUrl(audioUrl) ?? undefined,
          audioUrl,
        };
      }),
    );

    await trackUsage(auth.user.userId, "music");
    return NextResponse.json({
      tracks: persisted,
      matchedVideo: matchVideo,
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
