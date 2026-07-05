import { creativityMotionHint, type VideoCreativity } from "@/lib/video-creativity";
import {
  cameraForMotion,
  motionStrengthForStyle,
  type VideoMotionStyle,
} from "@/lib/video-settings";
import { motionStrengthForCreativity } from "@/lib/video-creativity";

/** Defaults when user picks concept cinematic — not product-catalog static shimmer. */
export const CINEMATIC_REEL_VIDEO_CREATIVITY: VideoCreativity = "cinematic";

const BEAT_MOTION_STYLES: VideoMotionStyle[] = [
  "slow-push",
  "gentle-orbit",
  "pull-out",
];

export function cinematicMotionStyleForScene(
  sceneIndex: number,
  totalScenes: number,
): VideoMotionStyle {
  if (totalScenes <= 1) return "gentle-orbit";
  return BEAT_MOTION_STYLES[(sceneIndex - 1) % BEAT_MOTION_STYLES.length] ?? "gentle-orbit";
}

export function cinematicMotionStrength(
  motionStyle: VideoMotionStyle,
  creativity: VideoCreativity = CINEMATIC_REEL_VIDEO_CREATIVITY,
): number {
  const effective =
    creativity === "subtle" ? CINEMATIC_REEL_VIDEO_CREATIVITY : creativity;
  return motionStrengthForCreativity(
    motionStrengthForStyle(motionStyle),
    effective,
  );
}

const ANTI_STATIC =
  "Avoid: static locked shot, frozen frame, slideshow ken-burns only, single barely-visible zoom, no camera movement.";

export function buildCinematicClipMotionPrompt(input: {
  sceneMotionPrompt: string;
  creativity?: VideoCreativity;
  camera: string;
  motionStyle: VideoMotionStyle;
  sceneIndex: number;
  totalScenes: number;
  referenceMotionNote?: string;
}): string {
  const creativity = input.creativity ?? CINEMATIC_REEL_VIDEO_CREATIVITY;
  const beatHint = creativityMotionHint(creativity, false);
  const roleHint =
    input.totalScenes <= 1
      ? "Single 8s hook: open with energy, mid-beat subject motion, end on strong hold."
      : input.sceneIndex === 1
        ? "Opening beat: dynamic entrance — camera reveals scene, environmental motion active."
        : input.sceneIndex === input.totalScenes
          ? "Payoff beat: confident camera move to hero moment, layered motion in foreground and background."
          : "Development beat: varied camera path — not the same push-in as other scenes.";

  const parts = [
    input.sceneMotionPrompt.trim() ||
      "Cinematic social reel motion with visible camera movement and living scene energy.",
    `Camera (${input.sceneIndex}/${input.totalScenes}): ${input.camera}.`,
    beatHint,
    roleHint,
    "Add parallax, motivated lighting shifts, and subtle subject motion (people, fabric, screens, atmosphere).",
    "Premium vertical Reel / TVC pacing — multi-beat within the clip, not a still photo with a glow filter.",
    input.referenceMotionNote?.trim()
      ? `Reference motion energy (match pacing, not literal clone): ${input.referenceMotionNote.trim()}`
      : "",
    ANTI_STATIC,
  ];
  return parts.filter(Boolean).join(" ");
}

export const CINEMATIC_MOTION_PLANNER_RULES = [
  "videoMotionPrompt: English motion-only for Seedance image-to-video — describe CAMERA PATH + SUBJECT/ENVIRONMENT motion across the full clip.",
  "Each 8s clip needs 2–3 visible beats (e.g. orbit reveal → push to detail → soft pull-back) — NOT a static locked shot or single imperceptible zoom.",
  "Include environmental motion: crowd reaction, light flicker, screen glow, hair/fabric, handheld micro-shake for documentary energy when appropriate.",
  "Vary camera moves across scenes in a stitch (push / orbit / pull / lateral track) — never repeat the same move every scene.",
  "NEVER write: static shot, locked camera, subtle shimmer only, ken burns, slideshow.",
] as const;

export const CINEMATIC_MOTION_FALLBACKS = [
  "Orbit reveal around the hero subject, then push-in to emotional beat, soft rack focus, atmospheric light drift, background extras in motion",
  "Lateral track with parallax, subject turns toward camera, motivated rim light shift, cinematic handheld micro-energy",
  "Slow pull-out from detail to reveal full scene, layered foreground motion, confident TVC pacing with visible camera travel",
  "Push through atmosphere into hero moment, bokeh lights shifting, environmental motion throughout — not a frozen still",
] as const;

export function defaultCinematicSceneMotionPrompt(sceneIndex: number): string {
  return CINEMATIC_MOTION_FALLBACKS[(sceneIndex - 1) % CINEMATIC_MOTION_FALLBACKS.length];
}

/** Pull motion hints from vision analysis / USER REFERENCE extra. */
export function extractReferenceMotionNote(extra: string): string | undefined {
  const trimmed = extra.trim();
  if (!trimmed) return undefined;
  const motionMatch = trimmed.match(/\bMotion:\s*([^]+?)(?:\s+Match topic|\s+USER REFERENCE|$)/i);
  if (motionMatch?.[1]?.trim()) return motionMatch[1].trim();
  const hintsMatch = trimmed.match(/\bmotionHints?[:\s]+([^.\n]+)/i);
  return hintsMatch?.[1]?.trim();
}
