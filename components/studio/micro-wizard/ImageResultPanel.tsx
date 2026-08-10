"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { ImageReviewGallery } from "@/components/studio/ImageReviewGallery";
import { ImagePostflightPanel } from "@/components/studio/ImagePostflightPanel";
import { ImageGenerateWaitPanel } from "@/components/studio/ImageGenerateWaitPanel";

type Props = {
  generatingLabel: string;
  /** Show a secondary regenerate control (hidden when gallery banner is present). */
  allowRegenerate?: boolean;
};

export function ImageResultPanel({ generatingLabel, allowRegenerate = false }: Props) {
  const { m } = useLocale();
  const wizard = useWizard();

  if (wizard.imageBusy && wizard.carouselSlideRegenerateBusy == null) {
    return (
      <ImageGenerateWaitPanel
        message={wizard.imageProgressInfo?.label ?? generatingLabel}
        progress={wizard.imageProgressInfo}
        aspectRatio={wizard.imageAspectRatio}
        previewUrl={wizard.imageRefPreviewUrl || wizard.uploadPreviewUrl || null}
      />
    );
  }

  if (!wizard.imageUrl && wizard.storyboardScenes.length === 0) {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        <p>{wizard.error ?? generatingLabel}</p>
        <button
          type="button"
          disabled={wizard.imageBusy}
          onClick={() => void wizard.generateImage()}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {m.wizard.generateImageBtn}
        </button>
      </div>
    );
  }

  if (wizard.useOriginalImage) {
    return <p className="text-sm text-slate-600">{m.wizard.originalImageLabel}</p>;
  }

  return (
    <div className="space-y-4">
      <ImageReviewGallery />
      {wizard.imagePostflight ? (
        <ImagePostflightPanel
          variant="light"
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
          className="rounded-full border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 disabled:opacity-40"
        >
          {m.wizard.generateImageBtn}
        </button>
      ) : null}
    </div>
  );
}
