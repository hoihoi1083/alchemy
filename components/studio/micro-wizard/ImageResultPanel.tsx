"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { GeneratedImageResultsView } from "@/components/studio/GeneratedImageResultsView";
import { ImagePostflightPanel } from "@/components/studio/ImagePostflightPanel";
import { JobProgressBar } from "@/components/studio/JobProgressBar";
import { resolveGeneratedImageResultView } from "@/lib/generated-image-result-view";

type Props = {
  generatingLabel: string;
  /** Show a secondary regenerate control (hidden on image.review). */
  allowRegenerate?: boolean;
};

export function ImageResultPanel({ generatingLabel, allowRegenerate = false }: Props) {
  const { m } = useLocale();
  const wizard = useWizard();

  if (wizard.imageBusy) {
    return (
      <div className="space-y-3">
        {wizard.imageProgressInfo ? (
          <JobProgressBar
            info={wizard.imageProgressInfo}
            busyLabel={wizard.imageProgressInfo.label ?? generatingLabel}
          />
        ) : null}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          {generatingLabel}
        </div>
      </div>
    );
  }

  if (!wizard.imageUrl) {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        <p>{wizard.error ?? generatingLabel}</p>
        <button
          type="button"
          disabled={wizard.imageBusy}
          onClick={() => void wizard.generateImage()}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {m.wizard.generateImageBtn}
        </button>
      </div>
    );
  }

  if (wizard.useOriginalImage) {
    return <p className="text-sm text-slate-600">{m.wizard.originalImageLabel}</p>;
  }

  const view = resolveGeneratedImageResultView({
    imageUrl: wizard.imageUrl,
    useOriginalImage: wizard.useOriginalImage,
    imageVariantUrls: wizard.imageVariantUrls,
    campaignSlides: wizard.campaignSlides,
    storyboardScenes: wizard.storyboardScenes,
    cinematicScenes: wizard.cinematicScenes,
    effectiveImageOutputMode: wizard.effectiveImageOutputMode,
    isStoryboardOutput: wizard.isStoryboardOutput,
    isCinematicStitchOutput: wizard.isCinematicStitchOutput,
  });

  return (
    <div className="space-y-4">
      <GeneratedImageResultsView variant="light" />
      {wizard.imagePostflight ? (
        <ImagePostflightPanel
          postflight={wizard.imagePostflight}
          visionReview={wizard.imageVisionReview}
          busy={wizard.imagePostflightBusy}
          visionBusy={wizard.imageVisionReviewBusy}
          labels={{
            title: m.wizard.imagePostflightTitle,
            resolution: m.wizard.imagePostflightResolution,
            aspect: m.wizard.imagePostflightAspect,
            safeForVideo: m.wizard.imagePostflightSafeForVideo,
            notSafeForVideo: m.wizard.imagePostflightNotSafeForVideo,
            lowResolution: m.wizard.imagePostflightLowRes,
            verySmall: m.wizard.imagePostflightVerySmall,
            analyzing: m.wizard.imagePostflightAnalyzing,
            visionTitle: m.wizard.imageVisionReviewTitle,
            visionAnalyzing: m.wizard.imageVisionReviewAnalyzing,
            visionScore: m.wizard.imageVisionReviewScore,
            visionSummary: m.wizard.imageVisionReviewSummary,
            visionIssues: m.wizard.imageVisionReviewIssues,
            visionPass: m.wizard.imageVisionReviewPass,
          }}
        />
      ) : null}
      {allowRegenerate ? (
        <button
          type="button"
          disabled={wizard.imageBusy}
          onClick={() => void wizard.generateImage()}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          {m.wizard.generateImageBtn}
        </button>
      ) : view.kind !== "storyboard" && view.kind !== "cinematic" ? (
        <p className="text-center text-xs text-slate-500">
          {m.wizard.imageReviewRegenerateHint}{" "}
          <button
            type="button"
            disabled={wizard.imageBusy}
            onClick={() => void wizard.generateImage()}
            className="font-medium text-cyan-700 underline-offset-2 hover:underline disabled:opacity-40"
          >
            {m.wizard.imageReviewRegenerateLink}
          </button>
        </p>
      ) : null}
    </div>
  );
}
