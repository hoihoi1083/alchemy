/**
 * A vs B video stack — one bit: does this Generate include a research MP4?
 *
 * B (reel): Seedance R2V quality → MiniMax H3 → stop. Never Kling.
 * A stills TVC (九宫格): MiniMax H3 → Kling stitch only if no reel.
 * Hunt I2V / poster / product-assistant: H3 only — Kling is a multi-still parachute.
 * Face-heavy + reel: skip Seedance (likely 422) → H3 + reel → stop.
 */

export type VideoEnginePlan = {
  firstEngine: "seedance" | "minimax-h3";
  /** Reel path is always quality Seedance — never /fast. */
  seedanceFast: boolean;
  allowKling: boolean;
  stack: "b-reel" | "a-stills" | "a-poster" | "a-reel-faces";
};

/** Kling ffmpeg speed-up cap — keep in sync with timeCompressVideoToDuration. */
export const KLING_TIME_COMPRESS_MAX = 1.85;

export function isFaceHeavyVideoJob(input: {
  visualStyleId?: string | null;
  videoCreativeMode?: string | null;
  subjectFraming?: string | null;
}): boolean {
  const style = String(input.visualStyleId ?? "").toLowerCase();
  const mode = String(input.videoCreativeMode ?? "").toLowerCase();
  const framing = String(input.subjectFraming ?? "").toLowerCase();
  if (
    style.includes("ugc") ||
    style.includes("model-wear") ||
    style.includes("presenter")
  ) {
    return true;
  }
  if (mode.includes("ugc") || mode.includes("presenter")) return true;
  if (
    framing === "auto" &&
    (style.includes("lifestyle") || style === "brand-video")
  ) {
    return true;
  }
  return false;
}

export function parseFaceHeavyFlag(
  raw: FormDataEntryValue | string | null | undefined,
): boolean {
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function resolveVideoEnginePlan(input: {
  motionPoster?: boolean;
  hasReel: boolean;
  faceHeavy?: boolean;
  /** Multi-still 九宫格 TVC — only this path may Kling-stitch. */
  storyboard?: boolean;
}): VideoEnginePlan {
  if (input.motionPoster) {
    return {
      firstEngine: "minimax-h3",
      seedanceFast: false,
      allowKling: false,
      stack: "a-poster",
    };
  }
  if (input.hasReel && input.faceHeavy) {
    return {
      firstEngine: "minimax-h3",
      seedanceFast: false,
      allowKling: false,
      stack: "a-reel-faces",
    };
  }
  if (input.hasReel) {
    return {
      firstEngine: "seedance",
      seedanceFast: false,
      allowKling: false,
      stack: "b-reel",
    };
  }
  return {
    firstEngine: "minimax-h3",
    seedanceFast: false,
    allowKling: Boolean(input.storyboard),
    stack: "a-stills",
  };
}

/** Product-assistant / poster: leftover @Video1 in a DeepSeek plan must not require an MP4. */
export function stripReferenceVideoTags(prompt: string): string {
  return prompt
    .replace(/@\s*Video\s*\d+\b/gi, "")
    .replace(/\bVideo\s+\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function klingStitchMinOutputSec(rawStitchSec: number): number {
  return rawStitchSec / KLING_TIME_COMPRESS_MAX;
}

/**
 * 4×5s Kling = 20s raw → min ~10.8s after 1.85×.
 * 12s can hit; 6s/8s cannot.
 */
export function klingStitchCanHitDuration(
  rawStitchSec: number,
  targetSec: number,
  opts?: { clipCount?: number },
): boolean {
  if ((opts?.clipCount ?? 2) < 2) return true;
  const target = Math.max(1, Number(targetSec) || 0);
  const raw = Math.max(0, Number(rawStitchSec) || 0);
  if (raw <= target * 1.12) return true;
  return klingStitchMinOutputSec(raw) <= target * 1.12;
}

export class KlingDurationUnreachableError extends Error {
  readonly code = "KLING_DURATION_UNREACHABLE";
  outputDurationSec?: number;

  constructor(message: string, outputDurationSec?: number) {
    super(message);
    this.name = "KlingDurationUnreachableError";
    this.outputDurationSec = outputDurationSec;
  }
}

export const REFERENCE_VIDEO_REQUIRED_MESSAGE =
  "Reference video (@Video1) was required but could not be used. We did not generate a stills-only clip — fix the MP4 and retry.";

export const KLING_DURATION_UNREACHABLE_MESSAGE =
  "Kling stitch cannot hit this duration (min 5s per still, max 1.85× speed-up). Retry MiniMax H3 or pick 12s.";
