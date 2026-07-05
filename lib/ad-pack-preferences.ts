/** User override for AI BGM mood — guides DeepSeek music.promptEn. */
export type MusicMood = "auto" | "warm" | "upbeat" | "premium" | "cinematic";

export const MUSIC_MOODS: MusicMood[] = ["auto", "warm", "upbeat", "premium", "cinematic"];

export function musicMoodHint(mood: MusicMood): string {
  switch (mood) {
    case "warm":
      return "Warm lifestyle instrumental: soft piano, gentle pads, 85–95 BPM, inviting, no vocals.";
    case "upbeat":
      return "Upbeat energetic instrumental: pop/electronic pulse, 105–120 BPM, positive, no vocals.";
    case "premium":
      return "Premium minimal instrumental: clean, luxurious, subtle strings, 80–90 BPM, no vocals.";
    case "cinematic":
      return "Cinematic instrumental: light orchestral swell, emotional build, 90–100 BPM, no vocals.";
    default:
      return "Pick the best instrumental mood for this product and script.";
  }
}

/** Storyboard scene count — auto lets DeepSeek choose inside duration range. */
export type StoryboardSceneCount = "auto" | "4" | "5" | "6" | "7";

export const STORYBOARD_SCENE_COUNTS: StoryboardSceneCount[] = ["auto", "4", "5", "6", "7"];

/** TTS locale for scripted voiceover dub. */
export type VoiceoverLocale = "hk" | "en" | "cn";

export const VOICEOVER_LOCALES: VoiceoverLocale[] = ["hk", "en", "cn"];

export function azureVoiceForLocale(locale: VoiceoverLocale): { voice: string; xmlLang: string } {
  switch (locale) {
    case "hk":
      return { voice: "zh-HK-HiuGaaiNeural", xmlLang: "zh-HK" };
    case "cn":
      return { voice: "zh-CN-XiaoxiaoNeural", xmlLang: "zh-CN" };
    default:
      return { voice: "en-US-JennyNeural", xmlLang: "en-US" };
  }
}

/** MiniMax / fal voice preset — user picks before video generate. */
export type VoicePresetId =
  | "hk-female-pro"
  | "hk-male-warm"
  | "cn-female"
  | "cn-male"
  | "en-female"
  | "en-male";

export const VOICE_PRESET_IDS: VoicePresetId[] = [
  "hk-female-pro",
  "hk-male-warm",
  "cn-female",
  "cn-male",
  "en-female",
  "en-male",
];

export type VoicePresetConfig = {
  id: VoicePresetId;
  locale: VoiceoverLocale;
  voiceId: string;
  speed: number;
  /** i18n key under wizard.adPack.voicePresets */
  labelKey: VoicePresetId;
};

const VOICE_PRESETS: Record<VoicePresetId, Omit<VoicePresetConfig, "id">> = {
  "hk-female-pro": {
    locale: "hk",
    voiceId: "Cantonese_ProfessionalHost（F)",
    speed: 1.05,
    labelKey: "hk-female-pro",
  },
  "hk-male-warm": {
    locale: "hk",
    voiceId: "Cantonese_ProfessionalHost（M)",
    speed: 1.0,
    labelKey: "hk-male-warm",
  },
  "cn-female": {
    locale: "cn",
    voiceId: "Chinese (Mandarin)_Warm_Girl",
    speed: 1.0,
    labelKey: "cn-female",
  },
  "cn-male": {
    locale: "cn",
    voiceId: "Chinese (Mandarin)_Reliable_Executive",
    speed: 1.0,
    labelKey: "cn-male",
  },
  "en-female": {
    locale: "en",
    voiceId: "English_Graceful_Lady",
    speed: 1.0,
    labelKey: "en-female",
  },
  "en-male": {
    locale: "en",
    voiceId: "English_Trustworthy_Man",
    speed: 1.0,
    labelKey: "en-male",
  },
};

export function isVoicePresetId(value: string): value is VoicePresetId {
  return (VOICE_PRESET_IDS as string[]).includes(value);
}

export function getVoicePresetConfig(id: VoicePresetId): VoicePresetConfig {
  const cfg = VOICE_PRESETS[id];
  return { id, ...cfg };
}

export function voicePresetsForLocale(locale: VoiceoverLocale): VoicePresetId[] {
  return VOICE_PRESET_IDS.filter((id) => VOICE_PRESETS[id].locale === locale);
}

export function defaultVoicePresetForLocale(locale: VoiceoverLocale): VoicePresetId {
  const list = voicePresetsForLocale(locale);
  return list[0] ?? "en-female";
}

/** MiniMax voice IDs on fal — tuned for ad voiceover. */
export function falVoiceForLocale(locale: VoiceoverLocale): {
  voiceId: string;
  speed: number;
} {
  const preset = getVoicePresetConfig(defaultVoicePresetForLocale(locale));
  return { voiceId: preset.voiceId, speed: preset.speed };
}

export function falVoiceForPreset(presetId: VoicePresetId): {
  voiceId: string;
  speed: number;
} {
  const preset = getVoicePresetConfig(presetId);
  return { voiceId: preset.voiceId, speed: preset.speed };
}

/** Rough spoken length budget for timed voiceover scripts. */
export function maxVoiceoverChars(durationSec: number, locale: VoiceoverLocale): number {
  const perSec = locale === "en" ? 12 : 3.8;
  return Math.max(16, Math.round(durationSec * perSec));
}
