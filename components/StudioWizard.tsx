"use client";

import { StepIndicator } from "@/components/StepIndicator";
import { DoneStep } from "@/components/studio/DoneStep";
import { ImageStep } from "@/components/studio/ImageStep";
import { SetupStep } from "@/components/studio/SetupStep";
import { VideoStep } from "@/components/studio/VideoStep";
import { WizardMobileBar } from "@/components/studio/WizardMobileBar";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { WizardProvider, useWizard } from "@/components/studio/WizardContext";
import type { PromotionMode } from "@/lib/promotion-mode";

function StudioWizardContent() {
  const {
    workflowMode,
    stepKey,
    isImageWorkflow,
    isVideoWorkflow,
    continueSetupLabel,
    imageFinishLabel,
    m,
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

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <StepIndicator mode={workflowMode} currentKey={stepKey} />

      {stepKey === "setup" && <SetupStep />}
      {stepKey === "image" && isImageWorkflow && <ImageStep />}
      {stepKey === "video" && isVideoWorkflow && <VideoStep />}
      {stepKey === "done" && <DoneStep />}

      <StudioAssistantWidget surface="studio" />
      <CoachSpotlightOverlay />

      <WizardMobileBar
        stepKey={stepKey}
        continueSetupLabel={continueSetupLabel}
        imageFinishLabel={imageFinishLabel}
        backLabel={m.wizard.back}
        generateVideoLabel={m.wizard.generateVideoBtn}
        phaseVideoLabel={m.wizard.phaseVideo}
        imageNextDisabled={imageNextDisabled}
        videoGenerateDisabled={videoGenerateDisabled}
        videoBusy={videoBusy}
        onSetupNext={goNextFromSetup}
        onImageBack={goBackFromImage}
        onImageNext={finishImageStep}
        onVideoBack={goBackFromVideo}
        onGenerateVideo={() => void generateVideo()}
      />
    </div>
  );
}

export function StudioWizard({ promotionMode }: { promotionMode: PromotionMode }) {
  return (
    <WizardProvider promotionMode={promotionMode}>
      <StudioWizardContent />
    </WizardProvider>
  );
}
