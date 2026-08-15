"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { useWizardMicroStep } from "@/hooks/useWizardMicroStep";
import { MicroStepRenderer } from "@/components/studio/micro-wizard/MicroStepRenderer";
import { WizardErrorBanner } from "@/components/studio/WizardErrorBanner";
import { ImageReviewFooterBar } from "@/components/studio/ImageReviewGallery";
import { VideoReviewFooterBar } from "@/components/studio/VideoResultPanel";
import { referenceAnalyzeReady } from "@/components/studio/micro-wizard/ReferenceAnalyzeWaitPanel";
import { downloadMediaUrl, downloadMediaUrls } from "@/lib/download-media";
import type { PromotionMode } from "@/lib/promotion-mode";

type Props = {
  promotionMode: PromotionMode;
};

export function MicroWizard({ promotionMode }: Props) {
  const wizard = useWizard();
  const micro = useWizardMicroStep(wizard, promotionMode);
  const { m } = useLocale();
  const mw = m.microWizard;
  const router = useRouter();
  const [downloadAllBusy, setDownloadAllBusy] = useState(false);

  const {
    currentStep,
    currentId,
    blockReason,
    goNext,
    goBack,
    skipStep,
    isSkippable,
    canGoBack,
  } = micro;

  // URL updates use scroll:false — reset viewport when entering a new micro step.
  useEffect(() => {
    if (!currentId) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentId]);

  const isImageReviewStep = currentId === "image.review";
  const showReviewFooter =
    isImageReviewStep && !wizard.imageBusy && wizard.carouselSlideRegenerateBusy == null;
  const isCombinedSceneReview =
    isImageReviewStep && wizard.workflowMode === "combined" && wizard.isStoryboardOutput;
  const isImageWait =
    currentId === "wait.image_generate" || currentId === "wait.storyboard_generate";
  const isVideoWait = currentId === "wait.video_generate";
  const isVideoResult =
    currentId === "done.export" &&
    (Boolean(wizard.videoUrl) ||
      wizard.workflowMode === "video-only" ||
      wizard.workflowMode === "combined");
  const showVideoReviewFooter = isVideoResult && !wizard.videoBusy;
  /** Hide Back/Continue while the violet wait panel is showing (research + direct). */
  const showImageWaitOnly =
    isImageWait ||
    isVideoWait ||
    (isImageReviewStep &&
      wizard.imageBusy &&
      wizard.carouselSlideRegenerateBusy == null);

  const analyzeReady =
    (currentId === "wait.reference_analyze" || currentId === "wait.research_apply") &&
    referenceAnalyzeReady(wizard);

  const continueLabel =
    currentId === "shortcut.ship_it"
      ? m.wizard.shipItRunBtn
      : currentId === "video.generate" || currentId === "setup.pre_video"
        ? m.wizard.approveGenerateVideoBtn
        : currentId === "image.generate" || currentId === "setup.pre_generate"
          ? wizard.workflowMode === "combined"
            ? m.wizard.storyboardGenerateScenesBtn
            : m.wizard.generateImageBtn
          : mw.continue;

  const generateBlockedReason =
    currentId === "setup.pre_generate" || currentId === "image.generate"
      ? wizard.imageGenerateDisabledReason
      : currentId === "setup.pre_video" || currentId === "video.generate"
        ? wizard.videoGenerateDisabledReason
        : null;

  const blockMessage = blockReason
    ? (mw.blockReasons[blockReason as keyof typeof mw.blockReasons] ?? blockReason)
    : generateBlockedReason;

  const readyHint = analyzeReady ? mw.referenceAnalyzeTapContinue : null;

  const isCreationPath = currentId === "route.output_goal";
  const isPurpleChrome =
    isCreationPath ||
    currentId === "identity.product_name" ||
    currentId === "identity.concept_topic" ||
    currentId === "route.intake" ||
    currentId === "route.concept_source" ||
    currentId === "setup.pre_generate" ||
    currentId === "setup.pre_video" ||
    isImageReviewStep ||
    isImageWait ||
    isVideoWait ||
    isVideoResult;
  const hideLegacyProgress = isPurpleChrome;

  const onBack = () => {
    if (isCreationPath && !canGoBack) {
      router.push("/start");
      return;
    }
    goBack();
  };

  async function downloadAllReviewImages() {
    setDownloadAllBusy(true);
    try {
      const slides = wizard.listExportableSlides();
      if (slides.length === 0) return;
      await downloadMediaUrls(
        slides.map((s) => ({
          url: s.url,
          filename: slides.length === 1 ? "marketing-image.png" : `slide-${s.index + 1}.png`,
        })),
      );
    } catch (e) {
      wizard.setError(e instanceof Error ? e.message : m.imageCanvas.downloadFailed);
    } finally {
      setDownloadAllBusy(false);
    }
  }

  async function downloadReviewVideo() {
    if (!wizard.videoUrl) return;
    setDownloadAllBusy(true);
    try {
      await downloadMediaUrl(wizard.videoUrl, "marketing-reel.mp4");
    } catch (e) {
      wizard.setError(e instanceof Error ? e.message : m.errors.videoFailed);
    } finally {
      setDownloadAllBusy(false);
    }
  }

  function regenerateVideo() {
    if (wizard.videoGenerateDisabledReason) {
      wizard.setError(wizard.videoGenerateDisabledReason);
      return;
    }
    void wizard.generateVideo();
  }

  const secureFooter = (
    <p className="inline-flex items-center justify-center gap-1.5 text-center text-[12px] text-slate-500">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3.2 19 6.4v5.1c0 4.35-2.95 8.15-7 9.2-4.05-1.05-7-4.85-7-9.2V6.4L12 3.2Z" />
        <path d="m9.2 12 1.9 1.9 3.7-3.8" />
      </svg>
      <span>{m.start.secureNote}</span>
    </p>
  );

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      disabled={isCreationPath ? false : !canGoBack}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-40 ${
        isPurpleChrome
          ? "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
          : "border-slate-200 text-slate-700"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12.5 4.5 7 10l5.5 5.5" />
      </svg>
      {m.wizard.back}
    </button>
  );

  const continueButtons = (
    <div className="flex shrink-0 flex-wrap gap-2">
      {isSkippable ? (
        <button
          type="button"
          onClick={skipStep}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
        >
          {mw.skip}
        </button>
      ) : null}
      {currentId === "setup.pre_generate" ? null : (
        <button
          type="button"
          onClick={goNext}
          disabled={Boolean(blockReason) || Boolean(generateBlockedReason)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${
            analyzeReady
              ? "bg-violet-600 ring-4 ring-violet-300/50 animate-pulse hover:bg-violet-700"
              : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          {continueLabel}
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        </button>
      )}
    </div>
  );

  const reviewFooter = (
    <ImageReviewFooterBar
      onBack={onBack}
      onDownloadAll={() => void downloadAllReviewImages()}
      onGenerateOneMore={
        isCombinedSceneReview
          ? undefined
          : () => {
              if (!wizard.canGenerateImage()) {
                wizard.setError(
                  wizard.imageGenerateDisabledReason || m.wizard.imageGenerateNotReady,
                );
                return;
              }
              void wizard.generateImage();
            }
      }
      onContinue={isCombinedSceneReview ? goNext : undefined}
      continueLabel={isCombinedSceneReview ? mw.continue : undefined}
      continueDisabled={
        isCombinedSceneReview &&
        (Boolean(blockReason) || !wizard.storyboardGridApproved)
      }
      continueDisabledReason={
        isCombinedSceneReview
          ? blockMessage || m.wizard.storyboardApproveRequiredHint
          : null
      }
      downloadAllBusy={downloadAllBusy}
      generateBusy={wizard.imageBusy || !wizard.canGenerateImage()}
    />
  );

  const videoReviewFooter = (
    <VideoReviewFooterBar
      onBack={onBack}
      onDownload={() => void downloadReviewVideo()}
      onGenerateOneMore={regenerateVideo}
      downloadBusy={downloadAllBusy || !wizard.videoUrl}
      generateBusy={wizard.videoBusy || Boolean(wizard.videoGenerateDisabledReason)}
    />
  );

  const navButtons = (
    <>
      {backButton}
      {continueButtons}
    </>
  );

  return (
    <div
      className={`space-y-4 ${
        showReviewFooter || showVideoReviewFooter
          ? "pb-36 md:pb-0"
          : showImageWaitOnly
            ? "pb-4"
            : "pb-28 md:pb-0"
      }`}
    >
      {!hideLegacyProgress && currentStep ? (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {mw.progress
              .replace("{current}", String(currentStep.index))
              .replace("{total}", String(currentStep.estimatedTotal))}
          </span>
        </div>
      ) : null}

      {!hideLegacyProgress ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-500 transition-all"
            style={{
              width: currentStep
                ? `${(currentStep.index / Math.max(currentStep.estimatedTotal, 1)) * 100}%`
                : "0%",
            }}
          />
        </div>
      ) : null}

      {currentId ? <MicroStepRenderer micro={micro} stepId={currentId} /> : null}

      {wizard.error ? (
        <WizardErrorBanner
          message={wizard.error}
          variant="light"
          onDismiss={() => wizard.setError(null)}
        />
      ) : null}

      {readyHint ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-900">
          {readyHint}
        </p>
      ) : null}

      {blockMessage &&
      !showReviewFooter &&
      !showVideoReviewFooter &&
      currentId !== "setup.pre_generate" ? (
        <p
          className={`rounded-xl border px-3 py-2.5 text-sm ${
            isPurpleChrome
              ? "border-violet-200 bg-violet-50 text-violet-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {blockMessage}
        </p>
      ) : null}

      {showReviewFooter ? (
        <div className="hidden md:block">{reviewFooter}</div>
      ) : showVideoReviewFooter ? (
        <div className="hidden md:block">{videoReviewFooter}</div>
      ) : showImageWaitOnly ? null : (
        <div
          className={`relative hidden items-center md:flex ${
            isPurpleChrome ? "justify-between" : "flex-wrap justify-between gap-3"
          }`}
        >
          {backButton}
          {isPurpleChrome ? (
            <div className="pointer-events-none absolute inset-x-0 flex justify-center px-28">
              <div className="pointer-events-auto max-w-full">{secureFooter}</div>
            </div>
          ) : null}
          {continueButtons}
        </div>
      )}

      {showReviewFooter ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mx-auto max-w-7xl">{reviewFooter}</div>
        </div>
      ) : showVideoReviewFooter ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mx-auto max-w-7xl">{videoReviewFooter}</div>
        </div>
      ) : showImageWaitOnly ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3">
            {navButtons}
          </div>
        </div>
      )}

      {!isPurpleChrome ? (
        <p className="hidden text-center text-[11px] text-slate-400 md:block">
          {mw.footerHint}
        </p>
      ) : null}
    </div>
  );
}
