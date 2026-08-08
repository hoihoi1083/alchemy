import type { ImageJobMeta } from "@/hooks/useWizardState";
import type { VideoPhase } from "@/hooks/useWizardState";

/** Heuristic durations (seconds) — tuned for fal + DeepSeek sequential pipelines. */
export const PROGRESS_ESTIMATES = {
  singleImage: 28,
  singleImageWithReferenceAnalyze: 42,
  campaignPlanSec: 14,
  campaignSlideSec: 16,
  teachingCarouselPlanSec: 16,
  teachingCarouselSlideSec: 22,
  storyboardPlanSec: 14,
  storyboardSceneSec: 10,
  cinematicReelPlanSec: 18,
  cinematicReelSceneSec: 12,
  /** Seedance / fal video — often 2–5 min; keep ETA honest so UI doesn’t sit at “~2s”. */
  videoSeedanceSec: 210,
  videoSeedanceWithBgmSec: 260,
  /** Reference / research R2V (+ possible H3 fallback) — commonly 4–10 min. */
  videoReferenceR2vSec: 420,
  videoCompositorSec: 38,
  videoSecondFrameExtraSec: 18,
} as const;

export function estimateImageJobTotalSec(meta: ImageJobMeta): number {
  switch (meta.kind) {
    case "storyboard":
      return (
        PROGRESS_ESTIMATES.storyboardPlanSec +
        meta.sceneCount * PROGRESS_ESTIMATES.storyboardSceneSec
      );
    case "cinematic-reel":
      return (
        PROGRESS_ESTIMATES.cinematicReelPlanSec +
        meta.sceneCount * PROGRESS_ESTIMATES.cinematicReelSceneSec
      );
    case "campaign":
      return (
        PROGRESS_ESTIMATES.campaignPlanSec +
        meta.sceneCount * PROGRESS_ESTIMATES.campaignSlideSec
      );
    case "teaching-carousel":
      return (
        PROGRESS_ESTIMATES.teachingCarouselPlanSec +
        meta.sceneCount * PROGRESS_ESTIMATES.teachingCarouselSlideSec
      );
    case "image":
    default:
      return meta.sceneCount > 1
        ? PROGRESS_ESTIMATES.singleImageWithReferenceAnalyze
        : PROGRESS_ESTIMATES.singleImage;
  }
}

export function estimateVideoJobTotalSec(
  phase: VideoPhase,
  usesCompositor: boolean,
  options?: { referenceR2v?: boolean },
): number {
  if (usesCompositor) return PROGRESS_ESTIMATES.videoCompositorSec;
  if (phase === "bgm") return PROGRESS_ESTIMATES.videoSeedanceWithBgmSec;
  if (phase === "second-frame") {
    return PROGRESS_ESTIMATES.videoSeedanceSec + PROGRESS_ESTIMATES.videoSecondFrameExtraSec;
  }
  if (options?.referenceR2v) return PROGRESS_ESTIMATES.videoReferenceR2vSec;
  return PROGRESS_ESTIMATES.videoSeedanceSec;
}

/** Remaining seconds for ETA copy — soft floor after overrun so we never claim “~2s” at 97%. */
export function estimateRemainingSec(totalSec: number, elapsedSec: number): number {
  const remaining = totalSec - elapsedSec;
  if (remaining > 0) return Math.max(8, remaining);
  const overrun = elapsedSec - totalSec;
  return Math.min(240, Math.max(45, 45 + Math.floor(overrun * 0.4)));
}
