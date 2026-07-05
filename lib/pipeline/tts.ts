import type { VoiceoverLocale, VoicePresetId } from "@/lib/ad-pack-preferences";
import { synthesizeSpeechToFile as synthesizeAzureSpeechToFile } from "@/lib/pipeline/azureTts";
import { synthesizeSpeechToFileFal } from "@/lib/pipeline/falTts";

export type TtsProvider = "fal" | "azure";

export function resolveTtsProvider(): TtsProvider {
  const forced = process.env.TTS_PROVIDER?.trim().toLowerCase();
  if (forced === "azure") return "azure";
  if (forced === "fal") return "fal";
  if (process.env.FAL_KEY?.trim()) return "fal";
  if (
    process.env.AZURE_SPEECH_KEY?.trim() &&
    process.env.AZURE_SPEECH_REGION?.trim()
  ) {
    return "azure";
  }
  throw new Error("No TTS provider configured. Set FAL_KEY or AZURE_SPEECH_*.");
}

export async function synthesizeSpeechToFile(args: {
  text: string;
  voice: string;
  xmlLang: string;
  locale: VoiceoverLocale;
  outputPath: string;
  voicePresetId?: VoicePresetId;
}): Promise<{ provider: TtsProvider; voice: string }> {
  const provider = resolveTtsProvider();
  if (provider === "fal") {
    const { voice } = await synthesizeSpeechToFileFal({
      text: args.text,
      locale: args.locale,
      outputPath: args.outputPath,
      voicePresetId: args.voicePresetId,
    });
    return { provider, voice };
  }

  await synthesizeAzureSpeechToFile({
    text: args.text,
    voice: args.voice,
    xmlLang: args.xmlLang,
    outputWavPath: args.outputPath,
  });
  return { provider, voice: args.voice };
}
