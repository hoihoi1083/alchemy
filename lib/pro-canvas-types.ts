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
  | "research";

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
  /** 人物小传 — feeds identity lock in image/video prompts. */
  biography?: string;
  /** Optional prompt for AI character-sheet generation (falls back to biography). */
  generatePrompt?: string;
};

export type ResearchNodeData = CanvasNodeBase & {
  kind: "research";
  summary: string;
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
  | ResearchNodeData;

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
