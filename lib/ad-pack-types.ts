export type CaptionPosition =
  | "top"
  | "center"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type CaptionLine = {
  startSec: number;
  endSec: number;
  /** Short on-screen caption (burned into video). */
  text: string;
  /**
   * Longer spoken line for TTS in this window.
   * When unset, mix/preview fall back to `text`.
   */
  spokenText?: string;
  position?: CaptionPosition;
  /** Per-line burned subtitle style; falls back to studio default when unset. */
  stylePreset?: string;
};

/** Text used for TTS — prefers longer spokenText when present. */
export function captionSpeakText(line: Pick<CaptionLine, "text" | "spokenText">): string {
  return (line.spokenText ?? line.text).trim();
}

export type AdPackMusicPlan = {
  styleLabel: string;
  promptEn: string;
  durationSec: number;
  moodTags: string[];
};

/** One hook angle with matching voiceover + timed captions. */
export type AdPackHookVariant = {
  hookScript: string;
  voiceoverScript: string;
  captionLines: CaptionLine[];
};

export type AdPackPlan = {
  hookScript: string;
  voiceoverScript: string;
  captionLines: CaptionLine[];
  /** Three hook angles — active fields mirror the user’s selection. */
  hookVariants: AdPackHookVariant[];
  music: AdPackMusicPlan;
  sceneNotes: string;
};

export type AiMusicTrack = {
  id: string;
  label: string;
  audioUrl: string;
};

export type VoicePreviewTrack = {
  id: string;
  label: string;
  presetId: string;
  audioUrl: string;
};
