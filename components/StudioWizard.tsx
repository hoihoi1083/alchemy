"use client";

import { StepIndicator } from "@/components/StepIndicator";
import { DoneStep } from "@/components/studio/DoneStep";
import { ImageStep } from "@/components/studio/ImageStep";
import { SetupStep } from "@/components/studio/SetupStep";
import { VideoStep } from "@/components/studio/VideoStep";
import { WizardMobileBar } from "@/components/studio/WizardMobileBar";
import { StudioAssistantWidget } from "@/components/assistant/StudioAssistantWidget";
import { CoachSpotlightOverlay } from "@/components/assistant/CoachSpotlightOverlay";
import { MongoRequiredBanner } from "@/components/MongoRequiredBanner";
import { WizardProvider, useWizard } from "@/components/studio/WizardContext";
import type { PromotionMode } from "@/lib/promotion-mode";

function StudioWizardContent({ theme = "light" }: { theme?: "light" | "dark" }) {
  const {
    workflowMode,
    stepKey,
    isStoryboardOutput,
    isVideoWorkflow,
    continueSetupLabel,
    setupNextDisabled,
    setupNextDisabledReason,
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
      <MongoRequiredBanner />
      <StepIndicator
        mode={workflowMode}
        currentKey={stepKey}
        storyboardKeyframes={workflowMode === "video-only" && isStoryboardOutput}
        theme={theme}
      />

      {stepKey === "setup" && <SetupStep />}
      {stepKey === "image" && <ImageStep />}
      {stepKey === "video" && isVideoWorkflow && <VideoStep />}
      {stepKey === "done" && <DoneStep />}

      <StudioAssistantWidget surface="studio" />
      <CoachSpotlightOverlay />

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
    </div>
  );
}

export function StudioWizard({ promotionMode, theme = "light" }: { promotionMode: PromotionMode; theme?: "light" | "dark" }) {
  return (
    <WizardProvider promotionMode={promotionMode}>
      <StudioWizardContent theme={theme} />
    </WizardProvider>
  );
}
