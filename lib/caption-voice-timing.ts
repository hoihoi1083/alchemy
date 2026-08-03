import type { CaptionLine } from "@/lib/ad-pack-types";
import { defaultCaptionLineCount } from "@/lib/plan-caption-voice";

const MIN_CAPTION_LINE_SEC = 0.15;
const ZEROISH_SEC = 0.001;

function clampNonNegativeSec(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundTimingSec(value: number): number {
  return Number(clampNonNegativeSec(value).toFixed(3));
}

function evenSplitCaptionLines(lines: CaptionLine[], targetSec: number): CaptionLine[] {
  if (!lines.length) return [];
  const target = clampNonNegativeSec(targetSec);
  const slice = target / lines.length;
  return lines.map((line, i) => {
    let startSec = i * slice;
    let endSec = i === lines.length - 1 ? target : (i + 1) * slice;
    if (endSec < startSec + MIN_CAPTION_LINE_SEC) {
      startSec = Math.max(0, Math.min(startSec, endSec - MIN_CAPTION_LINE_SEC));
      endSec = Math.max(endSec, startSec + MIN_CAPTION_LINE_SEC);
    }
    return {
      ...line,
      startSec: roundTimingSec(startSec),
      endSec: roundTimingSec(endSec),
    };
  });
}

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

export function scaleCaptionLinesToDuration(
  lines: CaptionLine[],
  targetSec: number,
): CaptionLine[] {
  if (!lines.length) return [];
  const target = clampNonNegativeSec(targetSec);
  const lastEndSec = Math.max(
    0,
    ...lines.map((line) => clampNonNegativeSec(Math.max(line.startSec, line.endSec))),
  );
  if (lastEndSec <= ZEROISH_SEC) return evenSplitCaptionLines(lines, target);
  const scale = target / lastEndSec;
  return lines.map((line) => {
    let startSec = clampNonNegativeSec(line.startSec) * scale;
    let endSec = clampNonNegativeSec(line.endSec) * scale;
    if (endSec < startSec + MIN_CAPTION_LINE_SEC) {
      startSec = Math.max(0, Math.min(startSec, endSec - MIN_CAPTION_LINE_SEC));
      endSec = Math.max(endSec, startSec + MIN_CAPTION_LINE_SEC);
    }
    return {
      ...line,
      startSec: roundTimingSec(startSec),
      endSec: roundTimingSec(endSec),
    };
  });
}

export function voiceTimingStatus(voiceSec: number, maxTimelineSec: number) {
  const safeVoiceSec = clampNonNegativeSec(voiceSec);
  const safeMaxTimelineSec = clampNonNegativeSec(maxTimelineSec);
  const fittedSec = Math.min(safeVoiceSec, safeMaxTimelineSec);
  return {
    fittedSec,
    exceedsVideo: safeVoiceSec > safeMaxTimelineSec + 0.25,
    overflowSec: Math.max(0, safeVoiceSec - safeMaxTimelineSec),
    tailSilenceSec: Math.max(0, safeMaxTimelineSec - fittedSec),
  };
}

export function fitCaptionLinesToVoiceDuration(
  lines: CaptionLine[],
  voiceSec: number,
  maxTimelineSec: number,
): {
  lines: CaptionLine[];
  fittedSec: number;
  exceedsVideo: boolean;
  overflowSec: number;
  tailSilenceSec: number;
} {
  const status = voiceTimingStatus(voiceSec, maxTimelineSec);
  if (!lines.length) return { lines: [], ...status };
  return {
    lines: scaleCaptionLinesToDuration(lines, status.fittedSec),
    ...status,
  };
}

/**
 * Shift caption times by `offsetSec` (e.g. map 0-based fit/sync times onto the
 * full-video timeline when a trim window starts at `videoTrimIn`).
 * Burn/voice still rebase with `rebaseCaptionLinesAfterTrim`, which expects
 * absolute full-timeline coordinates.
 */
export function offsetCaptionLinesBySec(
  lines: CaptionLine[],
  offsetSec: number,
): CaptionLine[] {
  const offset = clampNonNegativeSec(offsetSec);
  if (offset <= ZEROISH_SEC || !lines.length) return lines;
  return lines.map((line) => ({
    ...line,
    startSec: roundTimingSec(clampNonNegativeSec(line.startSec) + offset),
    endSec: roundTimingSec(clampNonNegativeSec(line.endSec) + offset),
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
