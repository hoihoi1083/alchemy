import type { VideoCreativity } from "@/lib/video-creativity";
import { motionStrengthForCreativity } from "@/lib/video-creativity";
import type { TemplateId } from "@/lib/templates";
import { getTemplate } from "@/lib/templates";

export type VideoResolution = "480p" | "720p";
export type VideoDuration = "4" | "6" | "8" | "10" | "12" | "auto";

export type VideoMotionStyle =
  | "slow-push"
  | "gentle-orbit"
  | "static-glow"
  | "pull-out";

export type VideoSettings = {
  resolution: VideoResolution;
  duration: VideoDuration;
  motionStyle: VideoMotionStyle;
  creativity: VideoCreativity;
  /** AI generates a second frame from your product (start → end) for richer motion. */
  autoSecondFrame: boolean;
  fast: boolean;
};

export const VIDEO_RESOLUTIONS: VideoResolution[] = ["480p", "720p"];
export const VIDEO_DURATIONS: VideoDuration[] = ["4", "6", "8", "10", "12", "auto"];
export const VIDEO_MOTION_STYLES: VideoMotionStyle[] = [
  "slow-push",
  "gentle-orbit",
  "static-glow",
  "pull-out",
];

const MOTION_TO_CAMERA: Record<VideoMotionStyle, string> = {
  "slow-push": "Slow Push In",
  "gentle-orbit": "Orbit Around Subject",
  "static-glow": "Static Locked Shot",
  "pull-out": "Slow Pull Out",
};

const MOTION_STRENGTH: Record<VideoMotionStyle, number> = {
  "slow-push": 30,
  "gentle-orbit": 28,
  "static-glow": 22,
  "pull-out": 28,
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  resolution: "480p",
  duration: "8",
  motionStyle: "gentle-orbit",
  creativity: "lively",
  autoSecondFrame: true,
  fast: true,
};

export function cameraForMotion(style: VideoMotionStyle): string {
  return MOTION_TO_CAMERA[style];
}

export function motionStrengthForStyle(style: VideoMotionStyle): number {
  return MOTION_STRENGTH[style];
}

/** Match template default camera (from visual style) to motion picker. */
export function defaultMotionStyleForTemplate(templateId: TemplateId): VideoMotionStyle {
  const camera = getTemplate(templateId).camera.toLowerCase();
  if (camera.includes("pull")) return "pull-out";
  if (camera.includes("orbit")) return "gentle-orbit";
  if (camera.includes("static")) return "static-glow";
  return "slow-push";
}

export function videoSettingsForWorkflow(
  mode: "image-only" | "video-only" | "combined",
  templateId: TemplateId,
): VideoSettings {
  const motionStyle = defaultMotionStyleForTemplate(templateId);
  if (mode === "video-only") {
    return {
      ...DEFAULT_VIDEO_SETTINGS,
      motionStyle,
      autoSecondFrame: false,
      resolution: "480p",
      fast: true,
      duration: "6",
    };
  }
  if (mode === "combined") {
    return {
      ...DEFAULT_VIDEO_SETTINGS,
      motionStyle,
      autoSecondFrame: false,
      creativity: "subtle",
      resolution: "720p",
      fast: false,
    };
  }
  return { ...DEFAULT_VIDEO_SETTINGS, motionStyle };
}

/** Merge user panel choices with template defaults (aspect ratio, avoid text, etc.). */
export function resolveVideoGenerationOpts(
  templateId: TemplateId,
  settings: VideoSettings,
): {
  resolution: string;
  duration: string;
  camera: string;
  motionStrength: number;
  fast: boolean;
  aspectRatio: string;
  avoidOnScreenText: boolean;
} {
  const tpl = getTemplate(templateId);
  const baseMotion = motionStrengthForStyle(settings.motionStyle);
  return {
    resolution: settings.resolution,
    duration: settings.duration,
    camera: cameraForMotion(settings.motionStyle),
    motionStrength: motionStrengthForCreativity(baseMotion, settings.creativity),
    fast: settings.fast,
    aspectRatio: tpl.aspectRatio,
    avoidOnScreenText: tpl.avoidOnScreenText,
  };
}
