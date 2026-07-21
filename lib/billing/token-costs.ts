/**
 * Per-action token costs.
 *
 * Anchor: 1,000 tokens ≈ USD 3.30 COGS → ≈ USD 0.0033 / token.
 * Derived from fal pass-through (Nano Banana ~$0.08/1K image;
 * Seedance Fast ~$0.21–0.24/s at 480p–720p) then rounded for UI.
 *
 * Free grant (1,000) covers 1× image + 1× 8s 480p video (545) with ~455 buffer.
 */
import { TOKEN_COGS_USD_PER_1000 } from "@/lib/billing/plans";

export const USD_PER_TOKEN = TOKEN_COGS_USD_PER_1000 / 1000;

/** Flat action costs (tokens). */
export const TOKEN_COST = {
  image: 25, // ~$0.08
  image_ab: 50, // 2 images
  campaign: 90, // 3 slides + plan ~$0.30
  teaching_carousel: 120, // 4 slides + plan ~$0.40
  storyboard_scene: 20, // ~$0.06
  storyboard_batch: 80, // typical 4 scenes
  music: 30, // ~$0.10
  voiceover: 5, // ~$0.015
  bgm: 5, // local ffmpeg mix — small operator cost
  plan: 5, // LLM plan / brief ~$0.01–0.02
} as const;

/** Tokens per second of video. */
export const VIDEO_TOKENS_PER_SEC = {
  "480p": 65, // ~$0.212/s → 8s ≈ $1.70 → 520 tokens
  "720p_fast": 75, // fal Fast $0.2419/s → 8s ≈ 600
  "720p": 95, // fal Standard $0.3034/s → 8s ≈ 760
  "1080p": 210, // fal $0.682/s → 8s ≈ 1680
} as const;

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
  video8s480p: VIDEO_TOKENS_PER_SEC["480p"] * 8, // 520
  total: TOKEN_COST.image + VIDEO_TOKENS_PER_SEC["480p"] * 8, // 545
  grant: 1000,
  buffer: 1000 - (TOKEN_COST.image + VIDEO_TOKENS_PER_SEC["480p"] * 8), // 455
} as const;

export function estimateImageTokens(opts: {
  numImages?: number;
  mode?: "single" | "ab" | "campaign" | "teaching_carousel" | "storyboard";
  sceneCount?: number;
}): number {
  const mode = opts.mode ?? "single";
  if (mode === "ab" || (opts.numImages ?? 1) >= 2) return TOKEN_COST.image_ab;
  if (mode === "campaign") return TOKEN_COST.campaign;
  if (mode === "teaching_carousel") return TOKEN_COST.teaching_carousel;
  if (mode === "storyboard") {
    const n = Math.max(1, opts.sceneCount ?? 4);
    return TOKEN_COST.storyboard_scene * n;
  }
  return TOKEN_COST.image;
}

export function cogsUsdForTokens(tokens: number): number {
  return Math.round(tokens * USD_PER_TOKEN * 100) / 100;
}
