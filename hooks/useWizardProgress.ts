"use client";

import { useMemo } from "react";
import type { ImageJobMeta, VideoPhase } from "@/hooks/useWizardState";

export type ProgressInfo = {
  label?: string;
  pct: number;
  eta: string;
};

type WizardProgressLabels = {
  storyboardProgressPlanning: string;
  storyboardProgressRendering: string;
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
      const planningSec = 14;
      const renderPerSceneSec = 8;
      const totalSec = planningSec + imageJobMeta.sceneCount * renderPerSceneSec;
      const etaSec = Math.max(2, totalSec - elapsedSec);
      if (elapsedSec <= planningSec) {
        const pct = Math.min(45, Math.round((elapsedSec / planningSec) * 45));
        return { label: labels.storyboardProgressPlanning, pct, eta: formatEta(etaSec) };
      }
      const renderElapsed = elapsedSec - planningSec;
      const sceneDone = Math.min(
        imageJobMeta.sceneCount,
        Math.max(1, Math.floor(renderElapsed / renderPerSceneSec) + 1),
      );
      const pct = Math.min(95, 45 + Math.round((sceneDone / imageJobMeta.sceneCount) * 50));
      return {
        label: labels.storyboardProgressRendering
          .replace("{current}", String(sceneDone))
          .replace("{total}", String(imageJobMeta.sceneCount)),
        pct,
        eta: formatEta(etaSec),
      };
    }
    const totalSec = imageJobMeta.kind === "campaign" ? 45 : 22;
    const pct = Math.min(95, Math.round((elapsedSec / totalSec) * 100));
    return {
      label:
        imageJobMeta.kind === "campaign"
          ? labels.campaignGenerating
          : labels.imageGenerating,
      pct,
      eta: formatEta(Math.max(2, totalSec - elapsedSec)),
    };
  }, [imageBusy, imageJobMeta, progressNow, labels, formatEta]);

  const videoProgressInfo = useMemo((): ProgressInfo | null => {
    if (!videoBusy || !videoJobStartedAt) return null;
    const elapsedSec = Math.max(1, Math.floor((progressNow - videoJobStartedAt) / 1000));
    const totalSec = usesCompositor
      ? 35
      : videoPhase === "bgm"
        ? 55
        : videoPhase === "second-frame"
          ? 65
          : 50;
    const pctBase = videoPhase === "second-frame" ? 15 : videoPhase === "bgm" ? 80 : 35;
    const pct = Math.min(97, Math.max(pctBase, Math.round((elapsedSec / totalSec) * 100)));
    return { pct, eta: formatEta(Math.max(2, totalSec - elapsedSec)) };
  }, [videoBusy, videoJobStartedAt, progressNow, usesCompositor, videoPhase, formatEta]);

  return { imageProgressInfo, videoProgressInfo };
}
