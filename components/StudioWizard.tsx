"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { isWizardV2Enabled } from "@/lib/wizard-micro-steps.types";
import type { PromotionMode } from "@/lib/promotion-mode";

function StudioWizardContent({
  promotionMode,
  theme = "light",
}: {
  promotionMode: PromotionMode;
  theme?: "light" | "dark";
}) {
  const searchParams = useSearchParams();
  const v2 = isWizardV2Enabled(searchParams);
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

  const showMicroSetup = v2 && stepKey === "setup";

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MongoRequiredBanner />
        <SaveStatusBadge theme={theme} />
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
      {stepKey === "done" && <DoneStep />}

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
