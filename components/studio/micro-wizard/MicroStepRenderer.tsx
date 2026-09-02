"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { WorkflowModePicker } from "@/components/WorkflowModePicker";
import { ImageOutputModePicker } from "@/components/ImageOutputModePicker";
import { ImageResolutionPanel } from "@/components/ImageResolutionPanel";
import { ArtStylePicker } from "@/components/ArtStylePicker";
import { CompositionPresetPicker } from "@/components/studio/CompositionPresetPicker";
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
import { wantsResearchVideoReference } from "@/lib/content-research-infer";
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
import { applyIntakeVideoStyle } from "@/lib/apply-intake-video-style";
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
import { useEffect, useState } from "react";
import { isStoryboardVideoStyle, getVisualStyle, isExplosionUnboxStyle } from "@/lib/visual-styles";
import { researchReelAnalyzeProgress } from "@/lib/generation-progress-estimates";
import {
  h3ShotRecipeToSubpath,
  isH3ShotRecipeMode,
  subpathToH3ShotRecipe,
} from "@/lib/h3-shot-recipes";
import { h3ShotModesForPromotion } from "@/lib/recipe-path-ux";
import { isRecipeOwnedVideoMode, videoModePreviewSrc } from "@/lib/creative-workflow";

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
                  active={
                    (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "creative_video" ||
                    ((micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) !== "motion_poster" &&
                      (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) !== "blockbuster" &&
                      !subpathToH3ShotRecipe(
                        (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) as never,
                      ))
                  }
                  title={m.wizard.sceneReelTitle}
                  description={m.wizard.sceneReelDesc}
                  previewSrc={getVisualStyle("creative-video").previewSrc}
                  onClick={() => {
                    micro.setVideoSubpath("creative_video");
                    wizard.applyPrimaryPathConceptVideo("creative");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "motion_poster"}
                  title={m.wizard.videoCreativeModes["motion-poster"].title}
                  description={m.wizard.videoCreativeModes["motion-poster"].description}
                  previewSrc={videoModePreviewSrc("motion-poster")}
                  onClick={() => {
                    micro.setVideoSubpath("motion_poster");
                    wizard.onVideoCreativeModeChange("motion-poster");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "blockbuster"}
                  title={m.wizard.videoCreativeModes.blockbuster.title}
                  description={m.wizard.videoCreativeModes.blockbuster.description}
                  previewSrc={videoModePreviewSrc("blockbuster")}
                  onClick={() => {
                    micro.setVideoSubpath("blockbuster");
                    wizard.onVideoCreativeModeChange("blockbuster");
                  }}
                />
                {h3ShotModesForPromotion("concept").map((mode) => {
                    const sub = h3ShotRecipeToSubpath(mode);
                    return (
                      <ChoiceCard
                        key={mode}
                        active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === sub}
                        title={m.wizard.videoCreativeModes[mode].title}
                        description={m.wizard.videoCreativeModes[mode].description}
                        previewSrc={videoModePreviewSrc(mode)}
                        onClick={() => {
                          micro.setVideoSubpath(sub);
                          wizard.onVideoCreativeModeChange(mode);
                        }}
                      />
                    );
                  })}
              </>
            ) : (
              <>
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "product_promo"}
                  title={m.wizard.pathQuickTitle}
                  description={m.wizard.pathQuickVideoDesc}
                  previewSrc={videoModePreviewSrc("product-promo")}
                  onClick={() => {
                    micro.setVideoSubpath("product_promo");
                    wizard.applyPrimaryPathVideoOnly("assistant");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "motion_poster"}
                  title={m.wizard.videoCreativeModes["motion-poster"].title}
                  description={m.wizard.videoCreativeModes["motion-poster"].description}
                  previewSrc={videoModePreviewSrc("motion-poster")}
                  onClick={() => {
                    micro.setVideoSubpath("motion_poster");
                    wizard.onVideoCreativeModeChange("motion-poster");
                  }}
                />
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "blockbuster"}
                  title={m.wizard.videoCreativeModes.blockbuster.title}
                  description={m.wizard.videoCreativeModes.blockbuster.description}
                  previewSrc={videoModePreviewSrc("blockbuster")}
                  onClick={() => {
                    micro.setVideoSubpath("blockbuster");
                    wizard.onVideoCreativeModeChange("blockbuster");
                  }}
                />
                {h3ShotModesForPromotion("physical").map((mode) => {
                  const sub = h3ShotRecipeToSubpath(mode);
                  return (
                    <ChoiceCard
                      key={mode}
                      active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === sub}
                      title={m.wizard.videoCreativeModes[mode].title}
                      description={m.wizard.videoCreativeModes[mode].description}
                      previewSrc={videoModePreviewSrc(mode)}
                      onClick={() => {
                        micro.setVideoSubpath(sub);
                        wizard.onVideoCreativeModeChange(mode);
                      }}
                    />
                  );
                })}
                <ChoiceCard
                  active={(micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "reference_reel"}
                  title={m.wizard.pathReferenceVideoTitle}
                  description={m.wizard.pathReferenceVideoDesc}
                  previewSrc={videoModePreviewSrc("reference-concept")}
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
            micro.patchContext({ intakeTemplateMode: undefined });
          }}
          onSelectDirect={() => {
            micro.setConceptSource("assistant" as ConceptSource);
            micro.setIntakePath("direct" as IntakePath);
          }}
          onLeaveResearchPath={() => {
            const defaultSub =
              wizard.promotionMode === "concept" ? "creative_video" : "product_promo";
            micro.setVideoSubpath(defaultSub as never);
            micro.patchContext({ videoSubpath: defaultSub as never });
          }}
          onTemplateModeChange={(mode) => {
            micro.patchContext({
              intakeTemplateMode: mode ?? undefined,
            });
          }}
          selectedTemplateMode={micro.ctx.intakeTemplateMode ?? null}
          selectedVideoSubpath={
            (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) ?? null
          }
          onSelectVideoStyle={(subpath) => {
            applyIntakeVideoStyle(subpath, {
              isConcept: true,
              wizard,
              setVideoSubpath: (sub) => {
                micro.setVideoSubpath(sub);
                micro.patchContext({ videoSubpath: sub });
              },
            });
          }}
          onSelectStoryboardRecipe={(recipeId) => {
            wizard.setStoryboardRecipeId(recipeId);
            wizard.applyPrimaryPath("storyboard");
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
            micro.patchContext({ intakeTemplateMode: undefined });
          }}
          onSelectDirect={() => {
            if (isConcept) {
              micro.setConceptSource("assistant" as ConceptSource);
            }
            micro.setIntakePath("direct" as IntakePath);
          }}
          onLeaveResearchPath={() => {
            if (
              micro.ctx.workflowMode === "video-only" ||
              micro.ctx.workflowMode === "combined" ||
              wizard.workflowMode === "video-only" ||
              wizard.workflowMode === "combined"
            ) {
              const defaultSub = isConcept ? "creative_video" : "product_promo";
              micro.setVideoSubpath(defaultSub as never);
              micro.patchContext({ videoSubpath: defaultSub as never });
            }
          }}
          onTemplateModeChange={(mode) => {
            micro.patchContext({
              intakeTemplateMode: mode ?? undefined,
            });
          }}
          selectedTemplateMode={micro.ctx.intakeTemplateMode ?? null}
          selectedVideoSubpath={
            (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) ?? null
          }
          onSelectVideoStyle={(subpath) => {
            applyIntakeVideoStyle(subpath, {
              isConcept,
              wizard,
              setVideoSubpath: (sub) => {
                micro.setVideoSubpath(sub);
                micro.patchContext({ videoSubpath: sub });
              },
            });
          }}
          onSelectStoryboardRecipe={(recipeId) => {
            wizard.setStoryboardRecipeId(recipeId);
            wizard.applyPrimaryPath("storyboard");
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
            // Research locks layout from the selected card — don't offer a competing
            // "creation direction" that overrides it. Template already chose a style
            // on Step 4. Blank Direct still needs a direction here.
            micro.ctx.intakePath === "direct" &&
            micro.ctx.intakeTemplateMode === "direct" &&
            micro.ctx.workflowMode !== "combined"
          }
          showReferenceUpload={
            // Template already chose the look on Step 4 — optional style-ref is noise.
            // Combined storyboard recipes also lock the look — hide ref there too.
            // Blank Direct (non-storyboard) still offers a reference ad upload here.
            micro.ctx.intakePath === "direct" &&
            micro.ctx.intakeTemplateMode !== "template" &&
            !(
              micro.ctx.workflowMode === "combined" &&
              isStoryboardVideoStyle(wizard.visualStyleId) &&
              !isRecipeOwnedVideoMode(wizard.videoCreativeMode)
            )
          }
          intakePath={micro.ctx.intakePath ?? null}
          intakeTemplateMode={micro.ctx.intakeTemplateMode ?? null}
          combinedStoryboard={
            micro.ctx.workflowMode === "combined" &&
            isStoryboardVideoStyle(wizard.visualStyleId) &&
            !isRecipeOwnedVideoMode(wizard.videoCreativeMode)
          }
          onGenerate={micro.goNext}
          onBrowseContinue={
            micro.hasExistingScenes || micro.hasExistingImage
              ? micro.browseContinueExisting
              : undefined
          }
          browseContinueLabel={
            micro.hasExistingScenes
              ? m.microWizard.preGenerateSetup.browseContinueScenes
              : m.microWizard.preGenerateSetup.browseContinueImage
          }
          generateDisabled={
            Boolean(micro.blockReason) ||
            Boolean(wizard.imageGenerateDisabledReason) ||
            (micro.ctx.workflowMode === "combined" &&
              wizard.isStoryboardOutput &&
              !wizard.storyboardPlan) ||
            wizard.planStoryboardBusy
          }
          generateLabel={
            micro.hasExistingScenes || micro.hasExistingImage
              ? micro.ctx.workflowMode === "combined"
                ? m.microWizard.preGenerateSetup.regenerateScenes
                : m.microWizard.preGenerateSetup.regenerateImage
              : micro.ctx.workflowMode === "combined"
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
        !isRecipeOwnedVideoMode(wizard.videoCreativeMode);
      const h3Subpath = isH3ShotRecipeMode(wizard.videoCreativeMode)
        ? h3ShotRecipeToSubpath(wizard.videoCreativeMode)
        : null;
      const researchApply = wizard.contentResearchApplyRef;
      const researchVideoSubpath =
        wizard.videoCreativeMode === "reference-concept" ||
        Boolean(wizard.researchReelAnalysis?.seedancePrompt?.trim()) ||
        (researchApply &&
          wantsResearchVideoReference(
            researchApply.angle.format,
            researchApply.angle.sourceImageUrls?.length ?? 0,
            researchApply.angle.sourceVideoUrl,
          ))
          ? "reference_reel"
          : null;
      return (
        <PreVideoSetupPanel
          scenesReady={scenesReady}
          intakePath={micro.ctx.intakePath ?? null}
          onGenerate={micro.goNext}
          onBrowseContinue={
            micro.hasExistingVideo ? micro.browseContinueExisting : undefined
          }
          browseContinueLabel={m.microWizard.preVideoSetup.browseContinueExport}
          generateDisabled={
            Boolean(micro.blockReason) || Boolean(wizard.videoGenerateDisabledReason)
          }
          generateLabel={
            micro.hasExistingVideo
              ? m.microWizard.preVideoSetup.regenerateVideo
              : m.wizard.approveGenerateVideoBtn
          }
          generateBlockMessage={
            micro.blockReason
              ? (mw.blockReasons[micro.blockReason as keyof typeof mw.blockReasons] ??
                micro.blockReason)
              : wizard.videoGenerateDisabledReason
          }
          videoSubpath={
            (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath) === "ugc_presenter"
              ? "product_promo"
              : wizard.videoCreativeMode === "social-drip"
                ? "social_drip"
                : wizard.videoCreativeMode === "vacuum-inflate"
                ? "vacuum_inflate"
                : wizard.videoCreativeMode === "creative-motion"
                ? "creative_motion"
                : wizard.videoCreativeMode === "hand-throw-scene"
                ? "hand_throw_scene"
                : wizard.videoCreativeMode === "product-explode"
                ? "product_explode"
                : wizard.videoCreativeMode === "bullet-product-elevate"
                ? "bullet_product_elevate"
                : wizard.videoCreativeMode === "blockbuster"
                ? "blockbuster"
                : isExplosionUnboxStyle(wizard.visualStyleId)
                ? "explosion_unbox"
                : h3Subpath
                ? h3Subpath
                : wizard.videoCreativeMode === "motion-poster"
                ? "motion_poster"
                : researchVideoSubpath
                ?? (micro.pendingVideoSubpath ?? micro.ctx.videoSubpath)
          }
          onPickVideoSubpath={(subpath) => {
            const h3Mode = subpathToH3ShotRecipe(subpath as never);
            const recipeOwned =
              subpath === "blockbuster" ||
              subpath === "motion_poster" ||
              subpath === "social_drip" ||
              subpath === "vacuum_inflate" ||
              subpath === "creative_motion" ||
              subpath === "hand_throw_scene" ||
              subpath === "product_explode" ||
              subpath === "bullet_product_elevate" ||
              subpath === "explosion_unbox" ||
              Boolean(h3Mode);
            micro.setVideoSubpath(subpath as never);
            micro.patchContext(
              recipeOwned
                ? { videoSubpath: subpath as never, workflowMode: "video-only" }
                : { videoSubpath: subpath as never },
            );
            if (subpath === "product_promo") {
              wizard.applyPrimaryPathVideoOnly("assistant");
            } else if (subpath === "motion_poster") {
              wizard.onVideoCreativeModeChange("motion-poster");
            } else if (subpath === "social_drip") {
              wizard.onVideoCreativeModeChange("social-drip");
            } else if (subpath === "vacuum_inflate") {
              wizard.onVideoCreativeModeChange("vacuum-inflate");
            } else if (subpath === "creative_motion") {
              wizard.onVideoCreativeModeChange("creative-motion");
            } else if (subpath === "hand_throw_scene") {
              wizard.onVideoCreativeModeChange("hand-throw-scene");
            } else if (subpath === "product_explode") {
              wizard.onVideoCreativeModeChange("product-explode");
            } else if (subpath === "bullet_product_elevate") {
              wizard.onVideoCreativeModeChange("bullet-product-elevate");
            } else if (subpath === "blockbuster") {
              wizard.onVideoCreativeModeChange("blockbuster");
            } else if (h3Mode) {
              wizard.onVideoCreativeModeChange(h3Mode);
            } else if (subpath === "reference_reel") {
              wizard.onVideoCreativeModeChange("reference-concept");
            } else if (subpath === "explosion_unbox") {
              wizard.applyPrimaryPathConceptVideo("explosion-unbox");
            } else if (subpath === "creative_video" || subpath === "brand_video") {
              wizard.applyPrimaryPathConceptVideo("creative");
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
            data-coach-id="coach-creative-video-brief"
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
          <div data-coach-id="coach-image-output-mode">
            <ImageOutputModePicker
            value={wizard.imageOutputMode}
            carouselIntent={wizard.carouselIntent}
            onCarouselIntentChange={wizard.setCarouselIntent}
            carouselSlideCount={wizard.referenceCarouselSlideCount}
            onCarouselSlideCountChange={wizard.setReferenceCarouselSlideCount}
            lockedCampaign={wizard.lockedCampaignMode}
            lockedSingle={wizard.lockedSingleImageMode}
            forVideoKeyframe={wizard.workflowMode === "combined"}
            includeTeachingCarousel={wizard.workflowMode === "image-only"}
            onChange={wizard.setImageOutputMode}
            accent="violet"
          />
          <div className="mt-4">
            <ImageResolutionPanel
              value={wizard.imageResolution}
              onChange={wizard.setImageResolution}
              accent="violet"
            />
          </div>
          </div>
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
          <div className="mt-3">
            <CompositionPresetPicker
              artStyleId={wizard.artStyleId}
              value={wizard.compositionPresetId}
              onChange={wizard.setCompositionPresetId}
            />
          </div>
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
          <CompositionPresetPicker
            artStyleId={wizard.artStyleId}
            value={wizard.compositionPresetId}
            onChange={wizard.setCompositionPresetId}
          />
          <ImageAspectRatioPicker
            value={wizard.imageAspectRatio}
            onChange={wizard.setImageAspectRatio}
            variant="light"
            accent="violet"
          />
          {wizard.videoCreativeMode !== "motion-poster" ? (
            <ImageTextModePicker
              value={wizard.imageTextMode}
              onChange={wizard.setImageTextMode}
              variant="violet"
            />
          ) : null}
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
      // Image carousel research: optional enrichment. Video research: required if download failed.
      return (
        <ReferenceVideoStep
          wizard={wizard}
          m={m}
          mw={mw}
          optional={
            wizard.workflowMode === "image-only" ||
            (wizard.workflowMode === "combined" &&
              !wizard.isContentResearchVideoPath)
          }
        />
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
            data-coach-id="coach-storyboard-brief"
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
                carouselIntent={wizard.carouselIntent}
                onCarouselIntentChange={wizard.setCarouselIntent}
                carouselSlideCount={wizard.referenceCarouselSlideCount}
                onCarouselSlideCountChange={wizard.setReferenceCarouselSlideCount}
                onChange={wizard.setImageOutputMode}
                lockedCampaign={wizard.lockedCampaignMode}
                lockedSingle={wizard.lockedSingleImageMode}
                forVideoKeyframe={wizard.workflowMode === "combined"}
                includeTeachingCarousel={wizard.workflowMode === "image-only"}
              />
              <div className="mt-4">
                <ImageResolutionPanel
                  value={wizard.imageResolution}
                  onChange={wizard.setImageResolution}
                  accent="violet"
                />
              </div>
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
          <div data-coach-id="coach-generate-video">
            {wizard.videoGenerateDisabledReason ? (
              <p className="text-sm text-amber-800">{wizard.videoGenerateDisabledReason}</p>
            ) : (
              <p className="text-sm text-slate-600">{mw.generateVideoFooterHint}</p>
            )}
          </div>
        </ScreenShell>
      );

    case "wait.reel_download":
    case "wait.reel_analyze": {
      const needDuration =
        wizard.referenceIsVideo && wizard.videoSettings.duration === "auto";
      const downloading = wizard.referenceClipLoading;
      const analyzing = wizard.researchReelAnalyzeBusy;
      return (
        <ReelAnalyzeWaitStep
          wizard={wizard}
          m={m}
          mw={mw}
          needDuration={needDuration}
          downloading={downloading}
          analyzing={analyzing}
        />
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
          workflowMode={wizard.workflowMode}
          waitKind="storyboard"
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
          workflowMode={wizard.workflowMode}
          waitKind="image"
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
          workflowMode={wizard.workflowMode}
          waitKind="video"
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
  previewSrc,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  previewSrc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition ${
        active ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : null}
      <span className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </span>
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
  const title = optional
    ? mw.refVideoTitleOptional
    : wizard.isContentResearchVideoPath
      ? mw.refVideoTitleResearch
      : mw.refVideoTitle;
  const hint = optional
    ? mw.refVideoHintOptional
    : wizard.isContentResearchVideoPath
      ? mw.refVideoHintResearch
      : mw.refVideoHint;

  function handleReferenceVideo(file: File | null) {
    if (file) {
      wizard.setReferenceResearchCdn({ url: null, platform: null });
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

function ReelAnalyzeWaitStep({
  wizard,
  m,
  mw,
  needDuration,
  downloading,
  analyzing,
}: {
  wizard: ReturnType<typeof useWizard>;
  m: ReturnType<typeof useLocale>["m"];
  mw: ReturnType<typeof useLocale>["m"]["microWizard"];
  needDuration: boolean;
  downloading: boolean;
  analyzing: boolean;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const withStoryboard = Boolean(wizard.isStoryboardOutput);

  useEffect(() => {
    if (!analyzing) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.max(1, Math.floor((Date.now() - started) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [analyzing]);

  const progress = analyzing
    ? researchReelAnalyzeProgress(elapsedSec, withStoryboard)
    : null;
  const phaseMessage =
    progress && m.wizard.researchReelAnalyzePhase
      ? m.wizard.researchReelAnalyzePhase[progress.phase]
      : m.wizard.researchReelAnalyzing;
  const eta =
    progress && wizard.formatEta
      ? wizard.formatEta(progress.remainingSec)
      : "";

  return (
    <ScreenShell
      title={
        downloading
          ? mw.reelDownloading
          : needDuration
            ? m.wizard.researchReelPickDurationFirst
            : phaseMessage
      }
      hint={
        needDuration
          ? m.wizard.researchReelSetupIntro
          : analyzing
            ? m.wizard.researchReelAnalyzeEtaHint
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
              ? phaseMessage
              : (wizard.researchReelAnalyzeNote ?? mw.analyzing)
        }
        progress={
          analyzing && progress
            ? {
                label: phaseMessage,
                pct: progress.pct,
                eta,
              }
            : null
        }
      />
      {!downloading && !analyzing && wizard.researchReelAnalyzeNote ? (
        <p className="text-xs text-emerald-800">{wizard.researchReelAnalyzeNote}</p>
      ) : null}
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
  workflowMode = null,
  waitKind = "image",
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
  workflowMode?: WorkflowMode | null;
  waitKind?: "image" | "video" | "storyboard";
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
        workflowMode={workflowMode}
        waitKind={waitKind}
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
