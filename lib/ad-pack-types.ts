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
  text: string;
  position?: CaptionPosition;
};

export type AdPackMusicPlan = {
  styleLabel: string;
  promptEn: string;
  durationSec: number;
  moodTags: string[];
};

export type AdPackPlan = {
  hookScript: string;
  voiceoverScript: string;
  captionLines: CaptionLine[];
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
