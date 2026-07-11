import type { CaptionLine } from "@/lib/ad-pack-types";

/**
 * Hook ads: punchy hook on top, product line on bottom — both visible for the full clip.
 */
export function layoutHookSplitCaptions(
  hookScript: string,
  voiceoverScript: string,
  durationSec: number,
): CaptionLine[] {
  const duration = Math.max(1, durationSec);
  const hook = hookScript.trim();
  const body = voiceoverScript.trim();

  if (hook && body && hook !== body) {
    return [
      { startSec: 0, endSec: duration, text: hook, position: "top" },
      { startSec: 0, endSec: duration, text: body, position: "bottom" },
    ];
  }

  const fallback = body || hook;
  if (!fallback) {
    return [
      {
        startSec: 0,
        endSec: Math.min(3, duration),
        text: "Hook",
        position: "bottom",
      },
    ];
  }

  return [{ startSec: 0, endSec: duration, text: fallback, position: "bottom" }];
}
