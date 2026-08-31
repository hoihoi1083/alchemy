/**
 * Per-action token costs.
 *
 * Priced so Master yearly ($79 / 16,000 tokens ≈ $0.0049375 / token) still
 * yields ~75% gross margin vs fal COGS. Every cheaper plan (monthly, Standard
 * yearly, top-up $10/1,000) is fatter. Tokens = ceil(fal / 0.25 / 0.0049375).
 *
 * Operator COGS of granted tokens ≈ 25% of Master yearly revenue
 * → 1,000 tokens ≈ USD 1.23 fal.
 *
 * Free signup grant is intentionally smaller than a full 1K image + 8s 480p
 * H3 clip (see FREE_PACK) — enough for a short trial, not a full combo run.
 */
import {
  FREE_SIGNUP_GRANT_TOKENS,
  PLAN_DEFINITIONS,
  TOKEN_COGS_USD_PER_1000,
} from "@/lib/billing/plans";
import type { UserPlan } from "@/lib/billing/plans";

export const USD_PER_TOKEN = TOKEN_COGS_USD_PER_1000 / 1000;

/** Master yearly — cheapest paid token. Use this when sizing new rates. */
export const MASTER_YEARLY_USD_PER_TOKEN = 79 / 16_000;

/** Target gross margin vs fal on that cheapest token. */
export const TARGET_GROSS_MARGIN = 0.75;

/** ceil(falUsd / (1 − margin) / Master-yearly $/token). */
export function tokensForFalUsd(falUsd: number): number {
  const userUsd = falUsd / (1 - TARGET_GROSS_MARGIN);
  return Math.max(1, Math.ceil(userUsd / MASTER_YEARLY_USD_PER_TOKEN));
}

/** Flat action costs (tokens). */
export const TOKEN_COST = {
  image: 65, // Nano Banana 2 1K $0.08
  image_ab: 130, // 2 images
  campaign: 200, // 3×65 + plan
  teaching_carousel: 265, // plan + 4×65; prefer estimateTeachingCarouselTokens(n)
  storyboard_scene: 65, // same 1K still as image
  storyboard_batch: 260, // typical 4 scenes
  music: 82, // ~$0.10
  voiceover: 13, // ~$0.015
  bgm: 5, // local ffmpeg mix — small operator cost
  plan: 5, // LLM plan / brief ~$0.01–0.02 (not fal video)
  /**
   * FLUX.1 [pro] Fill on fal: $0.05 / megapixel (rounded up).
   * $0.05 → 41 tok/MP at 75% Master yearly.
   */
  inpaint: 41,
  /** ffmpeg caption burn + R2 persist — CPU/storage, not fal; flat processing fee. */
  caption_burn: 8,
  /** edit-image-2 Florence OCR + object detect (no generative erase). */
  smart_layers_detect: 8,
  /** BiRefNet matte on a single layer crop. */
  smart_layers_matte: 5,
  /** Local ring-fill heal (no FLUX). Generative erase uses estimateInpaintTokens. */
  smart_layers_heal: 3,
} as const;

/** Tokens for FLUX Fill — bill by rounded megapixels when known. */
export function estimateInpaintTokens(megapixels = 1): number {
  const mp = Math.max(1, Math.ceil(megapixels));
  return TOKEN_COST.inpaint * mp;
}

/**
 * MiniMax H3 on fal — billed separately from Seedance.
 * 480P $0.05/s → 41 tok/s; 768P $0.08/s → 65 tok/s; 2K $0.13/s → 106 tok/s.
 * UI 480p → 480P (Free cap); 720p → 768P (Standard); 1080p → 2K.
 */
export const H3_TOKENS_PER_SEC = {
  "480P": 41, // $0.05/s · 8s = 328 · Free cap
  "768P": 65, // $0.08/s · 8s = 520 · Standard 720p
  "2K": 106, // $0.13/s · 8s = 848
  "4K": 130, // $0.16/s
} as const;

export type H3BillingResolution = keyof typeof H3_TOKENS_PER_SEC;

/**
 * Seedance on fal — reel / quality path. Priced at the same 75% Master-yearly
 * rule so we do not lose money when Seedance actually runs.
 */
export const VIDEO_TOKENS_PER_SEC = {
  "480p": 113, // ~$0.139/s → 8s = 904
  "720p_fast": 196, // fal Fast $0.2419/s → 8s = 1568
  "720p": 246, // fal Standard $0.3034/s → 8s = 1968
  "1080p": 553, // fal $0.682/s → 8s = 4424
} as const;

/**
 * HeyGen Avatar IV / V on fal — $0.10 per output video second.
 * $0.10 → 82 tokens/sec at 75% Master yearly.
 */
export const HEYGEN_TOKENS_PER_SEC = 82;
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
 * Used as H3 face-policy / duration fallback for storyboard scenes.
 */
export const KLING_TURBO_PRO = {
  endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  tokens5s: 284, // $0.35
  tokensPerExtraSec: 57, // $0.07
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

/** Seedance estimate (duration "auto" → 8s). */
export function estimateVideoTokens(opts: {
  resolution: string;
  fast: boolean;
  duration: "auto" | number;
}): number {
  const res = resolveVideoBillingResolution(opts.resolution, opts.fast);
  const sec = opts.duration === "auto" ? 8 : opts.duration;
  return videoTokenCost(res, sec);
}

export function resolveH3BillingResolution(resolution: string): H3BillingResolution {
  const t = (resolution ?? "").trim();
  const lower = t.toLowerCase();
  if (t === "4K" || lower === "4k" || lower === "2160p") return "4K";
  if (t === "2K" || lower === "2k" || lower.includes("1080")) return "2K";
  if (t === "480P" || lower === "480p" || lower === "480") return "480P";
  return "768P";
}

/** Plan video cap → billing enum (Free 480p, Standard 720p, Pro/Master 1080p). */
export function h3BillingResolutionForPlan(plan: UserPlan): H3BillingResolution {
  const cap = PLAN_DEFINITIONS[plan].maxVideoResolution;
  if (cap === "480p") return "480P";
  if (cap === "720p") return "768P";
  return "2K";
}

export function h3TokenCost(
  resolution: H3BillingResolution,
  durationSec: number,
): number {
  const sec = Math.max(5, Math.min(15, Math.round(durationSec)));
  return H3_TOKENS_PER_SEC[resolution] * sec;
}

/**
 * MiniMax H3 estimate. Extra reference images after the first 5 cost $0.08
 * each on fal. Reference video is billed at the output $/s × input seconds
 * (unknown length → assume same as output, capped 15s).
 */
export function estimateH3Tokens(opts: {
  resolution: string;
  duration: "auto" | number;
  referenceVideoSec?: number;
  extraReferenceImages?: number;
}): number {
  const res = resolveH3BillingResolution(opts.resolution);
  const sec = opts.duration === "auto" ? 8 : opts.duration;
  const output = h3TokenCost(res, sec);
  const refSec = Math.max(0, Math.min(15, Math.round(opts.referenceVideoSec ?? 0)));
  const refVideo = refSec > 0 ? H3_TOKENS_PER_SEC[res] * refSec : 0;
  const extraImgs = Math.max(0, Math.round(opts.extraReferenceImages ?? 0));
  return output + refVideo + extraImgs * TOKEN_COST.image;
}

/** Free pack: signup grant is intentionally smaller than a full image+video combo. */
export const FREE_PACK = {
  image: TOKEN_COST.image, // 65
  video8s480p: H3_TOKENS_PER_SEC["480P"] * 8, // 328
  total: TOKEN_COST.image + H3_TOKENS_PER_SEC["480P"] * 8, // 393
  grant: FREE_SIGNUP_GRANT_TOKENS,
  buffer: FREE_SIGNUP_GRANT_TOKENS - (TOKEN_COST.image + H3_TOKENS_PER_SEC["480P"] * 8),
} as const;

/** Nano Banana `/api/generate-image` pack size (JSON + multipart). */
export const MAX_GENERATE_IMAGE_COUNT = 4;

export function clampGenerateImageCount(n: number | undefined | null): number {
  const raw = Math.round(Number(n));
  if (!Number.isFinite(raw)) return 1;
  return Math.min(MAX_GENERATE_IMAGE_COUNT, Math.max(1, raw));
}

/** 65 tokens per still — 2 → 130, 3 → 195, 4 → 260. */
export function imageCountTokenCost(numImages?: number | null): number {
  return TOKEN_COST.image * clampGenerateImageCount(numImages);
}

export function estimateTeachingCarouselTokens(slideCount: number): number {
  const n = Math.min(7, Math.max(3, Math.round(slideCount) || 5));
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
  if (mode === "ab") return TOKEN_COST.image_ab;
  if (mode === "campaign") return TOKEN_COST.campaign;
  if (mode === "teaching_carousel") {
    return estimateTeachingCarouselTokens(opts.sceneCount ?? 5);
  }
  if (mode === "storyboard") {
    const n = Math.max(1, opts.sceneCount ?? 4);
    const passes = Math.max(1, opts.passesPerScene ?? 1);
    return TOKEN_COST.storyboard_scene * n * passes;
  }
  return imageCountTokenCost(opts.numImages);
}

/** Token cost to regenerate one still vs the full current image run. */
export function estimateImageRegenTokens(opts: {
  scope: "one" | "all";
  outputMode?: "single" | "ab" | "campaign" | "carousel" | "teaching-carousel";
  isStoryboard?: boolean;
  isCinematic?: boolean;
  sceneCount?: number;
}): number {
  if (opts.scope === "one") {
    return opts.isStoryboard || opts.isCinematic
      ? TOKEN_COST.storyboard_scene
      : TOKEN_COST.image;
  }
  if (opts.isStoryboard || opts.isCinematic) {
    return estimateImageTokens({
      mode: "storyboard",
      sceneCount: opts.sceneCount ?? 4,
    });
  }
  const mode = opts.outputMode ?? "single";
  return estimateImageTokens({
    mode:
      mode === "ab"
        ? "ab"
        : mode === "campaign" || mode === "carousel"
          ? "campaign"
          : mode === "teaching-carousel"
            ? "teaching_carousel"
            : "single",
    numImages: mode === "ab" ? 2 : 1,
    sceneCount: opts.sceneCount,
  });
}

export function cogsUsdForTokens(tokens: number): number {
  return Math.round(tokens * USD_PER_TOKEN * 100) / 100;
}

/**
 * Landing capacity unit: a typical short storyboard reel
 * (2 scenes × 5s Kling clips ≈ 10s stitched).
 */
export const STORYBOARD_LANDING_PACK = {
  scenes: 2,
  clipSec: 5 as const,
  totalSec: 10,
  imageTokens: TOKEN_COST.storyboard_scene * 2, // 130
  videoTokens: estimateKlingStoryboardTokens(2, 5), // 568
  /** Stills + Kling animate — one full ~10s storyboard run. */
  totalTokens: TOKEN_COST.storyboard_scene * 2 + estimateKlingStoryboardTokens(2, 5),
} as const;

export type LandingCapacityPlan = Extract<
  UserPlan,
  "free" | "light" | "standard" | "pro" | "master" | "custom"
>;

/** 8s video at the plan’s max resolution (480P / 768P / 2K). */
export function h3Video8sTokensForPlan(plan: LandingCapacityPlan): number {
  return H3_TOKENS_PER_SEC[h3BillingResolutionForPlan(plan)] * 8;
}

export type PlanApproxCapacity = {
  plan: LandingCapacityPlan;
  tokens: number;
  /** Rough count if tokens are spent only on single images (1K Nano Banana). */
  approxImages: number;
  /** Rough count if spent only on 8s H3 clips at the plan max resolution. */
  approxVideos8s: number;
  /**
   * Rough count if spent only on ~10s storyboard reels
   * (2 scenes × 5s Kling + stills).
   */
  approxStoryboards: number;
  storyboardScenes: number;
  storyboardSec: number;
};

/**
 * Marketing estimates for the landing “what can I make?” section.
 * Not a hard cap — mix of formats, longer clips, and logo passes use more.
 */
export function estimatePlanApproxCapacity(
  plan: LandingCapacityPlan,
): PlanApproxCapacity {
  const def = PLAN_DEFINITIONS[plan];
  const tokens = def.monthlyTokens;
  const packCost = STORYBOARD_LANDING_PACK.totalTokens;
  const video8s = h3Video8sTokensForPlan(plan);
  return {
    plan,
    tokens,
    approxImages: Math.max(0, Math.floor(tokens / TOKEN_COST.image)),
    approxVideos8s: Math.max(0, Math.floor(tokens / video8s)),
    approxStoryboards: Math.max(0, Math.floor(tokens / packCost)),
    storyboardScenes: STORYBOARD_LANDING_PACK.scenes,
    storyboardSec: STORYBOARD_LANDING_PACK.totalSec,
  };
}
