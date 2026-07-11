"use client";

import { useMemo } from "react";
import type { ImageJobMeta, VideoPhase } from "@/hooks/useWizardState";
import {
  estimateImageJobTotalSec,
  estimateVideoJobTotalSec,
  PROGRESS_ESTIMATES,
} from "@/lib/generation-progress-estimates";

export type ProgressInfo = {
  label?: string;
  pct: number;
  eta: string;
};

type WizardProgressLabels = {
  storyboardProgressPlanning: string;
  storyboardProgressRendering: string;
  campaignProgressPlanning: string;
  campaignProgressRendering: string;
  teachingCarouselProgressPlanning: string;
  teachingCarouselProgressRendering: string;
  campaignGenerating: string;
  imageGenerating: string;
  progressEta: string;
};

type UseWizardProgressArgs = {
  imageBusy: boolean;
  videoBusy: boolean;
  imageJobMeta: ImageJobMeta | null;
  videoJobStartedAt: number | null;
  progressNow: number;
  videoPhase: VideoPhase;
  usesCompositor: boolean;
  labels: WizardProgressLabels;
  formatEta: (sec: number) => string;
};

function phasedImageProgress(
  meta: ImageJobMeta,
  elapsedSec: number,
  planningSec: number,
  renderPerSceneSec: number,
  labels: { planning: string; rendering: string },
  sceneCount: number,
  formatEta: (sec: number) => string,
): ProgressInfo {
  const totalSec = planningSec + sceneCount * renderPerSceneSec;
  const etaSec = Math.max(2, totalSec - elapsedSec);
  if (elapsedSec <= planningSec) {
    const pct = Math.min(40, Math.round((elapsedSec / planningSec) * 40));
    return { label: labels.planning, pct, eta: formatEta(etaSec) };
  }
  const renderElapsed = elapsedSec - planningSec;
  const sceneDone = Math.min(
    sceneCount,
    Math.max(1, Math.floor(renderElapsed / renderPerSceneSec) + 1),
  );
  const pct = Math.min(95, 40 + Math.round((sceneDone / sceneCount) * 55));
  return {
    label: labels.rendering
      .replace("{current}", String(sceneDone))
      .replace("{total}", String(sceneCount)),
    pct,
    eta: formatEta(etaSec),
  };
}

export function useWizardProgress({
  imageBusy,
  videoBusy,
  imageJobMeta,
  videoJobStartedAt,
  progressNow,
  videoPhase,
  usesCompositor,
  labels,
  formatEta,
}: UseWizardProgressArgs) {
  const imageProgressInfo = useMemo((): ProgressInfo | null => {
    if (!imageBusy || !imageJobMeta) return null;
    const elapsedSec = Math.max(1, Math.floor((progressNow - imageJobMeta.startedAt) / 1000));

    if (imageJobMeta.kind === "storyboard" || imageJobMeta.kind === "cinematic-reel") {
      const planningSec =
        imageJobMeta.kind === "storyboard"
          ? PROGRESS_ESTIMATES.storyboardPlanSec
          : PROGRESS_ESTIMATES.cinematicReelPlanSec;
      const renderPerSceneSec =
        imageJobMeta.kind === "storyboard"
          ? PROGRESS_ESTIMATES.storyboardSceneSec
          : PROGRESS_ESTIMATES.cinematicReelSceneSec;
      return phasedImageProgress(
        imageJobMeta,
        elapsedSec,
        planningSec,
        renderPerSceneSec,
        {
          planning: labels.storyboardProgressPlanning,
          rendering: labels.storyboardProgressRendering,
        },
        imageJobMeta.sceneCount,
        formatEta,
      );
    }

    if (imageJobMeta.kind === "teaching-carousel") {
      return phasedImageProgress(
        imageJobMeta,
        elapsedSec,
        PROGRESS_ESTIMATES.teachingCarouselPlanSec,
        PROGRESS_ESTIMATES.teachingCarouselSlideSec,
        {
          planning: labels.teachingCarouselProgressPlanning,
          rendering: labels.teachingCarouselProgressRendering,
        },
        imageJobMeta.sceneCount,
        formatEta,
      );
    }

    if (imageJobMeta.kind === "campaign") {
      return phasedImageProgress(
        imageJobMeta,
        elapsedSec,
        PROGRESS_ESTIMATES.campaignPlanSec,
        PROGRESS_ESTIMATES.campaignSlideSec,
        {
          planning: labels.campaignProgressPlanning,
          rendering: labels.campaignProgressRendering,
        },
        imageJobMeta.sceneCount,
        formatEta,
      );
    }

    const totalSec = estimateImageJobTotalSec(imageJobMeta);
    const pct = Math.min(95, Math.round((elapsedSec / totalSec) * 100));
    return {
      label: labels.imageGenerating,
      pct,
      eta: formatEta(Math.max(2, totalSec - elapsedSec)),
    };
  }, [imageBusy, imageJobMeta, progressNow, labels, formatEta]);

  const videoProgressInfo = useMemo((): ProgressInfo | null => {
    if (!videoBusy || !videoJobStartedAt) return null;
    const elapsedSec = Math.max(1, Math.floor((progressNow - videoJobStartedAt) / 1000));
    const totalSec = estimateVideoJobTotalSec(videoPhase, usesCompositor);
    const pctBase = videoPhase === "second-frame" ? 15 : videoPhase === "bgm" ? 80 : 35;
    const pct = Math.min(97, Math.max(pctBase, Math.round((elapsedSec / totalSec) * 100)));
    return { pct, eta: formatEta(Math.max(2, totalSec - elapsedSec)) };
  }, [videoBusy, videoJobStartedAt, progressNow, usesCompositor, videoPhase, formatEta]);

  return { imageProgressInfo, videoProgressInfo };
}
