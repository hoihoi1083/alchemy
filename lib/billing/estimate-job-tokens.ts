/**
 * Client/server-shared job cost estimates for preflight (balance vs total)
 * before any fal call. Prefer over-estimating slightly over under-billing UX.
 */
import type { VideoGenerationKind } from "@/lib/video-generation-path";
import {
  estimateH3Tokens,
  estimateHeygenPresenterTokens,
  estimateImageTokens,
  estimateKlingStoryboardTokens,
  estimateSocialDripTokens,
  estimateVideoTokens,
  TOKEN_COST,
} from "@/lib/billing/token-costs";

export function insufficientTokensMessage(need: number, have: number): string {
  return `Not enough tokens. Need ${need}, have ${have}.`;
}

export function cannotAfford(
  balance: number | null | undefined,
  required: number,
): boolean {
  if (typeof balance !== "number" || !Number.isFinite(balance)) return false;
  if (!(required > 0)) return false;
  return balance < required;
}

/** Clamp used by most H3 start→end recipe videos. */
export function clampRecipeVideoDurationSec(sec: number): number {
  return Math.min(8, Math.max(5, Math.round(sec) || 6));
}

export type EstimateVideoPipelineOpts = {
  kind: VideoGenerationKind;
  resolution: string;
  /** Raw wizard duration before recipe clamp. */
  durationSec: number;
  /**
   * When true, the job will Nano Banana stills before video (worst-case count).
   * Default inferred from kind.
   */
  willGenerateStills?: boolean;
  /** Storyboard / cinematic scene counts when known. */
  sceneCount?: number;
};

/**
 * Total tokens a video generate job may charge (stills inside the job + video).
 * Used to block Generate before burning partial progress.
 */
export function estimateVideoPipelineTokens(
  opts: EstimateVideoPipelineOpts,
): number {
  const recipeDuration = clampRecipeVideoDurationSec(opts.durationSec);
  const rawDuration = Math.max(1, Math.round(opts.durationSec) || 6);
  const still = TOKEN_COST.image;
  const genStills = opts.willGenerateStills !== false;

  switch (opts.kind) {
    case "social-drip":
      return estimateSocialDripTokens({
        resolution: opts.resolution,
        duration: recipeDuration,
      });

    case "motion-poster":
    case "impact-poster":
    case "vacuum-inflate":
    case "creative-motion":
    case "hand-throw-scene":
    case "product-explode": {
      // Start (+ often end) still then H3 start→end.
      const h3 = estimateH3Tokens({
        resolution: opts.resolution,
        duration: recipeDuration,
      });
      return (genStills ? still * 2 : 0) + h3;
    }

    case "blockbuster":
      // Reference H3 from uploads — no auto still batch in the common path.
      return estimateH3Tokens({
        resolution: opts.resolution,
        duration: recipeDuration,
      });

    case "ecom-orbit":
    case "object-lock":
    case "macro-snap":
    case "luxury-tabletop":
    case "beauty-mv":
    case "imitate-ad":
    case "neon-on-real":
    case "food-bullet-time":
    case "c4d-motion":
    case "h3-showreel":
    case "h3-sphere-mg":
    case "h3-logo-mg":
    case "h3-movie-title":
    case "h3-lifestyle": {
      // Concept paths may mint one hero still first.
      const h3 = estimateH3Tokens({
        resolution: opts.resolution,
        duration: recipeDuration,
      });
      return (genStills ? still : 0) + h3;
    }

    case "image-to-video":
    case "product-assistant":
    case "text-to-video":
    case "concept-cinematic-single": {
      // Free/simple path is usually H3; overestimate with max(H3, Seedance-fast-ish).
      const h3 = estimateH3Tokens({
        resolution: opts.resolution,
        duration: rawDuration,
      });
      return Math.max(
        h3,
        estimateVideoTokens({
          resolution: opts.resolution,
          fast: true,
          duration: rawDuration,
        }),
      );
    }

    case "reference-r2v":
    case "multi-angle-r2v":
      // Research reels run H3 R2V — output + reference video seconds.
      return estimateH3Tokens({
        resolution: opts.resolution,
        duration: rawDuration,
        referenceVideoSec: rawDuration,
      });

    case "storyboard": {
      const scenes = Math.max(1, Math.round(opts.sceneCount ?? 4));
      const totalSec = Math.min(15, Math.max(5, opts.durationSec || 12));
      const clipSecRaw = Math.max(3, Math.round(totalSec / scenes));
      const clipSec = (clipSecRaw <= 5 ? 5 : 10) as 5 | 10;
      const kling = estimateKlingStoryboardTokens(scenes, clipSec);
      const h3Full = estimateH3Tokens({
        resolution: opts.resolution,
        duration: totalSec,
      });
      // Preflight against the cheaper runnable engine so we don't false-block
      // when Kling stitch would fit — server still does full afford logic.
      return Math.min(kling, h3Full);
    }

    case "cinematic-stitch": {
      const scenes = Math.max(1, Math.round(opts.sceneCount ?? 4));
      return (
        scenes *
        estimateH3Tokens({
          resolution: opts.resolution,
          duration: Math.max(5, Math.round(rawDuration / scenes) || 5),
        })
      );
    }

    case "digital-presenter":
      return estimateHeygenPresenterTokens(Math.max(4, opts.durationSec || 8));

    case "compositor":
      return TOKEN_COST.image;

    default:
      return estimateH3Tokens({
        resolution: opts.resolution,
        duration: rawDuration,
      });
  }
}

export function estimateImageJobTokens(opts: {
  mode:
    | "single"
    | "ab"
    | "campaign"
    | "teaching_carousel"
    | "storyboard"
    | "carousel";
  sceneCount?: number;
  numImages?: number;
  /** Mode A logo edit = 2 fal image calls per scene. */
  passesPerScene?: number;
}): number {
  if (opts.mode === "carousel") {
    return estimateImageTokens({
      mode: "teaching_carousel",
      sceneCount: opts.sceneCount,
    });
  }
  return estimateImageTokens({
    mode: opts.mode === "teaching_carousel" ? "teaching_carousel" : opts.mode,
    sceneCount: opts.sceneCount,
    numImages: opts.numImages,
    passesPerScene: opts.passesPerScene,
  });
}
