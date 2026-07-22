import type { CaptionLine } from "@/lib/ad-pack-types";
import { defaultCaptionLineCount } from "@/lib/plan-caption-voice";

/** Evenly distribute caption lines across `[0, durationSec]`. */
export function splitCaptionLinesOverDuration(
  lines: CaptionLine[],
  durationSec: number,
): CaptionLine[] {
  const filled = lines.filter((l) => l.text.trim());
  const base = filled.length > 0 ? filled : lines;
  if (!base.length) return [];
  const target = Math.max(0.5, durationSec);
  const slice = target / base.length;
  return base.map((line, i) => ({
    ...line,
    startSec: Number((i * slice).toFixed(1)),
    endSec: Number(Math.min(target, (i + 1) * slice).toFixed(1)),
  }));
}

/** Split a spoken script into phrases (prefer 。！？ sentence breaks). */
export function splitVoiceScriptPhrases(script: string): string[] {
  const trimmed = script.trim();
  if (!trimmed) return [];
  const bySentence = trimmed
    .split(/[。！!？?\n]+/u)
    .map((s) => s.replace(/^[，,、\s]+|[，,、\s]+$/gu, "").trim())
    .filter(Boolean);
  if (bySentence.length >= 2) return bySentence;
  return trimmed
    .split(/[，,、；;]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge phrases so count fits video length (about 3–8 lines). */
function fitPhraseCount(phrases: string[], videoDurationSec: number): string[] {
  if (!phrases.length) return [];
  const target = defaultCaptionLineCount(videoDurationSec);
  if (phrases.length <= target) return phrases;
  const out = [...phrases];
  while (out.length > target) {
    let shortest = 0;
    for (let i = 1; i < out.length - 1; i++) {
      if (
        out[i].length + out[i + 1].length <
        out[shortest].length + out[shortest + 1].length
      ) {
        shortest = i;
      }
    }
    out[shortest] = `${out[shortest]}，${out[shortest + 1]}`;
    out.splice(shortest + 1, 1);
  }
  return out;
}

/**
 * Build timed captions from an existing voice script (no AI).
 * Same text is used for on-screen captions and per-line TTS mix.
 */
export function captionLinesFromVoiceScript(
  script: string,
  durationSec: number,
  opts?: { stylePreset?: string },
): CaptionLine[] {
  const phrases = fitPhraseCount(splitVoiceScriptPhrases(script), durationSec);
  if (!phrases.length) return [];
  const target = Math.max(0.5, durationSec);
  const slice = target / phrases.length;
  return phrases.map((text, i) => ({
    startSec: Number((i * slice).toFixed(1)),
    endSec: Number(Math.min(target, (i + 1) * slice).toFixed(1)),
    text,
    position: (i % 2 === 0 ? "bottom" : "top") as CaptionLine["position"],
    stylePreset: opts?.stylePreset,
  }));
}

/** First caption start — where natural-speed voiceover should begin. */
export function captionVoiceStartSec(lines: CaptionLine[]): number {
  const filled = lines.filter((l) => l.text.trim());
  if (!filled.length) return 0;
  return Math.max(0, Math.min(...filled.map((l) => l.startSec)));
}

export function probeAudioDurationSec(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const done = (sec: number) => {
      audio.removeAttribute("src");
      audio.load();
      resolve(sec);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      done(Number.isFinite(d) && d > 0 ? d : 0);
    };
    audio.onerror = () => done(0);
    audio.src = url;
  });
}
