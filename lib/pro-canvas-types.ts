import type { ArtStyleId } from "@/lib/art-style";
import type { ImageResolutionCap } from "@/lib/billing/entitlements";
import type { ImageAspectRatio } from "@/lib/image-aspect-ratio";
import type {
  UltraBackgroundPreset,
  UltraLightingPreset,
  UltraVideoAspectRatio,
} from "@/lib/ultra-pro-controls";

export type ProCanvasNodeKind =
  | "upload"
  | "image"
  | "video"
  | "text"
  | "audio"
  | "camera"
  | "script"
  | "splice"
  | "textVideo"
  | "lighting"
  | "background"
  | "grade"
  | "brand"
  | "character"
  | "research"
  | "world"
  | "storyboard"
  | "voice"
  | "brainstorm";

export type CanvasNodeBase = {
  label: string;
  /** Short name for @mentions, e.g. "Ava" */
  alias?: string;
  busy?: boolean;
  error?: string;
  /** Fingerprint of upstream inputs when output was last generated. */
  outputInputFingerprint?: string;
};

import type { ScriptSceneBeat } from "@/lib/pro-canvas-script-plan";

export type UploadNodeData = CanvasNodeBase & {
  kind: "upload";
  fileName?: string;
  previewUrl?: string;
};

export type ImageNodeData = CanvasNodeBase & {
  kind: "image";
  prompt: string;
  imageUrl?: string;
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolutionCap;
  artStyleId?: ArtStyleId;
  lightingPreset?: UltraLightingPreset;
  lightingCustom?: string;
  backgroundPreset?: UltraBackgroundPreset;
  backgroundCustom?: string;
  sceneIndex?: number;
};

export type VideoNodeData = CanvasNodeBase & {
  kind: "video";
  prompt: string;
  camera: string;
  duration: string;
  resolution: "480p" | "720p" | "1080p";
  fast: boolean;
  videoUrl?: string;
  sceneIndex?: number;
  aspectRatio?: UltraVideoAspectRatio;
  generateAudio?: boolean;
  artStyleId?: ArtStyleId;
  motionStrength?: number;
};

export type TextVideoNodeData = CanvasNodeBase & {
  kind: "textVideo";
  prompt: string;
  duration: string;
  resolution: "480p" | "720p" | "1080p";
  fast: boolean;
  videoUrl?: string;
  sceneIndex?: number;
  aspectRatio?: UltraVideoAspectRatio;
  generateAudio?: boolean;
  artStyleId?: ArtStyleId;
  motionStrength?: number;
};

export type TextNodeData = CanvasNodeBase & {
  kind: "text";
  text: string;
};

export type AudioNodeData = CanvasNodeBase & {
  kind: "audio";
  fileName?: string;
  audioUrl?: string;
};

export type CameraPreset =
  | "custom"
  | "fisheye"
  | "tilt"
  | "front_overhead"
  | "front_upturn"
  | "panorama_overhead"
  | "back_view";

export type CameraNodeData = CanvasNodeBase & {
  kind: "camera";
  preset: CameraPreset;
  spin: number;
  tilt: number;
  zoom: number;
  promptExtra: string;
  imageUrl?: string;
};

export type ScriptNodeData = CanvasNodeBase & {
  kind: "script";
  brief: string;
  scriptText?: string;
  /** Per-scene motion prompts for image-to-video (Seedance). */
  scenePrompts?: string[];
  /** Per-scene still prompts for image nodes (single frame — not motion lists). */
  sceneImagePrompts?: string[];
  /** Planned scene count (4–6) for cinematic reel planner. */
  sceneCount?: number;
  /** Optional director beats — time, emotion, dialogue line. */
  sceneBeats?: ScriptSceneBeat[];
};

export type CharacterNodeData = CanvasNodeBase & {
  kind: "character";
  fileName?: string;
  previewUrl?: string;
  /** Multi-angle turnaround sheet (optional). */
  angleSheetUrl?: string;
  /** 人物小传 — feeds identity lock in image/video prompts. */
  biography?: string;
  /** Optional prompt for AI character-sheet generation (falls back to biography). */
  generatePrompt?: string;
};

export type ResearchNodeData = CanvasNodeBase & {
  kind: "research";
  summary: string;
};

export type WorldNodeData = CanvasNodeBase & {
  kind: "world";
  /** Scene bible — location, lighting language, set dressing. */
  description: string;
  fileName?: string;
  previewUrl?: string;
  /** Full-space concept sheet generated from bible / ref. */
  spaceSheetUrl?: string;
};

export type StoryboardPanel = {
  index: number;
  title?: string;
  dialogue?: string;
  speaker?: string;
  stillPrompt: string;
  motionPrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  videoReady?: boolean;
};

/** One TapNow-style act board — contains multiple shot panels. */
export type StoryboardAct = {
  id: string;
  title: string;
  panels: StoryboardPanel[];
};

export type StoryboardLayoutMode = "grouped" | "separate";

export type StoryboardNodeData = CanvasNodeBase & {
  kind: "storyboard";
  /** Preferred: acts with multi-panels (one board = one act). */
  acts?: StoryboardAct[];
  /** Legacy flat panels — still supported; prefer acts. */
  panels: StoryboardPanel[];
  /**
   * grouped = act contact sheet on the hub.
   * separate = one Image→Video node pair per scene on the canvas; stills auto-fill Images.
   */
  layoutMode?: StoryboardLayoutMode;
};

export type VoiceLine = {
  text: string;
  startSec: number;
  endSec: number;
  /** Optional scene index this line belongs to (0-based). */
  sceneIndex?: number;
  /** e.g. "Act 1 · Scene 2" for UI. */
  sceneLabel?: string;
};

export type VoiceNodeData = CanvasNodeBase & {
  kind: "voice";
  script: string;
  locale: "hk" | "en" | "cn";
  voicePresetId: string;
  audioUrl?: string;
  /** Timed lines for mix-onto-splice (Caption-style windows). */
  lines?: VoiceLine[];
  /** Fingerprint of Script dialogue used when Pull/Generate ran — for stale checks. */
  dialogueSourceFingerprint?: string;
};

export type BrainstormOptionData = {
  id: string;
  title: string;
  hook: string;
  brief: string;
  actOutline: string;
  motionNote: string;
};

export type BrainstormNodeData = CanvasNodeBase & {
  kind: "brainstorm";
  idea: string;
  durationSec: number;
  options?: BrainstormOptionData[];
  selectedOptionId?: string;
};

export type SpliceNodeData = CanvasNodeBase & {
  kind: "splice";
  videoUrl?: string;
};

export type LightingModNodeData = CanvasNodeBase & {
  kind: "lighting";
  preset: UltraLightingPreset;
  custom?: string;
};

export type BackgroundModNodeData = CanvasNodeBase & {
  kind: "background";
  preset: UltraBackgroundPreset;
  custom?: string;
};

export type GradeModNodeData = CanvasNodeBase & {
  kind: "grade";
  artStyleId: ArtStyleId;
};

export type BrandNodeData = CanvasNodeBase & {
  kind: "brand";
  logoUrl?: string;
  tagline?: string;
  primaryColor?: string;
};

export type ProCanvasNodeData =
  | UploadNodeData
  | ImageNodeData
  | VideoNodeData
  | TextNodeData
  | AudioNodeData
  | CameraNodeData
  | ScriptNodeData
  | SpliceNodeData
  | TextVideoNodeData
  | LightingModNodeData
  | BackgroundModNodeData
  | GradeModNodeData
  | BrandNodeData
  | CharacterNodeData
  | ResearchNodeData
  | WorldNodeData
  | StoryboardNodeData
  | VoiceNodeData
  | BrainstormNodeData;

export type TaskQueueItem = {
  nodeId: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
};

export type AddableNodeType = {
  kind: ProCanvasNodeKind;
  label: string;
  group: "node" | "resource" | "modifier";
};

export type CanvasImageSource = {
  nodeId: string;
  alias: string;
  file?: File;
  url?: string;
};
