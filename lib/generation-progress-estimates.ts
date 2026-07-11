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
  videoSeedanceSec: 55,
  videoSeedanceWithBgmSec: 75,
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
): number {
  if (usesCompositor) return PROGRESS_ESTIMATES.videoCompositorSec;
  if (phase === "bgm") return PROGRESS_ESTIMATES.videoSeedanceWithBgmSec;
  if (phase === "second-frame") {
    return PROGRESS_ESTIMATES.videoSeedanceSec + PROGRESS_ESTIMATES.videoSecondFrameExtraSec;
  }
  return PROGRESS_ESTIMATES.videoSeedanceSec;
}
