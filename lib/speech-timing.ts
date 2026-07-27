import type { VoiceoverLocale } from "@/lib/ad-pack-preferences";

/**
 * Conservative speak rates for natural-speed TTS.
 * English fal/Azure voices are slower than naive "13 cps" — overshooting
 * is why a 20s reel often gets ~26s of raw narration before hard trim.
 */
export function speechCharsPerSec(locale: VoiceoverLocale): number {
  if (locale === "en") return 10;
  return 5.2;
}

/** Fill most of the window, leave headroom for pauses / slower TTS. */
export function spokenCharBudget(
  durationSec: number,
  locale: VoiceoverLocale,
): { targetChars: number; maxChars: number } {
  const dur = Math.max(0.8, durationSec);
  const perSec = speechCharsPerSec(locale);
  // Scale with window length — fixed floors (e.g. 16 EN chars) blew past 2s slots
  // and produced ~26s TTS for a 20s / 8s reel.
  const targetChars = Math.max(
    locale === "en" ? 8 : 5,
    Math.round(dur * perSec * 0.68),
  );
  const maxChars = Math.max(
    targetChars + (locale === "en" ? 4 : 2),
    Math.round(dur * perSec * 0.8),
  );
  return { targetChars, maxChars };
}

/** Mild speed-up ceiling before we hard-trim (sounds unnatural above ~1.18). */
export const MAX_NARRATION_ATEMPO = 1.18;
