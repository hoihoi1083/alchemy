"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { WorkflowModePicker } from "@/components/WorkflowModePicker";
import { ImageOutputModePicker } from "@/components/ImageOutputModePicker";
import { ArtStylePicker } from "@/components/ArtStylePicker";
import { ImageAspectRatioPicker } from "@/components/ImageAspectRatioPicker";
import { ImageTextModePicker } from "@/components/studio/ImageTextModePicker";
import { UploadZone } from "@/components/UploadZone";
import { ReferenceUploadZone } from "@/components/ReferenceUploadZone";
import { VideoSettingsPanel } from "@/components/VideoSettingsPanel";
import { ContentResearchPanel } from "@/components/content-research/ContentResearchPanel";
import { CINEMATIC_SCENE_COUNTS, type CinematicSceneCount } from "@/lib/cinematic-scene-config";
import type { PromotionMode } from "@/lib/promotion-mode";
import { VideoCreativeModePicker } from "@/components/VideoCreativeModePicker";
import type { WorkflowMode } from "@/lib/workflow-mode";
import type { ConceptSource } from "@/lib/concept-source-state";
import type { IntakePath, MicroStepId } from "@/lib/wizard-micro-steps.types";
import type { WizardMicroStepValue } from "@/hooks/useWizardMicroStep";
import { ShipItPanel } from "@/components/studio/ShipItPanel";
import { ConceptWizardPanel } from "@/components/studio/ConceptWizardPanel";
import { ConceptPreGeneratePanel } from "@/components/studio/ConceptPreGeneratePanel";
import { JobProgressBar } from "@/components/studio/JobProgressBar";
import { ImageResultPanel } from "@/components/studio/micro-wizard/ImageResultPanel";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import { PrimaryPathsPanel } from "@/components/studio/PrimaryPathsPanel";
import { SetupCopyEditPanel } from "@/components/studio/SetupCopyEditPanel";
import { PresenterAvatarPicker } from "@/components/studio/PresenterAvatarPicker";
import { AdPackReviewPanel } from "@/components/studio/AdPackReviewPanel";
import { ReferenceAnalyzeWaitPanel, referenceAnalyzeReady } from "@/components/studio/micro-wizard/ReferenceAnalyzeWaitPanel";
import { ResearchReelSetupPanel } from "@/components/studio/ResearchReelSetupPanel";
import { BrandWebsitePanel } from "@/components/studio/BrandWebsitePanel";
import { useState } from "react";

type Props = {
  micro: WizardMicroStepValue;
  stepId: MicroStepId;
};

export function MicroStepRenderer({ micro, stepId }: Props) {
  const wizard = useWizard();
  const { m } = useLocale();
  const mw = m.microWizard;

  switch (stepId) {
    case "route.output_goal":
      return (
        <ScreenShell title={mw.outputGoalTitle} hint={mw.outputGoalHint}>
          <WorkflowModePicker
            value={micro.ctx.workflowMode ?? null}
            onChange={(mode: WorkflowMode) => {
              micro.patchContext({ workflowMode: mode });
              wizard.onWorkflowModeChange(mode);
            }}
          />
          {micro.ctx.workflowMode && micro.ctx.workflowMode !== "image-only" ? (
            <VideoOutputSourceCard variant="setup" />
          ) : null}
        </ScreenShell>
      );

    case "route.subject":
      return (
        <ScreenShell title={m.start.title} hint={m.start.subtitle}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              active={micro.ctx.promotionMode === "physical"}
              title={m.start.physicalTitle}
              description={m.start.physicalDesc}
              onClick={() => micro.setSubjectMode("physical" as PromotionMode)}
            />
            <ChoiceCard
              active={micro.ctx.promotionMode === "concept"}
              title={m.start.conceptTitle}
              description={m.start.conceptDesc}
              onClick={() => micro.setSubjectMode("concept" as PromotionMode)}
            />
          </div>
        </ScreenShell>
      );

    case "route.cinematic_mode":
      return (
        <ScreenShell title={mw.cinematicModeTitle} hint={mw.cinematicModeHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              active={wizard.visualStyleId === "concept-cinematic" && !wizard.cinematicStitchReel}
              title={m.wizard.conceptCinematicSingleTitle}
              description={m.wizard.conceptCinematicSingleDesc}
              onClick={() => {
                wizard.applyPrimaryPathConceptVideo("cinematic");
                micro.patchContext({ workflowMode: "combined" });
              }}
            />
            <ChoiceCard
              active={wizard.visualStyleId === "concept-cinematic" && wizard.cinematicStitchReel}
              title={m.wizard.conceptCinematicStitchTitle}
              description={m.wizard.conceptCinematicStitchDesc}
              onClick={() => {
                wizard.applyCinematicStitchRecipe();
                micro.patchContext({ workflowMode: "combined" });
              }}
            />
          </div>
        </ScreenShell>
      );

    case "cinematic.scene_count":
      return (
        <ScreenShell title={mw.sceneCountTitle} hint={mw.sceneCountHint}>
          <div className="flex flex-wrap gap-2">
            {CINEMATIC_SCENE_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => wizard.onCinematicSceneCountChange(n as CinematicSceneCount)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  wizard.cinematicSceneCount === n
                    ? "border-violet-400 bg-violet-50 text-violet-900"
                    : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                {n} × 8s = {n * 8}s
              </button>
            ))}
          </div>
          <PrimaryPathsPanel variant="concept-image" showCinematicExtras />
        </ScreenShell>
      );

    case "route.primary_style":
      return (
        <ScreenShell title={mw.primaryStyleTitle} hint={mw.primaryStyleHint}>
          <PrimaryPathsPanel
            variant={
              wizard.promotionMode === "concept" ? "concept-image" : "physical-image"
            }
          />
        </ScreenShell>
      );

    case "route.combined_style":
      return (
        <ScreenShell title={mw.combinedStyleTitle} hint={mw.combinedStyleHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              active={micro.ctx.combinedStyle === "cinematic"}
              title={m.wizard.conceptCinematicStitchTitle}
              description={m.wizard.conceptCinematicStitchDesc}
              onClick={() => {
                micro.setCombinedStyle("cinematic");
                wizard.applyCinematicStitchRecipe();
              }}
            />
            <ChoiceCard
              active={micro.ctx.combinedStyle === "animate"}
              title={mw.combinedAnimateTitle}
              description={mw.combinedAnimateDesc}
              onClick={() => {
                micro.setCombinedStyle("animate");
                wizard.selectVisualStyle("storyboard-video");
              }}
            />
          </div>
        </ScreenShell>
      );

    case "route.video_subpath":
      return (
        <ScreenShell title={mw.videoSubpathTitle} hint={mw.videoSubpathHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            {wizard.promotionMode === "concept" ? (
              <>
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "creative_video"}
                  title={m.wizard.visualStyles["creative-video"].title}
                  description={m.wizard.visualStyles["creative-video"].description}
                  onClick={() => {
                    micro.setVideoSubpath("creative_video");
                    wizard.applyPrimaryPathConceptVideo("creative");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "brand_video"}
                  title={m.wizard.visualStyles["brand-video"].title}
                  description={m.wizard.visualStyles["brand-video"].description}
                  onClick={() => {
                    micro.setVideoSubpath("brand_video");
                    wizard.applyPrimaryPathConceptVideo("brand");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "reference_reel"}
                  title={m.wizard.pathReferenceTitle}
                  description={m.wizard.pathReferenceDesc}
                  onClick={() => {
                    micro.setVideoSubpath("reference_reel");
                    wizard.onVideoCreativeModeChange("reference-concept");
                  }}
                />
              </>
            ) : (
              <>
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "product_promo"}
                  title={m.wizard.pathQuickTitle}
                  description={m.wizard.pathQuickVideoDesc}
                  onClick={() => {
                    micro.setVideoSubpath("product_promo");
                    wizard.applyPrimaryPathVideoOnly("creative");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "reference_reel"}
                  title={m.wizard.pathReferenceVideoTitle}
                  description={m.wizard.pathReferenceVideoDesc}
                  onClick={() => {
                    micro.setVideoSubpath("reference_reel");
                    wizard.onVideoCreativeModeChange("reference-concept");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "ugc_presenter"}
                  title={m.wizard.pathUgcPresenterTitle}
                  description={m.wizard.pathUgcPresenterDesc}
                  onClick={() => {
                    micro.setVideoSubpath("ugc_presenter");
                    micro.patchContext({ videoSubpath: "ugc_presenter" });
                    wizard.applyPrimaryPathVideoOnly("ugc-presenter");
                  }}
                />
              </>
            )}
          </div>
        </ScreenShell>
      );

    case "route.concept_source":
      return (
        <ScreenShell title={mw.conceptSourceTitle} hint={mw.conceptSourceHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              active={(micro.pendingConceptSource ?? micro.ctx.conceptSource) === "assistant"}
              title={mw.conceptSourceAssistantTitle}
              description={mw.conceptSourceAssistantDesc}
              onClick={() => micro.setConceptSource("assistant" as ConceptSource)}
            />
            <ChoiceCard
              active={(micro.pendingConceptSource ?? micro.ctx.conceptSource) === "research"}
              title={mw.conceptSourceResearchTitle}
              description={mw.conceptSourceResearchDesc}
              onClick={() => micro.setConceptSource("research" as ConceptSource)}
            />
          </div>
        </ScreenShell>
      );

    case "route.intake":
      return (
        <ScreenShell title={mw.intakeTitle} hint={mw.intakeHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              active={(micro.pendingIntakePath ?? micro.ctx.intakePath) === "research"}
              title={mw.intakeResearchTitle}
              description={mw.intakeResearchDesc}
              onClick={() => micro.setIntakePath("research" as IntakePath)}
            />
            <ChoiceCard
              active={(micro.pendingIntakePath ?? micro.ctx.intakePath) === "direct"}
              title={mw.intakeDirectTitle}
              description={mw.intakeDirectDesc}
              onClick={() => micro.setIntakePath("direct" as IntakePath)}
            />
          </div>
        </ScreenShell>
      );

    case "identity.product_name":
      return (
        <ScreenShell title={mw.productNameTitle} hint={mw.productNameHint}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{m.wizard.productLabel}</span>
            <input
              data-coach-id="coach-product"
              value={wizard.product}
              onChange={(e) => wizard.setProduct(e.target.value)}
              placeholder={m.wizard.productPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
        </ScreenShell>
      );

    case "identity.concept":
      return (
        <ScreenShell title={mw.conceptTitle} hint={mw.conceptHint}>
          <ConceptWizardPanel showHeadlineField />
        </ScreenShell>
      );

    case "identity.concept_topic":
      return (
        <ScreenShell title={mw.conceptTopicTitle} hint={mw.conceptTopicHint}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{mw.conceptTopicLabel}</span>
            <input
              value={wizard.conceptIdea}
              onChange={(e) => wizard.setConceptIdea(e.target.value)}
              placeholder={mw.conceptTopicPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
        </ScreenShell>
      );

    case "research.platform":
      return (
        <ContentResearchStep
          wizard={wizard}
          m={m}
          mw={mw}
          workflowMode={micro.ctx.workflowMode ?? wizard.workflowMode}
        />
      );

    case "research.pick_angle":
      return (
        <ContentResearchStep
          wizard={wizard}
          m={m}
          mw={mw}
          pickAngle
          workflowMode={micro.ctx.workflowMode ?? wizard.workflowMode}
        />
      );

    case "wait.reference_analyze":
    case "wait.research_apply":
      return (
        <ScreenShell
          title={m.wizard.referenceBriefTitle}
          hint={
            referenceAnalyzeReady(wizard)
              ? mw.referenceAnalyzeReadyHint
              : m.wizard.referenceBriefAnalyzingWait
          }
        >
          <ReferenceAnalyzeWaitPanel />
        </ScreenShell>
      );

    case "wait.concept_plan":
      return (
        <WaitScreen
          busy={wizard.referenceAnalyzeBusy}
          message={m.wizard.referenceBriefAnalyzingWait}
        />
      );

    case "asset.reference_image":
      return (
        <ScreenShell title={mw.refImageTitle} hint={mw.refImageHint}>
          <ReferenceUploadZone
            label={m.wizard.referenceLabel}
            hint={m.wizard.uploadHintConcept}
            cta={m.wizard.referenceCta}
            changeLabel={m.wizard.referenceChange}
            previewUrl={wizard.imageRefPreviewUrl}
            isVideo={false}
            fileName={wizard.imageRefPhoto?.name ?? null}
            onFile={(file) => {
              wizard.setImageRefPhoto(file);
              if (file) wizard.setImageCreativeMode("reference-concept");
            }}
          />
        </ScreenShell>
      );

    case "copy.edit":
      return (
        <ScreenShell title={mw.copyEditTitle} hint={mw.copyEditHint}>
          <SetupCopyEditPanel />
        </ScreenShell>
      );

    case "copy.creative_brief":
      return (
        <ScreenShell title={m.wizard.creativeBriefLabel} hint={m.wizard.creativeVideoIntro}>
          <textarea
            value={wizard.creativeVideoBrief}
            onChange={(e) => wizard.setCreativeVideoBrief(e.target.value)}
            placeholder={m.wizard.creativeBriefPlaceholder}
            rows={8}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </ScreenShell>
      );

    case "copy.image_prompt":
      return (
        <ScreenShell title={mw.imagePromptTitle} hint={mw.imagePromptHint}>
          <textarea
            value={wizard.imagePrompt}
            onChange={(e) => wizard.setImagePrompt(e.target.value)}
            placeholder={m.wizard.imagePromptLabel}
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </ScreenShell>
      );

    case "image.output_format":
      return (
        <ScreenShell
          title={
            wizard.workflowMode === "combined"
              ? m.wizard.imageKeyframeModeLabel
              : m.wizard.imageOutputModeLabel
          }
          hint={
            wizard.workflowMode === "combined"
              ? m.wizard.imageKeyframeModeHint
              : m.wizard.imageOutputModeHint
          }
        >
          <ImageOutputModePicker
            value={wizard.imageOutputMode}
            onChange={wizard.setImageOutputMode}
            lockedCampaign={wizard.lockedCampaignMode}
            forVideoKeyframe={wizard.workflowMode === "combined"}
            includeTeachingCarousel={wizard.workflowMode === "image-only"}
          />
        </ScreenShell>
      );

    case "image.art_style":
      return (
        <ScreenShell title={m.wizard.artStyleLabel} hint={m.wizard.artStyleHint}>
          <ArtStylePicker value={wizard.artStyleId} onChange={wizard.setArtStyleId} />
        </ScreenShell>
      );

    case "asset.product_photo":
      return (
        <ScreenShell title={m.wizard.uploadLabel} hint={m.wizard.uploadHint}>
          <UploadZone
            label={m.wizard.uploadLabel}
            hint={m.wizard.uploadHint}
            cta={m.wizard.uploadCta}
            changeLabel={m.wizard.uploadChange}
            previewUrl={wizard.uploadPreviewUrl}
            fileName={wizard.productPhoto?.name ?? null}
            onFile={wizard.onProductPhotoSelected}
          />
        </ScreenShell>
      );

    case "image.options":
      return (
        <ScreenShell title={mw.imageOptionsTitle} hint={mw.imageOptionsHint}>
          <ArtStylePicker value={wizard.artStyleId} onChange={wizard.setArtStyleId} />
          <ImageAspectRatioPicker value={wizard.imageAspectRatio} onChange={wizard.setImageAspectRatio} />
          <ImageTextModePicker value={wizard.imageTextMode} onChange={wizard.setImageTextMode} />
        </ScreenShell>
      );

    case "video.mode":
      return (
        <ScreenShell title={mw.videoModeTitle} hint={mw.videoModeHint}>
          <VideoCreativeModePicker
            goal={wizard.workflowMode === "combined" ? "combined" : "video-only"}
            promotionMode={wizard.promotionMode}
            value={wizard.videoCreativeMode}
            onChange={wizard.onVideoCreativeModeChange}
          />
        </ScreenShell>
      );

    case "video.settings":
      return (
        <ScreenShell title={mw.videoSettingsTitle} hint={mw.videoSettingsHint}>
          <VideoSettingsPanel
            compact
            setup
            hideAutoDuration={
              wizard.isContentResearchVideoPath ||
              wizard.videoCreativeMode === "reference-concept" ||
              Boolean(wizard.referenceAd && wizard.referenceIsVideo)
            }
            value={wizard.videoSettings}
            onChange={wizard.setVideoSettings}
          />
          <p className="mt-2 text-xs text-emerald-900/80">{m.wizard.videoSetupOutputSettingsHint}</p>
          {(wizard.isContentResearchVideoPath ||
            wizard.videoCreativeMode === "reference-concept" ||
            Boolean(wizard.referenceAd && wizard.referenceIsVideo)) &&
          wizard.videoSettings.duration === "auto" ? (
            <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-950">
              {m.wizard.researchReelPickDurationFirst}
            </p>
          ) : null}
          {wizard.isContentResearchVideoPath ? <ResearchReelSetupPanel /> : null}
        </ScreenShell>
      );

    case "asset.reference_video":
      return (
        <ReferenceVideoStep wizard={wizard} m={m} mw={mw} />
      );

    case "asset.brand_website":
      return (
        <ScreenShell title={m.wizard.brandFitTitle}>
          <BrandWebsitePanel />
        </ScreenShell>
      );

    case "asset.extra_kit":
      return (
        <ScreenShell title={mw.extraKitTitle} hint={mw.extraKitHint}>
          <UploadZone
            label={m.wizard.uploadLabel}
            hint={m.wizard.uploadHint}
            cta={m.wizard.uploadCta}
            changeLabel={m.wizard.uploadChange}
            previewUrl={wizard.packagingPreviewUrl}
            fileName={wizard.packagingPhoto?.name ?? null}
            onFile={(file) => wizard.setPackagingPhoto(file)}
          />
        </ScreenShell>
      );

    case "copy.storyboard_brief":
      return (
        <ScreenShell title={m.wizard.storyboardBriefLabel} hint={m.wizard.storyboardIntro}>
          <textarea
            value={wizard.storyboardBrief}
            onChange={(e) => wizard.setStoryboardBrief(e.target.value)}
            placeholder={m.wizard.storyboardBriefPlaceholder}
            rows={5}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </ScreenShell>
      );

    case "video.product_plan":
      return (
        <ScreenShell title={m.wizard.videoCreativeModes["product-assistant"].title} hint={m.wizard.videoAssistantStepHint}>
          <button
            type="button"
            disabled={wizard.planProductVideoBusy}
            onClick={() => void wizard.planProductVideo()}
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {wizard.planProductVideoBusy ? m.wizard.planProductVideoBusy : m.wizard.planProductVideoBtn}
          </button>
          {wizard.productVideoPlan ? (
            <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              {wizard.videoPrompt}
            </pre>
          ) : null}
        </ScreenShell>
      );

    case "video.ai_prompt":
      return (
        <ScreenShell title={m.wizard.visualStyles["creative-video"].title} hint={m.wizard.creativeVideoIntro}>
          <button
            type="button"
            disabled={wizard.planVideoPromptBusy}
            onClick={() => void wizard.planAiVideoPrompt()}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {wizard.planVideoPromptBusy ? m.wizard.planVideoPromptBusy : m.wizard.planVideoPromptBtn}
          </button>
          {wizard.videoPrompt ? (
            <textarea
              value={wizard.videoPrompt}
              onChange={(e) => wizard.setVideoPrompt(e.target.value)}
              rows={6}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          ) : null}
        </ScreenShell>
      );

    case "video.ugc_pack":
      return (
        <ScreenShell title={m.wizard.pathUgcPresenterTitle} hint={m.wizard.ugcPresenter.setupIntro}>
          <p className="text-sm text-slate-600">{m.wizard.ugcPresenter.needAdPackHint}</p>
          <div className="space-y-4 rounded-2xl bg-slate-950 p-3">
            <PresenterAvatarPicker
              mode={wizard.presenterSourceMode}
              avatarId={wizard.presenterAvatarId}
              disabled={wizard.videoBusy}
              onModeChange={wizard.setPresenterSourceMode}
              onAvatarChange={wizard.setPresenterAvatarId}
            />
            <AdPackReviewPanel />
          </div>
          <p className="text-xs text-slate-500">{m.wizard.ugcPresenter.videoStepIntro}</p>
        </ScreenShell>
      );

    case "video.bgm":
      return (
        <ScreenShell title={mw.bgmTitle} hint={mw.bgmHint}>
          <div className="flex flex-wrap gap-2">
            {wizard.bgmOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => wizard.setBgmTrack(opt.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  wizard.bgmTrack === opt.id
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </ScreenShell>
      );

    case "shortcut.ship_it":
      return (
        <ScreenShell title={m.wizard.shipItModeOn} hint={m.wizard.shipItRunHint}>
          <ShipItPanel
            shipItMode={wizard.shipItMode}
            onShipItModeChange={wizard.setShipItMode}
            eligible={wizard.shipItEligible && !wizard.shipItVisionBlocked}
            busy={wizard.shipItPipelineBusy}
            onRun={() => void wizard.runShipItPipeline()}
            showRunButton={wizard.workflowMode === "combined"}
            labels={{
              modeOn: m.wizard.shipItModeOn,
              modeOff: m.wizard.shipItModeOff,
              modeHint: m.wizard.shipItModeHint,
              showExpert: m.wizard.shipItShowExpert,
              runBtn: m.wizard.shipItRunBtn,
              running: m.wizard.shipItRunning,
              unsupported: m.wizard.shipItUnsupported,
              runHint: m.wizard.shipItRunHint,
            }}
          />
        </ScreenShell>
      );

    case "image.generate":
      if (wizard.isStoryboardOutput || wizard.cinematicStitchReel) {
        return (
          <ScreenShell title={mw.legacyImageTitle} hint={mw.legacyImageHint}>
            <ConceptPreGeneratePanel />
          </ScreenShell>
        );
      }
      if (wizard.isUgcPresenterOutput) {
        return (
          <ScreenShell
            title={m.wizard.pathUgcPresenterTitle}
            hint={m.wizard.ugcPresenter.imageStepIntro}
          >
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {m.wizard.ugcPresenter.imagePreflight}
            </p>
            {wizard.headline.trim() || wizard.subline.trim() ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                {wizard.headline.trim() ? (
                  <p>
                    <span className="font-medium text-slate-700">{m.wizard.headlineLabel}:</span>{" "}
                    {wizard.headline.trim()}
                  </p>
                ) : null}
                {wizard.subline.trim() ? (
                  <p className="mt-1">
                    <span className="font-medium text-slate-700">{m.wizard.sublineLabel}:</span>{" "}
                    {wizard.subline.trim()}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="text-sm text-slate-600">{mw.generateImageFooterHint}</p>
          </ScreenShell>
        );
      }
      return (
        <ScreenShell title={mw.generateImageTitle} hint={mw.generateImageFooterHint}>
          {!wizard.isStoryboardOutput && !wizard.cinematicStitchReel ? (
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-4">
              <ImageOutputModePicker
                value={wizard.imageOutputMode}
                onChange={wizard.setImageOutputMode}
                lockedCampaign={wizard.lockedCampaignMode}
                forVideoKeyframe={wizard.workflowMode === "combined"}
                includeTeachingCarousel={wizard.workflowMode === "image-only"}
              />
            </div>
          ) : null}
          {wizard.headline.trim() || wizard.subline.trim() ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {wizard.headline.trim() ? (
                <p>
                  <span className="font-medium text-slate-700">{m.wizard.headlineLabel}:</span>{" "}
                  {wizard.headline.trim()}
                </p>
              ) : null}
              {wizard.subline.trim() ? (
                <p className="mt-1">
                  <span className="font-medium text-slate-700">{m.wizard.sublineLabel}:</span>{" "}
                  {wizard.subline.trim()}
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="text-sm text-slate-600">{mw.generateImageFooterHint}</p>
        </ScreenShell>
      );

    case "image.review":
      return (
        <ScreenShell title={mw.imageReviewTitle} hint={mw.imageReviewHint}>
          <ImageResultPanel generatingLabel={mw.generatingImage} />
        </ScreenShell>
      );

    case "image.storyboard_scenes":
      return (
        <ScreenShell title={mw.legacyImageTitle} hint={mw.legacyImageHint}>
          <p className="text-sm text-slate-600">{mw.legacyImageHint}</p>
        </ScreenShell>
      );

    case "video.generate":
      return (
        <ScreenShell title={mw.generateVideoTitle} hint={mw.generateVideoHint}>
          {wizard.videoGenerateDisabledReason ? (
            <p className="text-sm text-amber-800">{wizard.videoGenerateDisabledReason}</p>
          ) : (
            <p className="text-sm text-slate-600">{mw.generateVideoFooterHint}</p>
          )}
        </ScreenShell>
      );

    case "wait.reel_download":
    case "wait.reel_analyze":
      return (
        <>
          <ResearchReelSetupPanel />
          <WaitScreen
            busy={wizard.researchReelAnalyzeBusy || wizard.referenceClipLoading}
            message={
              wizard.referenceClipLoading
                ? mw.reelDownloading
                : wizard.researchReelAnalyzeBusy
                  ? m.wizard.researchReelAnalyzing
                  : (wizard.researchReelAnalyzeNote ?? mw.analyzing)
            }
          />
        </>
      );

    case "wait.brand_analyze":
      return (
        <WaitScreen
          busy={wizard.brandAnalyzeBusy}
          message={wizard.brandAnalyzeBusy ? m.wizard.brandAnalyzeBusy : m.wizard.brandAnalyzeBtn}
        />
      );

    case "wait.storyboard_generate":
      return (
        <WaitScreen
          busy={wizard.imageBusy}
          message={wizard.imageProgressInfo?.label ?? mw.generatingImage}
          progress={wizard.imageProgressInfo}
        />
      );

    case "done.export":
      return (
        <ScreenShell title={mw.doneTitle} hint={mw.doneHint}>
          {wizard.imageUrl && !wizard.useOriginalImage ? (
            <ImageResultPanel generatingLabel={mw.generatingImage} />
          ) : (
            <p className="text-sm text-slate-600">{mw.doneHint}</p>
          )}
        </ScreenShell>
      );

    case "wait.image_generate":
      return (
        <WaitScreen
          busy={wizard.imageBusy}
          message={wizard.imageProgressInfo?.label ?? mw.generatingImage}
          progress={wizard.imageProgressInfo}
        />
      );

    case "wait.video_generate": {
      const phaseMessage =
        wizard.videoPhase === "second-frame"
          ? m.wizard.phaseSecondFrame
          : wizard.videoPhase === "bgm"
            ? m.wizard.phaseBgm
            : wizard.videoPhase === "voiceover"
              ? m.wizard.phaseVoiceover
              : wizard.videoPhase === "captions"
                ? m.wizard.phaseCaptions
                : m.wizard.phaseVideo;
      return (
        <WaitScreen
          busy={wizard.videoBusy}
          message={wizard.videoBusy ? phaseMessage : mw.generatingVideo}
          progress={wizard.videoProgressInfo}
        />
      );
    }

    default:
      return (
        <ScreenShell title={mw.fallbackTitle} hint={mw.fallbackHint}>
          <p className="text-sm text-slate-600">{stepId}</p>
        </ScreenShell>
      );
  }
}

function ScreenShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-cyan-100/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="h-1 w-full rounded-full bg-linear-to-r from-cyan-400 via-indigo-400 to-emerald-400 opacity-80" />
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {hint ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ChoiceCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </button>
  );
}

function ContentResearchStep({
  wizard,
  m,
  mw,
  pickAngle = false,
  workflowMode,
}: {
  wizard: ReturnType<typeof useWizard>;
  m: ReturnType<typeof useLocale>["m"];
  mw: ReturnType<typeof useLocale>["m"]["microWizard"];
  pickAngle?: boolean;
  workflowMode: ReturnType<typeof useWizard>["workflowMode"];
}) {
  const [contentResearchNote, setContentResearchNote] = useState<string | null>(null);
  const isConcept = wizard.promotionMode === "concept";
  const defaultResearchTopic = isConcept
    ? wizard.conceptIdea.trim() || wizard.business.trim() || ""
    : wizard.business.trim() || wizard.product.trim();
  const researchPromoteTarget = isConcept
    ? wizard.conceptIdea.trim() || wizard.effectivePromoteName
    : wizard.product;

  return (
    <ScreenShell
      title={pickAngle ? mw.pickAngleTitle : m.wizard.contentResearchSectionTitle}
      hint={pickAngle ? mw.pickAngleHint : m.wizard.contentResearchSectionHint}
    >
      <ContentResearchPanel
        defaultTopic={defaultResearchTopic}
        promoteProduct={researchPromoteTarget}
        onPromoteProductChange={isConcept ? wizard.setConceptIdea : wizard.setProduct}
        syncTopicFromProduct={false}
        promotionMode={wizard.promotionMode}
        market={wizard.promptMarket}
        workflowMode={workflowMode}
        wizard={{
          setHeadline: wizard.setHeadline,
          setSubline: wizard.setSubline,
          setOffer: wizard.setOffer,
          setConceptIdea: wizard.setConceptIdea,
          setProduct: wizard.setProduct,
          setPromptExtra: wizard.setPromptExtra,
          setImageOutputMode: wizard.setImageOutputMode,
          setImageAspectRatio: wizard.setImageAspectRatio,
          setCampaignTheme: wizard.setCampaignTheme,
          selectVisualStyle: wizard.selectVisualStyle,
          onWorkflowModeChange: wizard.onWorkflowModeChange,
          setImageRefPhoto: wizard.setImageRefPhoto,
          setImageCreativeMode: wizard.setImageCreativeMode,
          onImageInputModeChange: wizard.onImageInputModeChange,
          setExtraKitPhotos: wizard.setExtraKitPhotos,
          setReferenceCarouselSlideCount: wizard.setReferenceCarouselSlideCount,
          setContentResearchApplyRef: wizard.setContentResearchApplyRef,
          setCinematicSceneCount: wizard.onCinematicSceneCountChange,
          onVideoCreativeModeChange: wizard.onVideoCreativeModeChange,
          onReferenceAdFile: wizard.onReferenceAdFile,
          setError: wizard.setError,
        }}
        onApplied={(_angle, _plan, result) => {
          setContentResearchNote(result?.message ?? m.studioAssistant.actionApplied);
          if (result?.refs.videoAttached) {
            wizard.setError(null);
          }
        }}
      />
      {contentResearchNote ? (
        <p className="text-xs text-emerald-800">{contentResearchNote}</p>
      ) : null}
    </ScreenShell>
  );
}

function ReferenceVideoStep({
  wizard,
  m,
  mw,
}: {
  wizard: ReturnType<typeof useWizard>;
  m: ReturnType<typeof useLocale>["m"];
  mw: ReturnType<typeof useLocale>["m"]["microWizard"];
}) {
  const outputDurationExplicit = wizard.videoSettings.duration !== "auto";

  function handleReferenceVideo(file: File | null) {
    if (file) {
      wizard.onVideoCreativeModeChange("reference-concept");
      wizard.onImageCreativeModeChange("reference-concept");
      if (wizard.promotionMode === "concept") wizard.onImageInputModeChange("reference");
    }
    wizard.onReferenceAdFile(file);
  }

  if (wizard.isContentResearchVideoPath) {
    return (
      <ScreenShell title={mw.refVideoTitle} hint={mw.refVideoHint}>
        <ResearchReelSetupPanel onReferenceVideo={handleReferenceVideo} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={mw.refVideoTitle} hint={mw.refVideoHint}>
      <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-950">
        <div>
          <p className="font-semibold text-emerald-900">{m.wizard.setupReferenceVideoTitle}</p>
          <p className="mt-1 leading-relaxed text-emerald-800">{m.wizard.setupReferenceVideoIntro}</p>
        </div>
        <ReferenceUploadZone
          label={m.wizard.referenceLabel}
          hint={m.wizard.setupReferenceVideoHint}
          cta={m.wizard.referenceCta}
          changeLabel={m.wizard.referenceChange}
          previewUrl={wizard.referencePreviewUrl}
          isVideo={wizard.referenceIsVideo}
          fileName={wizard.referenceAd?.name ?? null}
          onFile={handleReferenceVideo}
        />
        {wizard.referencePreviewUrl && wizard.referenceIsVideo ? (
          <video
            src={wizard.referencePreviewUrl}
            className="max-h-48 w-full rounded-lg border border-emerald-200 object-contain"
            muted
            playsInline
            controls
          />
        ) : null}
        {wizard.referenceAd && wizard.referenceIsVideo && (wizard.researchReelAnalyzeBusy || wizard.researchReelAnalyzeNote) ? (
          <p className="rounded-lg bg-purple-950/10 px-3 py-2 text-purple-900">
            {wizard.researchReelAnalyzeBusy ? m.wizard.researchReelAnalyzing : wizard.researchReelAnalyzeNote}
          </p>
        ) : wizard.referenceAd && wizard.referenceIsVideo && !wizard.effectivePromoteName ? (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-amber-950">
            {m.wizard.setupReferenceVideoWaitingCopy}
          </p>
        ) : wizard.referenceAd && wizard.referenceIsVideo && !outputDurationExplicit ? (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-amber-950">
            {m.wizard.researchReelPickDurationFirst}
          </p>
        ) : null}
        {!wizard.referenceAd || !wizard.referenceIsVideo ? (
          <p className="text-emerald-800/90">{m.wizard.setupReferenceVideoSkipNote}</p>
        ) : !wizard.isStoryboardOutput ? (
          <p className="text-emerald-800/90">{m.wizard.setupReferenceVideoNonStoryboardHint}</p>
        ) : null}
      </div>
    </ScreenShell>
  );
}

function WaitScreen({
  busy,
  message,
  progress,
}: {
  busy: boolean;
  message: string;
  progress?: { label?: string; pct?: number; eta?: string } | null;
}) {
  return (
    <ScreenShell title={message} hint={busy ? undefined : message}>
      {progress ? <JobProgressBar info={progress as Parameters<typeof JobProgressBar>[0]["info"]} busyLabel={message} /> : null}
      {busy ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          {message}
        </div>
      ) : null}
    </ScreenShell>
  );
}
