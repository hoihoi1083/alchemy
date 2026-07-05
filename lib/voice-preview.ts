import { promises as fs } from "fs";
import path from "path";
import {
  getVoicePresetConfig,
  voicePresetsForLocale,
  type VoiceoverLocale,
  type VoicePresetId,
} from "@/lib/ad-pack-preferences";
import type { VoicePreviewTrack } from "@/lib/ad-pack-types";
import { synthesizeSpeechToFile } from "@/lib/pipeline/tts";
import { azureVoiceForLocale } from "@/lib/ad-pack-preferences";

const PREVIEW_FILES = ["preview-voice-0.mp3", "preview-voice-1.mp3", "preview-voice-2.mp3"] as const;

export type VoicePreviewError = {
  presetId: VoicePresetId;
  message: string;
};

export type VoicePreviewResult = {
  tracks: VoicePreviewTrack[];
  errors: VoicePreviewError[];
};

export async function generateVoicePreviewTracks(args: {
  script: string;
  locale: VoiceoverLocale;
  jobDir: string;
  pipelineUrl: (file: string) => string;
}): Promise<VoicePreviewResult> {
  const presets = voicePresetsForLocale(args.locale).slice(0, PREVIEW_FILES.length);
  const tracks: VoicePreviewTrack[] = [];
  const errors: VoicePreviewError[] = [];

  for (let i = 0; i < presets.length; i++) {
    const presetId = presets[i];
    const cfg = getVoicePresetConfig(presetId);
    const fileName = PREVIEW_FILES[i];
    const outputPath = path.join(args.jobDir, fileName);
    const { voice, xmlLang } = azureVoiceForLocale(args.locale);

    try {
      await synthesizeSpeechToFile({
        text: args.script,
        voice,
        xmlLang,
        locale: args.locale,
        outputPath,
        voicePresetId: presetId,
      });

      tracks.push({
        id: presetId,
        presetId,
        label: cfg.labelKey,
        audioUrl: args.pipelineUrl(fileName),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Voice preview failed.";
      errors.push({ presetId, message });
    }
  }

  return { tracks, errors };
}

export async function ensureJobDir(jobDirPath: string): Promise<void> {
  await fs.mkdir(jobDirPath, { recursive: true });
}
