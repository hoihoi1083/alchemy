"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/StepIndicator";
import { DoneStep } from "@/components/studio/DoneStep";
import { ImageStep } from "@/components/studio/ImageStep";
import { SetupStep } from "@/components/studio/SetupStep";
import { VideoStep } from "@/components/studio/VideoStep";
import { MicroWizard } from "@/components/studio/micro-wizard/MicroWizard";
import { WizardMobileBar } from "@/components/studio/WizardMobileBar";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { MongoRequiredBanner } from "@/components/MongoRequiredBanner";
import { SaveStatusBadge } from "@/components/studio/SaveStatusBadge";
import { WizardProvider, useWizard } from "@/components/studio/WizardContext";
import { useLocale } from "@/components/LocaleProvider";
import {
  isWizardV2Enabled,
  MICRO_RESUME_DONE_KEY,
  WIZARD_CLASSIC_VALUE,
  WIZARD_V2_QUERY_FLAG,
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
  const router = useRouter();
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
  } = useWizard();

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

  const goClassic = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(WIZARD_V2_QUERY_FLAG, WIZARD_CLASSIC_VALUE);
    params.delete("fresh");
    router.replace(`/studio?${params.toString()}`);
  };

  return (
    <div className="space-y-4 pb-4 md:space-y-6 md:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <SaveStatusBadge theme={theme} />
        {showMicroSetup ? (
          <button
            type="button"
            onClick={goClassic}
            className="text-xs font-medium text-violet-700 underline-offset-2 hover:underline sm:ml-auto"
          >
            {m.microWizard.classicLink}
          </button>
        ) : null}
        <div className="min-w-0 basis-full sm:basis-auto">
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

      <StudioAssistantWidget surface="studio" />
      <CoachSpotlightOverlay />

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

export function StudioWizard({ promotionMode, theme = "light" }: { promotionMode: PromotionMode; theme?: "light" | "dark" }) {
  return (
    <WizardProvider promotionMode={promotionMode}>
      <Suspense fallback={null}>
        <StudioWizardContent promotionMode={promotionMode} theme={theme} />
      </Suspense>
    </WizardProvider>
  );
}
