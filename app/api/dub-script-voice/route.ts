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

async function dubVoiceJob(
  request: Request,
  input: {
    videoUrl?: string;
    videoFile?: File;
    script?: string;
    locale: VoiceoverLocale;
    targetDurationSec?: number;
    speechUrl?: string;
    voicePreset?: VoicePresetId;
    trackUsageUserId?: string;
  },
) {
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

  const { voice, xmlLang } = azureVoiceForLocale(input.locale);

  await ensureFfmpeg();
  if (input.videoFile && input.videoFile.size > 0) {
    const buffer = Buffer.from(await input.videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
  } else if (input.videoUrl?.trim()) {
    await materializeMediaInput(input.videoUrl.trim(), inputPath);
  } else {
    throw new Error("video_url or video_file is required.");
  }

  const videoDuration =
    typeof input.targetDurationSec === "number" && input.targetDurationSec > 0
      ? input.targetDurationSec
      : await getMediaDurationSeconds(inputPath);

  let ttsVoice = voice;
  let ttsProvider = resolveTtsProvider();

  if (input.speechUrl) {
    await materializeMediaInput(input.speechUrl, narrationSrc);
    ttsVoice = input.voicePreset ? `preview:${input.voicePreset}` : "preview:selected";
  } else if (input.script?.trim()) {
    const tts = await synthesizeSpeechToFile({
      text: input.script.trim(),
      voice,
      xmlLang,
      locale: input.locale,
      outputPath: narrationSrc,
      voicePresetId: input.voicePreset,
    });
    ttsVoice = tts.voice;
    ttsProvider = tts.provider;
  } else {
    throw new Error("script or speech_url is required.");
  }

  await fitAudioToDuration(narrationSrc, narrationWav, videoDuration);
  await mixNarrationOverVideo(inputPath, narrationWav, outputPath);
  await assertVideoHasAudio(outputPath, "Voiceover mix");

  if (!input.speechUrl && input.trackUsageUserId) {
    await trackUsage(input.trackUsageUserId, "voiceover");
  }

  return {
    videoUrl: pipelineFileUrl(request, jobId, "with-voice.mp4"),
    jobId,
    locale: input.locale,
    voice: ttsVoice,
    provider: ttsProvider,
    videoDurationSec: videoDuration,
    usedPreviewSpeech: Boolean(input.speechUrl),
  };
}

export async function POST(request: Request) {
  const auth = await requireAppUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video_file");
      const videoUrl = (formData.get("video_url") as string | null)?.trim();
      const script = (formData.get("script") as string | null)?.trim();
      const speechUrl = (formData.get("speech_url") as string | null)?.trim();
      const locale = ((formData.get("locale") as string | null)?.trim() || "hk") as VoiceoverLocale;
      const rawPreset = (formData.get("voice_preset") as string | null)?.trim() ?? "";
      const voicePreset: VoicePresetId | undefined = isVoicePresetId(rawPreset)
        ? rawPreset
        : undefined;
      const targetRaw = formData.get("target_duration_sec");
      const targetDurationSec =
        typeof targetRaw === "string" && targetRaw.trim()
          ? Number(targetRaw)
          : undefined;

      if (!LOCALES.has(locale)) {
        return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
      }
      const file = videoFile instanceof File && videoFile.size > 0 ? videoFile : undefined;
      if (!file && !videoUrl) {
        return NextResponse.json(
          { error: "video_file or video_url is required." },
          { status: 400 },
        );
      }
      if (!speechUrl && !script) {
        return NextResponse.json({ error: "script or speech_url is required." }, { status: 400 });
      }

      const result = await dubVoiceJob(request, {
        videoFile: file,
        videoUrl,
        script,
        locale,
        targetDurationSec,
        speechUrl,
        voicePreset,
        trackUsageUserId: speechUrl ? undefined : auth.user.userId,
      });
      return NextResponse.json(result);
    }

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

    const result = await dubVoiceJob(request, {
      videoUrl,
      script,
      locale,
      targetDurationSec: body.target_duration_sec,
      speechUrl,
      voicePreset,
      trackUsageUserId: speechUrl ? undefined : auth.user.userId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Voice dub failed.";
    const status =
      message.includes("AZURE_SPEECH") || message.includes("FAL_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
