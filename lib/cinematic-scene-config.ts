/** Concept cinematic reel: each Seedance clip length (seconds). */
export const CINEMATIC_CLIP_SEC = 8;

export const MIN_CINEMATIC_SCENES = 1;
export const MAX_CINEMATIC_SCENES = 6;

export type CinematicSceneCount = 1 | 2 | 3 | 4 | 5 | 6;

export const CINEMATIC_SCENE_COUNTS: CinematicSceneCount[] = [1, 2, 3, 4, 5, 6];

export function clampCinematicSceneCount(raw: unknown): CinematicSceneCount {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n) || n <= 1) return 1;
  if (n >= 6) return 6;
  return n as CinematicSceneCount;
}

export function cinematicTotalDurationSec(sceneCount: number): number {
  return clampCinematicSceneCount(sceneCount) * CINEMATIC_CLIP_SEC;
}

/** e.g. "0-8, 8-16, 16-24" for 3 scenes */
export function cinematicTimingRanges(sceneCount: number): string {
  const n = clampCinematicSceneCount(sceneCount);
  const ranges: string[] = [];
  for (let i = 0; i < n; i++) {
    const start = i * CINEMATIC_CLIP_SEC;
    const end = (i + 1) * CINEMATIC_CLIP_SEC;
    ranges.push(`${start}-${end}`);
  }
  return ranges.join(", ");
}
