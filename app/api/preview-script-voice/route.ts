import { NextResponse } from "next/server";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";
import {
  VOICEOVER_LOCALES,
  type VoiceoverLocale,
} from "@/lib/ad-pack-preferences";
import { jobDir } from "@/lib/pipeline/paths";
import { pipelineFileUrl } from "@/lib/pipeline/local-input";
import { ensureJobDir, generateVoicePreviewTracks } from "@/lib/voice-preview";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOCALES = new Set<VoiceoverLocale>(VOICEOVER_LOCALES);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: { script?: string; locale?: string };
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

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);

  try {
    await ensureJobDir(dir);
    const { tracks, errors } = await generateVoicePreviewTracks({
      script,
      locale,
      jobDir: dir,
      pipelineUrl: (file) => pipelineFileUrl(request, jobId, file),
    });
    if (!tracks.length) {
      const detail = errors.map((e) => `${e.presetId}: ${e.message}`).join("; ");
      return NextResponse.json(
        { error: detail || "Voice preview failed for all presets." },
        { status: 502 },
      );
    }
    if (tracks.length) {
      await trackUsage(auth.user.userId, "voiceover");
    }
    return NextResponse.json({ tracks, errors, jobId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Voice preview failed.";
    const status =
      message.includes("FAL_KEY") || message.includes("AZURE_SPEECH") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
