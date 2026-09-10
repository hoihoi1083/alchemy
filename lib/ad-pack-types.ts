export type CaptionPosition =
  | "top"
  | "center"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/** Freeform per-line style overrides (preview + burn). */
export type CaptionLineStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSizeScale?: number;
  shadowColor?: string;
  shadowBlur?: number;
};

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
  /** Freeform horizontal position 0–100 (center of text). Overrides enum when set. */
  xPct?: number;
  /** Freeform vertical position 0–100 (center of text). Overrides enum when set. */
  yPct?: number;
  /** Freeform style overrides on top of preset. */
  style?: CaptionLineStyle;
};

/** One continuous VO clip on the timeline VO lane. */
export type VoClip = {
  id: string;
  audioUrl: string;
  startSec: number;
  durationSec: number;
  label?: string;
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
  durationSec?: number;
};
