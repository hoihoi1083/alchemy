/** Ultra canvas script planning — scene count + director beats. */

import { MAX_CINEMATIC_SCENES } from "@/lib/cinematic-scene-config";
import type { CinematicScenePlan } from "@/lib/cinematic-reel-types";

export const ULTRA_SCRIPT_SCENE_COUNT_MIN = 3;
export const ULTRA_SCRIPT_SCENE_COUNT_MAX = MAX_CINEMATIC_SCENES;
export const ULTRA_SCRIPT_SCENE_COUNT_DEFAULT = 6;

export function clampUltraScriptSceneCount(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return ULTRA_SCRIPT_SCENE_COUNT_DEFAULT;
  return Math.min(
    ULTRA_SCRIPT_SCENE_COUNT_MAX,
    Math.max(ULTRA_SCRIPT_SCENE_COUNT_MIN, Math.round(n)),
  );
}

export type ScriptSceneBeat = {
  time?: string;
  emotion?: string;
  line?: string;
  /** Cast alias who speaks the line, e.g. PersonB. */
  speaker?: string;
  /** Act title for storyboard grouping, e.g. "Act 1 · Pain". */
  act?: string;
  /** Shot size / framing, e.g. medium close-up. */
  framing?: string;
  /** Camera move or angle, e.g. slow push-in. */
  camera?: string;
  /** Blocking / performance action. */
  blocking?: string;
};

export function buildScriptBriefWithBeats(
  brief: string,
  beats: ScriptSceneBeat[] | undefined,
): string {
  const base = brief.trim();
  const rows = (beats ?? []).filter(
    (b) =>
      b.time?.trim() ||
      b.emotion?.trim() ||
      b.line?.trim() ||
      b.framing?.trim() ||
      b.camera?.trim() ||
      b.blocking?.trim(),
  );
  if (!rows.length) return base;
  const lines = rows.map((b, i) => {
    const parts = [`Beat ${i + 1}`];
    if (b.act?.trim()) parts.push(`act: ${b.act.trim()}`);
    if (b.time?.trim()) parts.push(b.time.trim());
    if (b.emotion?.trim()) parts.push(`emotion: ${b.emotion.trim()}`);
    if (b.framing?.trim()) parts.push(`framing: ${b.framing.trim()}`);
    if (b.camera?.trim()) parts.push(`camera: ${b.camera.trim()}`);
    if (b.blocking?.trim()) parts.push(`blocking: ${b.blocking.trim()}`);
    if (b.speaker?.trim()) parts.push(`speaker: ${b.speaker.trim()}`);
    if (b.line?.trim()) parts.push(`line/dialogue: ${b.line.trim()}`);
    return parts.join(" | ");
  });
  return `${base}\n\nDirector scene beats:\n${lines.join("\n")}`;
}

/**
 * Merge cinematic plan scenes into ScriptSceneBeat[].
 * Fills line/speaker from spokenLine; keeps prior beat framing when present.
 */
export function mergeSceneBeatsFromCinematicScenes(
  scenes: Array<
    Pick<
      CinematicScenePlan,
      "spokenLine" | "speaker" | "role" | "startSec" | "endSec" | "sceneDescriptionZh"
    >
  >,
  prior?: ScriptSceneBeat[],
): ScriptSceneBeat[] {
  return scenes.map((s, i) => {
    const prev = prior?.[i];
    const line = s.spokenLine?.trim() || prev?.line?.trim() || undefined;
    const speaker =
      s.speaker?.trim() ||
      prev?.speaker?.trim() ||
      (line ? "Narrator" : undefined);
    return {
      time:
        prev?.time?.trim() ||
        `${Math.round(s.startSec)}-${Math.round(s.endSec)}s`,
      emotion: prev?.emotion?.trim() || s.role?.trim() || undefined,
      line,
      speaker,
      framing: prev?.framing,
      camera: prev?.camera,
      blocking: prev?.blocking || s.sceneDescriptionZh?.trim() || undefined,
    };
  });
}

/** Stable fingerprint of VO dialogue on script beats (for stale detection). */
export function scriptDialogueFingerprint(
  beats: ScriptSceneBeat[] | undefined,
): string {
  return (beats ?? [])
    .map((b) => `${(b.speaker ?? "").trim()}|${(b.line ?? "").trim()}`)
    .join("\n");
}

/** Append spoken performance cue into an image→video motion prompt. */
export function motionPromptWithDialogue(
  motion: string,
  beat?: Pick<ScriptSceneBeat, "line" | "speaker"> | null,
): string {
  const base = motion.trim();
  const line = beat?.line?.trim();
  if (!line) return base;
  const who = beat?.speaker?.trim();
  const cue = who
    ? `${who} speaks aloud (performance / mouth movement only — no on-screen text or subtitles): "${line}"`
    : `Spoken performance (mouth movement only — no on-screen text): "${line}"`;
  if (base.toLowerCase().includes(line.toLowerCase())) return base;
  return base ? `${base}. ${cue}` : cue;
}
