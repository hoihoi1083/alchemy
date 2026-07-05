import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  azureVoiceForLocale,
  isVoicePresetId,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import {
  assertVideoHasAudio,
  ensureFfmpeg,
  fitAudioToDuration,
  getMediaDurationSeconds,
  mixNarrationOverVideo,
} from "@/lib/pipeline/ffmpeg";
import {
  materializeMediaInput,
  pipelineFileUrl,
} from "@/lib/pipeline/local-input";
import { jobDir } from "@/lib/pipeline/paths";
import { resolveTtsProvider, synthesizeSpeechToFile } from "@/lib/pipeline/tts";
import { requireAppUser, trackUsage } from "@/lib/require-app-user";

export const runtime = "nodejs";
export const maxDuration = 120;

const LOCALES = new Set<VoiceoverLocale>(["hk", "en", "cn"]);

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  let body: {
    video_url?: string;
    script?: string;
    locale?: string;
    target_duration_sec?: number;
    speech_url?: string;
    voice_preset?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const videoUrl = body.video_url?.trim();
  const script = body.script?.trim();
  const speechUrl = body.speech_url?.trim();
  const locale = (body.locale?.trim() || "hk") as VoiceoverLocale;
  const rawPreset = body.voice_preset?.trim() ?? "";
  const voicePreset: VoicePresetId | undefined = isVoicePresetId(rawPreset)
    ? rawPreset
    : undefined;

  if (!videoUrl) {
    return NextResponse.json({ error: "video_url is required." }, { status: 400 });
  }
  if (!speechUrl && !script) {
    return NextResponse.json({ error: "script or speech_url is required." }, { status: 400 });
  }
  if (!LOCALES.has(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });

  const inputPath = path.join(dir, "input.mp4");
  const narrationSrc = path.join(
    dir,
    resolveTtsProvider() === "fal" ? "narration.mp3" : "narration.wav",
  );
  const narrationWav = path.join(dir, "narration-fit.wav");
  const outputPath = path.join(dir, "with-voice.mp4");

  const { voice, xmlLang } = azureVoiceForLocale(locale);

  try {
    await ensureFfmpeg();
    await materializeMediaInput(videoUrl, inputPath);
    const videoDuration =
      typeof body.target_duration_sec === "number" && body.target_duration_sec > 0
        ? body.target_duration_sec
        : await getMediaDurationSeconds(inputPath);

    let ttsVoice = voice;
    let ttsProvider = resolveTtsProvider();

    if (speechUrl) {
      await materializeMediaInput(speechUrl, narrationSrc);
      ttsVoice = voicePreset ? `preview:${voicePreset}` : "preview:selected";
    } else {
      const tts = await synthesizeSpeechToFile({
        text: script!,
        voice,
        xmlLang,
        locale,
        outputPath: narrationSrc,
        voicePresetId: voicePreset,
      });
      ttsVoice = tts.voice;
      ttsProvider = tts.provider;
    }

    await fitAudioToDuration(narrationSrc, narrationWav, videoDuration);
    await mixNarrationOverVideo(inputPath, narrationWav, outputPath);
    await assertVideoHasAudio(outputPath, "Voiceover mix");

    if (!speechUrl) {
      await trackUsage(auth.user.userId, "voiceover");
    }
    return NextResponse.json({
      videoUrl: pipelineFileUrl(request, jobId, "with-voice.mp4"),
      jobId,
      locale,
      voice: ttsVoice,
      provider: ttsProvider,
      videoDurationSec: videoDuration,
      usedPreviewSpeech: Boolean(speechUrl),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Voice dub failed.";
    const status =
      message.includes("AZURE_SPEECH") || message.includes("FAL_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
