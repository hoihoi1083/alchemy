/** Scene duration helpers for Ultra director boards (all templates). */

import type { ScriptSceneBeat } from "@/lib/pro-canvas-script-plan";

/** Seedance / Ultra UI allowed clip lengths (seconds). */
export const ULTRA_VIDEO_DURATION_CHOICES = [4, 6, 8, 10] as const;

export function snapUltraVideoDurationSec(rawSec: number): (typeof ULTRA_VIDEO_DURATION_CHOICES)[number] {
  if (!Number.isFinite(rawSec) || rawSec <= 4) return 4;
  if (rawSec <= 6) return 6;
  if (rawSec <= 8) return 8;
  return 10;
}

/** Parse beat.time like "0-2s", "8-12s", "12–20s" → length in seconds. */
export function parseBeatDurationSec(time?: string): number | undefined {
  if (!time?.trim()) return undefined;
  const m = time.trim().match(/(\d+(?:\.\d+)?)\s*[-–—~to]+\s*(\d+(?:\.\d+)?)/i);
  if (!m) return undefined;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return undefined;
  return Math.min(60, Math.max(1, b - a));
}

/**
 * Per-scene durations for spawn + VO windows.
 * Prefer beat.time spans; else evenly split totalDurationSec; else defaultSec.
 * Results are snapped to Ultra-allowed clip lengths (4/6/8/10).
 */
export function sceneDurationsFromBeats(
  beats: ScriptSceneBeat[] | undefined,
  sceneCount: number,
  opts?: { totalDurationSec?: number; defaultSec?: number },
): number[] {
  const n = Math.max(0, Math.floor(sceneCount));
  if (n === 0) return [];
  const defaultSec = opts?.defaultSec ?? 8;

  const fromBeats = Array.from({ length: n }, (_, i) => {
    const parsed = parseBeatDurationSec(beats?.[i]?.time);
    return parsed && parsed > 0 ? parsed : 0;
  });
  if (fromBeats.every((d) => d > 0)) {
    return fromBeats.map((d) => snapUltraVideoDurationSec(d));
  }

  const total = opts?.totalDurationSec;
  if (typeof total === "number" && Number.isFinite(total) && total > 0) {
    const base = Math.floor(total / n);
    const rem = Math.max(0, Math.round(total) - base * n);
    return Array.from({ length: n }, (_, i) =>
      snapUltraVideoDurationSec(Math.max(2, base + (i < rem ? 1 : 0))),
    );
  }

  return Array.from({ length: n }, (_, i) =>
    snapUltraVideoDurationSec(fromBeats[i]! > 0 ? fromBeats[i]! : defaultSec),
  );
}
