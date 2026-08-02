/**
 * Per-action token costs.
 *
 * Anchor: 1,000 tokens ≈ USD 3.30 COGS → ≈ USD 0.0033 / token.
 * Derived from fal pass-through (Nano Banana ~$0.08/1K image;
 * Seedance pixel formula / published $/s; HeyGen Avatar ~$0.10/s) then rounded for UI.
 *
 * Free grant (1,000) covers 1× image + 1× 8s 480p video with buffer.
 */
import { TOKEN_COGS_USD_PER_1000 } from "@/lib/billing/plans";

export const USD_PER_TOKEN = TOKEN_COGS_USD_PER_1000 / 1000;

/** Flat action costs (tokens). */
export const TOKEN_COST = {
  image: 25, // ~$0.08
  image_ab: 50, // 2 images
  campaign: 90, // 3 slides + plan ~$0.30
  teaching_carousel: 120, // ~4 slides + plan; prefer estimateTeachingCarouselTokens(n)
  storyboard_scene: 26, // ~$0.086 — covers Nano Banana 1K ($0.08) + thin buffer
  storyboard_batch: 104, // typical 4 scenes
  music: 30, // ~$0.10
  voiceover: 5, // ~$0.015
  bgm: 5, // local ffmpeg mix — small operator cost
  plan: 5, // LLM plan / brief ~$0.01–0.02
  /**
   * FLUX.1 [pro] Fill on fal: $0.05 / megapixel (rounded up).
   * $0.05 / $0.0033 ≈ 15.2 → 16 tok for typical ~1MP social edit (+ thin buffer).
   */
  inpaint: 16,
  /** ffmpeg caption burn + R2 persist — CPU/storage, not fal; flat processing fee. */
  caption_burn: 8,
} as const;

/** Tokens for FLUX Fill — bill by rounded megapixels when known. */
export function estimateInpaintTokens(megapixels = 1): number {
  const mp = Math.max(1, Math.ceil(megapixels));
  // $0.05/MP / $0.0033 ≈ 15.15 → 16 tok/MP
  return 16 * mp;
}

/**
 * Tokens per second of Seedance video.
 * 480p aligned to fal pixel formula (~$0.134/s → ~41 tok/s).
 * 720p/1080p track published fal $/s.
 */
export const VIDEO_TOKENS_PER_SEC = {
  "480p": 42, // ~$0.139/s → 8s ≈ 336
  "720p_fast": 75, // fal Fast $0.2419/s → 8s ≈ 600
  "720p": 95, // fal Standard $0.3034/s → 8s ≈ 760
  "1080p": 210, // fal $0.682/s → 8s ≈ 1680
} as const;

/**
 * HeyGen Avatar IV / V on fal — $0.10 per output video second.
 * $0.10 / $0.0033 ≈ 30.3 → 30 tokens/sec.
 */
export const HEYGEN_TOKENS_PER_SEC = 30;
export const HEYGEN_MIN_BILL_SEC = 4;
export const HEYGEN_MAX_BILL_SEC = 60;

export function estimateHeygenPresenterTokens(durationSec: number): number {
  const sec = Math.max(
    HEYGEN_MIN_BILL_SEC,
    Math.min(HEYGEN_MAX_BILL_SEC, Math.ceil(durationSec)),
  );
  return HEYGEN_TOKENS_PER_SEC * sec;
}

/** Rough spoken length before TTS — used for affordability pre-check. */
export function estimateSpeechDurationSec(script: string, locale: "hk" | "en" | "cn"): number {
  const t = script.trim();
  if (!t) return 8;
  const cjkHeavy = locale !== "en" || /[\u4e00-\u9fff]/.test(t);
  const charsPerSec = cjkHeavy ? 4.5 : 14;
  return Math.max(HEYGEN_MIN_BILL_SEC, Math.min(HEYGEN_MAX_BILL_SEC, Math.ceil(t.length / charsPerSec)));
}

/**
 * Kling 2.5 Turbo Pro I2V (fal): $0.35 for 5s, +$0.07/extra sec.
 * Used as Seedance face-policy fallback for storyboard scenes.
 */
export const KLING_TURBO_PRO = {
  endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  tokens5s: 110, // $0.35 / $0.0033
  tokensPerExtraSec: 22, // $0.07 / $0.0033
} as const;

export type KlingClipDuration = 5 | 10;

export function klingClipTokens(durationSec: KlingClipDuration): number {
  if (durationSec <= 5) return KLING_TURBO_PRO.tokens5s;
  return KLING_TURBO_PRO.tokens5s + KLING_TURBO_PRO.tokensPerExtraSec * (durationSec - 5);
}

/** Tokens to animate N storyboard stills with Kling (then stitch). */
export function estimateKlingStoryboardTokens(
  sceneCount: number,
  clipSec: KlingClipDuration = 5,
): number {
  const n = Math.max(1, Math.min(9, Math.round(sceneCount)));
  return klingClipTokens(clipSec) * n;
}

export type VideoBillingResolution = keyof typeof VIDEO_TOKENS_PER_SEC;

export function videoTokenCost(
  resolution: VideoBillingResolution,
  durationSec: number,
): number {
  const sec = Math.max(4, Math.min(15, Math.round(durationSec)));
  return VIDEO_TOKENS_PER_SEC[resolution] * sec;
}

export function resolveVideoBillingResolution(
  resolution: string,
  fast: boolean,
): VideoBillingResolution {
  const r = resolution.toLowerCase();
  if (r.includes("1080")) return "1080p";
  if (r.includes("480")) return "480p";
  return fast ? "720p_fast" : "720p";
}

/** Client-safe estimate for video generate (duration "auto" → 8s). */
export function estimateVideoTokens(opts: {
  resolution: string;
  fast: boolean;
  duration: "auto" | number;
}): number {
  const res = resolveVideoBillingResolution(opts.resolution, opts.fast);
  const sec = opts.duration === "auto" ? 8 : opts.duration;
  return videoTokenCost(res, sec);
}

/** Free pack promise: 1 image + 1× 8s 480p (+ buffer for plan/refine). */
export const FREE_PACK = {
  image: TOKEN_COST.image, // 25
  video8s480p: VIDEO_TOKENS_PER_SEC["480p"] * 8, // 336
  total: TOKEN_COST.image + VIDEO_TOKENS_PER_SEC["480p"] * 8, // 361
  grant: 1000,
  buffer: 1000 - (TOKEN_COST.image + VIDEO_TOKENS_PER_SEC["480p"] * 8), // 639
} as const;

export function estimateTeachingCarouselTokens(slideCount: number): number {
  const n = Math.min(6, Math.max(4, Math.round(slideCount) || 5));
  // plan + one Nano Banana 1K per slide
  return TOKEN_COST.plan + TOKEN_COST.image * n;
}

export function estimateImageTokens(opts: {
  numImages?: number;
  mode?: "single" | "ab" | "campaign" | "teaching_carousel" | "storyboard";
  sceneCount?: number;
  /** Mode A logo edit = 2 fal image calls per scene. */
  passesPerScene?: number;
}): number {
  const mode = opts.mode ?? "single";
  if (mode === "ab" || (opts.numImages ?? 1) >= 2) return TOKEN_COST.image_ab;
  if (mode === "campaign") return TOKEN_COST.campaign;
  if (mode === "teaching_carousel") {
    return estimateTeachingCarouselTokens(opts.sceneCount ?? 5);
  }
  if (mode === "storyboard") {
    const n = Math.max(1, opts.sceneCount ?? 4);
    const passes = Math.max(1, opts.passesPerScene ?? 1);
    return TOKEN_COST.storyboard_scene * n * passes;
  }
  return TOKEN_COST.image;
}

export function cogsUsdForTokens(tokens: number): number {
  return Math.round(tokens * USD_PER_TOKEN * 100) / 100;
}
