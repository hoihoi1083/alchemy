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
  /**
   * Research reel analyze — fetch + frames + DeepSeek (+ optional storyboard) + prepare clip.
   * Soft UI ETA; server maxDuration is 300s.
   */
  researchReelAnalyzeSec: 120,
  researchReelAnalyzeWithStoryboardSec: 150,
} as const;

export type ResearchReelAnalyzePhaseId =
  | "fetch"
  | "frames"
  | "plan"
  | "storyboard"
  | "prepare";

/** Phase boundaries as fractions of total analyze ETA. */
const RESEARCH_REEL_PHASES: {
  id: ResearchReelAnalyzePhaseId;
  endFrac: number;
  storyboardOnly?: boolean;
}[] = [
  { id: "fetch", endFrac: 0.22 },
  { id: "frames", endFrac: 0.48 },
  { id: "plan", endFrac: 0.72 },
  { id: "storyboard", endFrac: 0.88, storyboardOnly: true },
  { id: "prepare", endFrac: 1 },
];

export function estimateResearchReelAnalyzeTotalSec(withStoryboard: boolean): number {
  return withStoryboard
    ? PROGRESS_ESTIMATES.researchReelAnalyzeWithStoryboardSec
    : PROGRESS_ESTIMATES.researchReelAnalyzeSec;
}

export function researchReelAnalyzeProgress(
  elapsedSec: number,
  withStoryboard: boolean,
): {
  phase: ResearchReelAnalyzePhaseId;
  pct: number;
  remainingSec: number;
  totalSec: number;
} {
  const totalSec = estimateResearchReelAnalyzeTotalSec(withStoryboard);
  const phases = RESEARCH_REEL_PHASES.filter(
    (p) => !p.storyboardOnly || withStoryboard,
  );
  // Re-normalize endFrac across active phases so storyboard-less path still fills 0→1.
  const last = phases[phases.length - 1]!;
  const scale = last.endFrac > 0 ? 1 / last.endFrac : 1;
  let phase: ResearchReelAnalyzePhaseId = phases[0]!.id;
  for (const p of phases) {
    const endSec = totalSec * p.endFrac * scale;
    phase = p.id;
    if (elapsedSec < endSec) break;
  }
  const rawPct = Math.round((elapsedSec / totalSec) * 100);
  const pct =
    elapsedSec >= totalSec
      ? Math.min(97, 90 + Math.min(7, Math.floor((elapsedSec - totalSec) / 20)))
      : Math.min(97, Math.max(8, rawPct));
  return {
    phase,
    pct,
    remainingSec: estimateRemainingSec(totalSec, elapsedSec),
    totalSec,
  };
}

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
