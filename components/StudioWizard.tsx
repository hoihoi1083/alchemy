"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/StepIndicator";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { DoneStep } from "@/components/studio/DoneStep";
import { ImageStep } from "@/components/studio/ImageStep";
import { SetupStep } from "@/components/studio/SetupStep";
import { VideoStep } from "@/components/studio/VideoStep";
import { MicroWizard } from "@/components/studio/micro-wizard/MicroWizard";
import { WizardMobileBar } from "@/components/studio/WizardMobileBar";
import { StoryboardEngineChoiceDialog } from "@/components/studio/StoryboardEngineChoiceDialog";
import { MongoRequiredBanner } from "@/components/MongoRequiredBanner";
import { SaveStatusBadge } from "@/components/studio/SaveStatusBadge";
import { WizardProvider, useWizard, useHydrateStatus, useHydrateError } from "@/components/studio/WizardContext";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import {
  isWizardV2Enabled,
  MICRO_RESUME_DONE_KEY,
} from "@/lib/wizard-micro-steps.types";
import type { PromotionMode } from "@/lib/promotion-mode";

function StudioWizardContent({
  promotionMode,
  theme = "light",
}: {
  promotionMode: PromotionMode;
  theme?: "light" | "dark";
}) {
  const searchParams = useSearchParams();
  const { m } = useLocale();
  const v2 = isWizardV2Enabled(searchParams);
  const {
    workflowMode,
    stepKey,
    setStepKey,
    videoUrl,
    isStoryboardOutput,
    isVideoWorkflow,
    continueSetupLabel,
    setupNextDisabled,
    setupNextDisabledReason,
    imageFinishLabel,
    imageNextDisabled,
    imageNextDisabledReason,
    videoGenerateDisabled,
    videoGenerateDisabledReason,
    videoBusy,
    goNextFromSetup,
    goBackFromImage,
    finishImageStep,
    goBackFromVideo,
    generateVideo,
    storyboardEngineChoice,
    confirmStoryboardKlingChoice,
    dismissStoryboardEngineChoice,
  } = useWizard();
  const hydrateStatus = useHydrateStatus();
  const hydrateError = useHydrateError();

  const showMicroSetup = v2 && stepKey === "setup";

  // Video finish used to set stepKey "done" and mount classic DoneStep (dark Step 4).
  // Pull back into MicroWizard so VideoResultPanel can show.
  useEffect(() => {
    if (!v2 || stepKey !== "done") return;
    if (!videoUrl && workflowMode !== "video-only") return;
    try {
      sessionStorage.setItem(MICRO_RESUME_DONE_KEY, "1");
    } catch {
      /* ignore */
    }
    setStepKey("setup");
  }, [v2, stepKey, videoUrl, workflowMode, setStepKey]);

  if (hydrateStatus === "pending") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400 border-t-transparent"
          aria-hidden
        />
        <p className="text-base font-semibold text-slate-800">{m.studio.loadingTitle}</p>
        <p className="max-w-sm text-sm text-slate-500">{m.studio.loadingHint}</p>
      </div>
    );
  }

  if (hydrateStatus === "error") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-base font-semibold text-slate-800">{m.studio.hydrateErrorTitle}</p>
        <p className="max-w-sm text-sm text-slate-500">
          {hydrateError === "timeout"
            ? m.studio.hydrateErrorTimeout
            : m.studio.hydrateErrorBody}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {m.studio.errorRetry}
          </button>
          <Link
            href="/library?tab=projects"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {m.studio.hydrateErrorLibrary}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 md:space-y-6 md:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <SaveStatusBadge theme={theme} />
        <div className="min-w-0 basis-full sm:basis-auto sm:ml-auto">
          <MongoRequiredBanner />
        </div>
      </div>

      {!showMicroSetup ? (
        <StepIndicator
          mode={workflowMode}
          currentKey={stepKey}
          storyboardKeyframes={workflowMode === "video-only" && isStoryboardOutput}
          theme={theme}
        />
      ) : null}

      {showMicroSetup ? <MicroWizard promotionMode={promotionMode} /> : null}

      {!showMicroSetup && stepKey === "setup" && <SetupStep />}
      {stepKey === "image" && <ImageStep />}
      {stepKey === "video" && isVideoWorkflow && <VideoStep />}
      {stepKey === "done" && !(v2 && (Boolean(videoUrl) || workflowMode === "video-only")) ? (
        <DoneStep />
      ) : null}

      {storyboardEngineChoice ? (
        <StoryboardEngineChoiceDialog
          choice={storyboardEngineChoice}
          onKling={confirmStoryboardKlingChoice}
          onDismiss={dismissStoryboardEngineChoice}
        />
      ) : null}

      {!showMicroSetup ? (
        <WizardMobileBar
          stepKey={stepKey}
          continueSetupLabel={continueSetupLabel}
          setupNextDisabled={setupNextDisabled}
          setupNextDisabledReason={setupNextDisabledReason}
          imageFinishLabel={imageFinishLabel}
          backLabel={m.wizard.back}
          generateVideoLabel={m.wizard.generateVideoBtn}
          phaseVideoLabel={m.wizard.phaseVideo}
          imageNextDisabled={imageNextDisabled}
          videoGenerateDisabled={videoGenerateDisabled}
          videoGenerateDisabledReason={videoGenerateDisabledReason}
          videoBusy={videoBusy}
          onSetupNext={goNextFromSetup}
          onImageBack={goBackFromImage}
          onImageNext={finishImageStep}
          onVideoBack={goBackFromVideo}
          onGenerateVideo={() => void generateVideo()}
        />
      ) : null}
    </div>
  );
}

function StudioWizardShell({
  promotionMode,
  theme = "light",
}: {
  promotionMode: PromotionMode;
  theme?: "light" | "dark";
}) {
  const searchParams = useSearchParams();
  const startFresh = searchParams.get("fresh") === "1";

  return (
    <WizardProvider promotionMode={promotionMode} startFresh={startFresh}>
      <StudioWizardContent promotionMode={promotionMode} theme={theme} />
      <CoachSpotlightOverlay />
      <StudioAssistantWidget surface="studio" />
    </WizardProvider>
  );
}

export function StudioWizard({ promotionMode, theme = "light" }: { promotionMode: PromotionMode; theme?: "light" | "dark" }) {
  return (
    <Suspense fallback={null}>
      <StudioWizardShell promotionMode={promotionMode} theme={theme} />
    </Suspense>
  );
}
