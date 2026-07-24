import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { chargeTokens, refundTokens } from "@/lib/billing/charge";
import { TOKEN_COST } from "@/lib/billing/token-costs";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  VOICEOVER_LOCALES,
  type VoiceoverLocale,
} from "@/lib/ad-pack-preferences";
import { jobDir } from "@/lib/pipeline/paths";
import { pipelineFileUrl } from "@/lib/pipeline/local-input";
import { ensureJobDir, generateVoicePreviewTracks } from "@/lib/voice-preview";
import { persistAndDurablize } from "@/lib/storage/durable-media";
import type { VoicePreviewTrack } from "@/lib/ad-pack-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOCALES = new Set<VoiceoverLocale>(VOICEOVER_LOCALES);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    script?: string;
    locale?: string;
    fal_voice_id?: string;
    fal_voice_speed?: number;
    fal_voice_label?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const script = body.script?.trim();
  const locale = (body.locale?.trim() || "hk") as VoiceoverLocale;

  if (!script) {
    return NextResponse.json({ error: "script is required." }, { status: 400 });
  }
  if (!LOCALES.has(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const tokenCost = TOKEN_COST.voiceover;
  const charged = await chargeTokens(auth.user.userId, tokenCost, {
    kind: "voiceover",
    locale,
  });
  if ("error" in charged) return charged.error;
  const balanceAfter = charged.balanceAfter;

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);

  try {
    await ensureJobDir(dir);
    const { tracks, errors } = await generateVoicePreviewTracks({
      script,
      locale,
      jobDir: dir,
      pipelineUrl: (file) => pipelineFileUrl(request, jobId, file),
      falVoiceId: body.fal_voice_id?.trim() || undefined,
      falVoiceSpeed: body.fal_voice_speed,
      falVoiceLabel: body.fal_voice_label?.trim() || undefined,
    });
    if (!tracks.length) {
      await refundTokens(auth.user.userId, tokenCost, {
        kind: "voiceover",
        reason: "no_tracks",
      });
      const detail = errors.map((e) => `${e.presetId}: ${e.message}`).join("; ");
      return NextResponse.json(
        { error: detail || "Voice preview failed for all presets." },
        { status: 502 },
      );
    }

    // Pipeline /tmp URLs 404 on the next Vercel instance — persist MP3s to R2.
    const durableTracks: VoicePreviewTrack[] = [];
    for (const track of tracks) {
      const fileName = path.basename(new URL(track.audioUrl, "http://local").pathname);
      const filePath = path.join(dir, fileName);
      let audioUrl = track.audioUrl;
      try {
        const bytes = await fs.readFile(filePath);
        audioUrl = await persistAndDurablize({
          clerkId: auth.user.userId,
          kind: "audio",
          sourceUrl: `voice-preview://${jobId}/${fileName}`,
          fallbackUrl: track.audioUrl,
          bytes,
          contentType: "audio/mpeg",
          name: `voice-preview-${track.presetId}`,
        });
      } catch {
        /* keep pipeline fallback */
      }
      durableTracks.push({ ...track, audioUrl });
    }

    await trackUsage(auth.user.userId, "voiceover");
    return NextResponse.json({
      tracks: durableTracks,
      errors,
      jobId,
      tokensCharged: tokenCost,
      creditBalance: balanceAfter,
    });
  } catch (e: unknown) {
    await refundTokens(auth.user.userId, tokenCost, {
      kind: "voiceover",
      reason: "generation_failed",
    });
    const message = e instanceof Error ? e.message : "Voice preview failed.";
    const status =
      message.includes("FAL_KEY") || message.includes("AZURE_SPEECH") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
