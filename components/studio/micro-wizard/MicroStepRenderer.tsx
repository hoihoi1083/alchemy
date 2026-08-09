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
import {
  GenerationWaitPlaceholder,
  waitAspectFromString,
} from "@/components/studio/GenerationWaitPlaceholder";
import { ImageGenerateWaitPanel } from "@/components/studio/ImageGenerateWaitPanel";
import { ImageResultPanel } from "@/components/studio/micro-wizard/ImageResultPanel";
import { VideoOutputSourceCard } from "@/components/studio/VideoOutputSourceCard";
import { ProductNameStep } from "@/components/studio/ProductNameStep";
import { IntakeFuseStep, intakeTabFromPending } from "@/components/studio/IntakeFuseStep";
import { PreGenerateSetupPanel } from "@/components/studio/PreGenerateSetupPanel";
import { PreVideoSetupPanel } from "@/components/studio/PreVideoSetupPanel";
import { VideoResultPanel } from "@/components/studio/VideoResultPanel";
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
        <div className="space-y-4">
          <WorkflowModePicker
            value={micro.ctx.workflowMode ?? null}
            onChange={(mode: WorkflowMode) => {
              micro.patchContext({ workflowMode: mode });
              wizard.onWorkflowModeChange(mode);
            }}
            showPhaseStepper
          />
          {micro.ctx.workflowMode && micro.ctx.workflowMode !== "image-only" ? (
            <VideoOutputSourceCard variant="setup" />
          ) : null}
        </div>
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
      // Product truth: single 8s cinematic only — multi-scene stitch deferred.
      return (
        <ScreenShell title={mw.cinematicModeTitle} hint={mw.cinematicModeHint}>
          <div className="grid gap-2 sm:grid-cols-1">
            <ChoiceCard
              active={wizard.visualStyleId === "concept-cinematic"}
              title={m.wizard.conceptCinematicSingleTitle}
              description={m.wizard.conceptCinematicSingleDesc}
              onClick={() => {
                wizard.setCinematicStitchReel(false);
                wizard.onCinematicSceneCountChange(1);
                wizard.applyPrimaryPathConceptVideo("cinematic");
                micro.patchContext({ workflowMode: "combined", combinedStyle: "cinematic" });
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
      // Product truth: 圖+片 = 分鏡 storyboard only (not single-poster / Ship-it).
      return (
        <ScreenShell title={mw.combinedStyleTitle} hint={mw.combinedStyleHint}>
          <div className="grid gap-2 sm:grid-cols-1">
            <ChoiceCard
              active={
                micro.ctx.combinedStyle === "storyboard" ||
                (micro.ctx.combinedStyle as string | undefined) === "animate" ||
                wizard.visualStyleId === "storyboard-video"
              }
              title={mw.combinedAnimateTitle}
              description={mw.combinedAnimateDesc}
              onClick={() => {
                micro.setCombinedStyle("storyboard");
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
                  title={m.wizard.pathReferenceVideoTitle}
                  description={m.wizard.pathReferenceVideoDesc}
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
                    wizard.applyPrimaryPathVideoOnly("assistant");
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
              </>
            )}
          </div>
        </ScreenShell>
      );

    case "route.concept_source":
      // Legacy: concept source is chosen on fused route.intake tabs.
      return (
        <IntakeFuseStep
          isConcept
          workflowMode={micro.ctx.workflowMode ?? wizard.workflowMode}
          activeTab={intakeTabFromPending({
            isConcept: true,
            pendingIntakePath: micro.pendingIntakePath,
            intakePath: micro.ctx.intakePath,
            pendingConceptSource: micro.pendingConceptSource,
            conceptSource: micro.ctx.conceptSource,
          })}
          onSelectResearch={() => {
            micro.setConceptSource("research" as ConceptSource);
            micro.setIntakePath("research" as IntakePath);
          }}
          onSelectDirect={() => {
            micro.setConceptSource("assistant" as ConceptSource);
            micro.setIntakePath("direct" as IntakePath);
          }}
        />
      );

    case "route.intake": {
      const isConcept = wizard.promotionMode === "concept";
      return (
        <IntakeFuseStep
          isConcept={isConcept}
          workflowMode={micro.ctx.workflowMode ?? wizard.workflowMode}
          activeTab={intakeTabFromPending({
            isConcept,
            pendingIntakePath: micro.pendingIntakePath,
            intakePath: micro.ctx.intakePath,
            pendingConceptSource: micro.pendingConceptSource,
            conceptSource: micro.ctx.conceptSource,
          })}
          onSelectResearch={() => {
            if (isConcept) {
              micro.setConceptSource("research" as ConceptSource);
            }
            micro.setIntakePath("research" as IntakePath);
          }}
          onSelectDirect={() => {
            if (isConcept) {
              micro.setConceptSource("assistant" as ConceptSource);
            }
            micro.setIntakePath("direct" as IntakePath);
          }}
        />
      );
    }

    case "identity.product_name":
      return (
        <ProductNameStep
          value={wizard.product}
          onChange={(next) => wizard.setProduct(next)}
          showPhaseStepper
        />
      );

    case "identity.concept":
      return (
        <ScreenShell title={mw.conceptTitle} hint={mw.conceptHint}>
          <ConceptWizardPanel showHeadlineField />
        </ScreenShell>
      );

    case "identity.concept_topic":
      return (
        <ProductNameStep
          variant="concept"
          value={wizard.conceptIdea}
          onChange={(next) => wizard.setConceptIdea(next)}
          showPhaseStepper
        />
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
          busy={wizard.conceptPlanBusy}
          message={m.wizard.conceptAnalyzeBusy}
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

    case "setup.pre_generate":
      return (
        <PreGenerateSetupPanel
          showStylePicker={
            micro.ctx.intakePath === "direct" && micro.ctx.workflowMode !== "combined"
          }
          showReferenceUpload={micro.ctx.intakePath === "direct"}
          combinedStoryboard={micro.ctx.workflowMode === "combined"}
          onGenerate={micro.goNext}
          generateDisabled={
            Boolean(micro.blockReason) ||
            Boolean(wizard.imageGenerateDisabledReason) ||
            (micro.ctx.workflowMode === "combined" &&
              wizard.isStoryboardOutput &&
              !wizard.storyboardPlan) ||
            wizard.planStoryboardBusy
          }
          generateLabel={
            micro.ctx.workflowMode === "combined"
              ? m.wizard.storyboardGenerateScenesBtn
              : m.wizard.generateImageBtn
          }
          generateBlockMessage={
            micro.blockReason
              ? (mw.blockReasons[micro.blockReason as keyof typeof mw.blockReasons] ??
                micro.blockReason)
              : wizard.imageGenerateDisabledReason
                ? wizard.imageGenerateDisabledReason
                : micro.ctx.workflowMode === "combined" &&
                    wizard.isStoryboardOutput &&
                    !wizard.storyboardPlan
                  ? m.wizard.storyboardPlanReviewHint
                  : null
          }
        />
      );

    case "setup.pre_video": {
      const scenesReady =
        micro.ctx.workflowMode === "combined" &&
        wizard.videoCreativeMode !== "motion-poster";
      return (
        <PreVideoSetupPanel
          scenesReady={scenesReady}
          onGenerate={micro.goNext}
          generateDisabled={
            Boolean(micro.blockReason) || Boolean(wizard.videoGenerateDisabledReason)
          }
          generateLabel={m.wizard.approveGenerateVideoBtn}
          generateBlockMessage={
            micro.blockReason
              ? (mw.blockReasons[micro.blockReason as keyof typeof mw.blockReasons] ??
                micro.blockReason)
              : wizard.videoGenerateDisabledReason
          }
          videoSubpath={
            (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "ugc_presenter"
              ? "product_promo"
              : wizard.videoCreativeMode === "motion-poster"
                ? "motion_poster"
                : (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath)
          }
          onPickVideoSubpath={(subpath) => {
            const id = subpath as
              | "product_promo"
              | "motion_poster"
              | "reference_reel"
              | "creative_video"
              | "brand_video";
            // UGC deferred — never enter ugc_presenter from fused wizard.
            micro.setVideoSubpath(id);
            micro.patchContext({ videoSubpath: id });
            if (id === "product_promo") {
              wizard.applyPrimaryPathVideoOnly("assistant");
            } else if (id === "motion_poster") {
              wizard.onVideoCreativeModeChange("motion-poster");
            } else if (id === "reference_reel") {
              wizard.onVideoCreativeModeChange("reference-concept");
            } else if (id === "creative_video") {
              wizard.applyPrimaryPathConceptVideo("creative");
            } else if (id === "brand_video") {
              wizard.applyPrimaryPathConceptVideo("brand");
            }
          }}
        />
      );
    }

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
          {wizard.imageOutputMode === "teaching-carousel" ? (
            <label className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="font-medium">{m.wizard.teachingCarouselSlideCountLabel}</span>
              <select
                value={wizard.referenceCarouselSlideCount}
                onChange={(e) => wizard.setReferenceCarouselSlideCount(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                {[4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {m.wizard.teachingCarouselSlideCountOption.replace("{count}", String(n))}
                  </option>
                ))}
              </select>
              <span className="w-full text-xs text-slate-500">
                {m.wizard.teachingCarouselSlideCountHint}
              </span>
            </label>
          ) : null}
        </ScreenShell>
      );

    case "image.art_style":
      return (
        <ScreenShell
          title={m.wizard.artStyleLabel}
          hint={
            wizard.workflowMode !== "image-only"
              ? m.wizard.artStyleVideoSafeHint
              : m.wizard.artStyleHint
          }
        >
          <ArtStylePicker
            value={wizard.artStyleId}
            onChange={wizard.setArtStyleId}
            videoSafeOnly={wizard.workflowMode !== "image-only"}
          />
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
          <ArtStylePicker
            value={wizard.artStyleId}
            onChange={wizard.setArtStyleId}
            videoSafeOnly={wizard.workflowMode !== "image-only"}
          />
          <ImageAspectRatioPicker
            value={wizard.imageAspectRatio}
            onChange={wizard.setImageAspectRatio}
            variant="light"
            accent="violet"
          />
          <ImageTextModePicker
            value={wizard.imageTextMode}
            onChange={wizard.setImageTextMode}
            variant="violet"
          />
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
      // Image research / combined storyboard: this step auto-skips when no MP4.
      return (
        <ReferenceVideoStep wizard={wizard} m={m} mw={mw} optional />
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
                    ? "border-violet-400 bg-violet-50 text-emerald-900"
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
      // Product truth: Ship-it / single-poster I2V is out of scope for 圖+片 分鏡.
      return (
        <ScreenShell title={m.wizard.shipItUnsupported} hint={mw.combinedStyleHint}>
          <p className="text-sm text-slate-600">{m.wizard.shipItUnsupported}</p>
          <p className="mt-2 text-sm text-slate-500">{mw.combinedAnimateDesc}</p>
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
      // Wait + review both use violet chrome (ImageGenerateWaitPanel / ImageReviewGallery).
      return <ImageResultPanel generatingLabel={mw.generatingImage} />;

    case "image.storyboard_scenes":
      return <ImageResultPanel generatingLabel={mw.generatingImage} />;

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
    case "wait.reel_analyze": {
      const needDuration =
        wizard.referenceIsVideo && wizard.videoSettings.duration === "auto";
      const downloading = wizard.referenceClipLoading;
      const analyzing = wizard.researchReelAnalyzeBusy;
      return (
        <ScreenShell
          title={
            downloading
              ? mw.reelDownloading
              : needDuration
                ? m.wizard.researchReelPickDurationFirst
                : m.wizard.researchReelAnalyzing
          }
          hint={
            needDuration
              ? m.wizard.researchReelSetupIntro
              : m.wizard.researchReelAnalyzeFirstHint
          }
        >
          {wizard.referencePreviewUrl && wizard.referenceIsVideo ? (
            <video
              src={wizard.referencePreviewUrl}
              className="mx-auto max-h-28 w-full max-w-[14rem] rounded-lg border border-violet-200 bg-black object-contain"
              muted
              playsInline
              controls
            />
          ) : null}
          {needDuration ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3">
              <VideoSettingsPanel
                compact
                setup
                hideAutoDuration
                value={wizard.videoSettings}
                onChange={wizard.setVideoSettings}
              />
            </div>
          ) : null}
          <WaitScreen
            busy={downloading || analyzing}
            message={
              downloading
                ? mw.reelDownloading
                : analyzing
                  ? m.wizard.researchReelAnalyzing
                  : (wizard.researchReelAnalyzeNote ?? mw.analyzing)
            }
          />
          {!downloading && !analyzing && wizard.researchReelAnalyzeNote ? (
            <p className="text-xs text-emerald-800">{wizard.researchReelAnalyzeNote}</p>
          ) : null}
        </ScreenShell>
      );
    }

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
          title={mw.generateImageTitle}
          message={wizard.imageProgressInfo?.label ?? mw.generatingImage}
          progress={wizard.imageProgressInfo}
          aspectRatio={wizard.imageAspectRatio}
          previewUrl={wizard.imageRefPreviewUrl || wizard.uploadPreviewUrl || null}
          purpleChrome
        />
      );

    case "done.export":
      if (
        wizard.videoUrl ||
        wizard.workflowMode === "video-only" ||
        wizard.workflowMode === "combined"
      ) {
        return (
          <VideoResultPanel
            onRegenerate={() => {
              void wizard.generateVideo();
            }}
          />
        );
      }
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
          title={mw.generateImageTitle}
          message={wizard.imageProgressInfo?.label ?? mw.generatingImage}
          progress={wizard.imageProgressInfo}
          aspectRatio={wizard.imageAspectRatio}
          previewUrl={wizard.imageRefPreviewUrl || wizard.uploadPreviewUrl || null}
          purpleChrome
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
          title={mw.generateVideoTitle}
          message={wizard.videoBusy ? phaseMessage : mw.generatingVideo}
          progress={wizard.videoProgressInfo}
          aspectRatio="9:16"
          previewUrl={
            wizard.keyframePreview ||
            wizard.imageUrl ||
            wizard.uploadPreviewUrl ||
            wizard.referencePreviewUrl ||
            null
          }
          purpleChrome
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
      <div className="h-1 w-full rounded-full bg-linear-to-r from-violet-400 via-violet-500 to-violet-600 opacity-80" />
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
        active ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
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
  optional = false,
}: {
  wizard: ReturnType<typeof useWizard>;
  m: ReturnType<typeof useLocale>["m"];
  mw: ReturnType<typeof useLocale>["m"]["microWizard"];
  optional?: boolean;
}) {
  const outputDurationExplicit = wizard.videoSettings.duration !== "auto";
  const title = optional ? mw.refVideoTitleOptional : mw.refVideoTitle;
  const hint = optional ? mw.refVideoHintOptional : mw.refVideoHint;

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
      <ScreenShell title={title} hint={hint}>
        <ResearchReelSetupPanel onReferenceVideo={handleReferenceVideo} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={title} hint={hint}>
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
  title,
  progress,
  aspectRatio,
  previewUrl,
  purpleChrome = false,
}: {
  busy: boolean;
  message: string;
  /** Outer step title — matches other ScreenShell steps. Defaults to message. */
  title?: string;
  progress?: { label?: string; pct?: number; eta?: string } | null;
  aspectRatio?: string;
  previewUrl?: string | null;
  /** Use violet step chrome (image generate waits). */
  purpleChrome?: boolean;
}) {
  const { m } = useLocale();
  const shellTitle = title ?? message;
  const progressInfo =
    progress && typeof progress.pct === "number"
      ? {
          label: progress.label,
          pct: progress.pct,
          eta: progress.eta ?? "",
        }
      : null;

  // Same wait UI for research + direct — never fall back to cyan ScreenShell.
  if (purpleChrome) {
    return (
      <ImageGenerateWaitPanel
        message={message}
        title={title}
        progress={progressInfo}
        aspectRatio={aspectRatio}
        previewUrl={previewUrl}
      />
    );
  }

  if (!busy) {
    return (
      <ScreenShell title={shellTitle} hint={message}>
        <p className="text-sm text-slate-600">{message}</p>
      </ScreenShell>
    );
  }
  return (
    <ScreenShell title={shellTitle} hint={m.wizard.generationWaitHint}>
      <GenerationWaitPlaceholder
        message={message}
        progress={progressInfo}
        aspectRatio={waitAspectFromString(aspectRatio)}
        previewUrl={previewUrl}
        compact
      />
    </ScreenShell>
  );
}
