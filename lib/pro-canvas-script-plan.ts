/** Ultra canvas script planning — scene count + director beats. */

import { MAX_CINEMATIC_SCENES } from "@/lib/cinematic-scene-config";

export const ULTRA_SCRIPT_SCENE_COUNT_MIN = 4;
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
    if (b.time?.trim()) parts.push(b.time.trim());
    if (b.emotion?.trim()) parts.push(`emotion: ${b.emotion.trim()}`);
    if (b.framing?.trim()) parts.push(`framing: ${b.framing.trim()}`);
    if (b.camera?.trim()) parts.push(`camera: ${b.camera.trim()}`);
    if (b.blocking?.trim()) parts.push(`blocking: ${b.blocking.trim()}`);
    if (b.line?.trim()) parts.push(`line/dialogue: ${b.line.trim()}`);
    return parts.join(" | ");
  });
  return `${base}\n\nDirector scene beats:\n${lines.join("\n")}`;
}
