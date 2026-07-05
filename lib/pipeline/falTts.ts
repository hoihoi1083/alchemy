import { fal } from "@fal-ai/client";
import { promises as fs } from "fs";
import path from "path";
import {
  falVoiceForLocale,
  falVoiceForPreset,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import { downloadToFile } from "@/lib/pipeline/ffmpeg";

const DEFAULT_ENDPOINT = "fal-ai/minimax/speech-2.8-hd";

function extractAudioUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  for (const key of ["audio", "audio_file", "audio_url"]) {
    const val = d[key];
    if (typeof val === "string" && val.startsWith("http")) return val;
    if (val && typeof val === "object" && val !== null) {
      const url = (val as { url?: unknown }).url;
      if (typeof url === "string") return url;
    }
  }
  return undefined;
}

export function falLanguageBoostForLocale(locale: VoiceoverLocale): string {
  switch (locale) {
    case "hk":
      return "Chinese,Yue";
    case "cn":
      return "Chinese";
    default:
      return "English";
  }
}

/** Pick language_boost when script locale may not match voice locale (e.g. 粵語 copy + English voice). */
export function falLanguageBoostForLocaleAndText(
  locale: VoiceoverLocale,
  text: string,
): string {
  const hasCjk = /[\u3400-\u9FFF]/.test(text);
  if (locale === "en" && hasCjk) return "auto";
  if ((locale === "hk" || locale === "cn") && !hasCjk) return "auto";
  return falLanguageBoostForLocale(locale);
}

export function falTtsEndpoint(): string {
  return process.env.FAL_TTS_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
}

export async function synthesizeSpeechToFileFal(args: {
  text: string;
  locale: VoiceoverLocale;
  outputPath: string;
  voicePresetId?: VoicePresetId;
  voiceId?: string;
  speed?: number;
}): Promise<{ voice: string }> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY is not configured.");
  fal.config({ credentials: key });

  const endpoint = falTtsEndpoint();
  const { voiceId, speed } =
    args.voiceId && args.speed !== undefined
      ? { voiceId: args.voiceId, speed: args.speed }
      : args.voicePresetId
        ? falVoiceForPreset(args.voicePresetId)
        : falVoiceForLocale(args.locale);
  const result = await fal.subscribe(endpoint, {
    input: {
      prompt: args.text.trim(),
      language_boost: falLanguageBoostForLocaleAndText(args.locale, args.text),
      voice_setting: {
        voice_id: voiceId,
        speed,
        vol: 1,
        pitch: 0,
      },
    },
    logs: false,
  });

  const audioUrl = extractAudioUrl(result.data);
  if (!audioUrl) {
    throw new Error("fal TTS returned no audio URL.");
  }

  await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
  await downloadToFile(audioUrl, args.outputPath);
  return { voice: `${endpoint} · ${voiceId}` };
}
