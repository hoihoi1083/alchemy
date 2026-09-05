"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";
import { imageModePreviewSrc, videoModePreviewSrc } from "@/lib/creative-workflow";
import { getVisualStyle } from "@/lib/visual-styles";

type Variant = "physical-image" | "concept-image" | "physical-video" | "concept-video";

type Props = {
  variant: Variant;
  /** Show cinematic single + recipe shortcuts (concept combined cinematic) */
  showCinematicExtras?: boolean;
};

export function PrimaryPathsPanel({ variant, showCinematicExtras = false }: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    applyClosestMatchRecipe,
    applyPrimaryPath,
    applyPrimaryPathConcept,
    applyPrimaryPathConceptVideo,
    applyPrimaryPathVideoOnly,
    applyQuickTest8sRecipe,
    cinematicSceneCount,
    imageCreativeMode,
    promptExtra,
    promotionMode,
    videoCreativeMode,
    visualStyleId,
    workflowMode,
  } = wizard;

  const [recipeApplyNote, setRecipeApplyNote] = useState<string | null>(null);
  const assistantMode = m.wizard.videoCreativeModes["product-assistant"];
  const isConcept = promotionMode === "concept";
  const hideForResearch =
    !isConcept &&
    isContentResearchStyleExtra(promptExtra) &&
    (workflowMode === "image-only" || workflowMode === "video-only");

  if (hideForResearch) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
        {m.wizard.primaryPathsHiddenResearchHint}
      </p>
    );
  }

  function handleClosestMatch() {
    applyClosestMatchRecipe();
    setRecipeApplyNote(m.wizard.closestMatchRecipeApplied);
    window.setTimeout(() => setRecipeApplyNote(null), 1800);
  }

  function handleQuickTest8s() {
    applyQuickTest8sRecipe();
    setRecipeApplyNote(m.wizard.quickTest8sRecipeApplied);
    window.setTimeout(() => setRecipeApplyNote(null), 1800);
  }

  const pathsTitle =
    variant === "concept-video"
      ? m.wizard.conceptVideoPathsTitle
      : variant === "concept-image"
        ? m.wizard.conceptPathsTitle
        : variant === "physical-video"
          ? m.wizard.videoPathsTitle
          : m.wizard.primaryPathsTitle;

  const pathsHint =
    variant === "concept-video"
      ? m.wizard.conceptVideoPathsHint
      : variant === "concept-image"
        ? m.wizard.conceptPathsHint
        : variant === "physical-video"
          ? m.wizard.videoPathsHint
          : m.wizard.primaryPathsHint;

  return (
    <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 via-white to-violet-100/60 p-4">
      <p className="text-sm font-semibold text-slate-900">{pathsTitle}</p>
      <p className="mt-1 text-xs text-slate-600">{pathsHint}</p>

      {variant === "concept-video" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={visualStyleId === "explosion-unbox"}
            title={m.wizard.visualStyles["explosion-unbox"].title}
            description={m.wizard.visualStyles["explosion-unbox"].description}
            previewSrc={getVisualStyle("explosion-unbox").previewSrc}
            onClick={() => applyPrimaryPathConceptVideo("explosion-unbox")}
          />
          <PathButton
            active={visualStyleId === "creative-video"}
            title={m.wizard.visualStyles["creative-video"].title}
            description={m.wizard.visualStyles["creative-video"].description}
            previewSrc={getVisualStyle("creative-video").previewSrc}
            onClick={() => applyPrimaryPathConceptVideo("creative")}
          />
          <PathButton
            active={visualStyleId === "brand-video"}
            title={m.wizard.visualStyles["brand-video"].title}
            description={m.wizard.visualStyles["brand-video"].description}
            previewSrc={getVisualStyle("brand-video").previewSrc}
            onClick={() => applyPrimaryPathConceptVideo("brand")}
          />
        </div>
      ) : variant === "concept-image" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={visualStyleId === "info-poster"}
            title={m.wizard.pathInfoTitle}
            description={m.wizard.pathInfoDesc}
            previewSrc={getVisualStyle("info-poster").previewSrc}
            onClick={() => applyPrimaryPathConcept("info")}
          />
          <PathButton
            active={visualStyleId === "designed-poster"}
            title={m.microWizard.preGenerateSetup.stylePickerDesignedLabel}
            description={m.microWizard.preGenerateSetup.stylePickerDesignedDesc}
            previewSrc={getVisualStyle("designed-poster").previewSrc}
            onClick={() => applyPrimaryPathConcept("designed")}
          />
          <PathButton
            active={visualStyleId === "gaming-cover"}
            title={m.microWizard.preGenerateSetup.stylePickerGamingLabel}
            description={m.microWizard.preGenerateSetup.stylePickerGamingDesc}
            previewSrc={getVisualStyle("gaming-cover").previewSrc}
            onClick={() => applyPrimaryPathConcept("gaming-cover")}
          />
          <PathButton
            active={visualStyleId === "sports-big-words"}
            title={m.microWizard.preGenerateSetup.stylePickerSportsLabel}
            description={m.microWizard.preGenerateSetup.stylePickerSportsDesc}
            previewSrc={getVisualStyle("sports-big-words").previewSrc}
            onClick={() => applyPrimaryPathConcept("sports-big-words")}
          />
          <PathButton
            active={visualStyleId === "jelly-3d"}
            title={m.microWizard.preGenerateSetup.stylePickerJellyLabel}
            description={m.microWizard.preGenerateSetup.stylePickerJellyDesc}
            previewSrc={getVisualStyle("jelly-3d").previewSrc}
            onClick={() => applyPrimaryPathConcept("jelly-3d")}
          />
          <PathButton
            active={visualStyleId === "type-force"}
            title={m.microWizard.preGenerateSetup.stylePickerTypeForceLabel}
            description={m.microWizard.preGenerateSetup.stylePickerTypeForceDesc}
            previewSrc={getVisualStyle("type-force").previewSrc}
            onClick={() => applyPrimaryPathConcept("type-force")}
          />
          <PathButton
            active={visualStyleId === "material-letters"}
            title={m.microWizard.preGenerateSetup.stylePickerMaterialLettersLabel}
            description={
              m.microWizard.preGenerateSetup.stylePickerMaterialLettersDesc
            }
            previewSrc={getVisualStyle("material-letters").previewSrc}
            onClick={() => applyPrimaryPathConcept("material-letters")}
          />
          <PathButton
            active={visualStyleId === "type-interaction"}
            title={m.microWizard.preGenerateSetup.stylePickerTypeInteractionLabel}
            description={
              m.microWizard.preGenerateSetup.stylePickerTypeInteractionDesc
            }
            previewSrc={getVisualStyle("type-interaction").previewSrc}
            onClick={() => applyPrimaryPathConcept("type-interaction")}
          />
          <PathButton
            active={visualStyleId === "brand-fit"}
            title={m.wizard.pathBrandTitle}
            description={m.wizard.pathBrandDesc}
            previewSrc={getVisualStyle("brand-fit").previewSrc}
            onClick={() => applyPrimaryPathConcept("brand")}
          />
          <PathButton
            active={visualStyleId === "pricing-offer"}
            title={m.wizard.pathPricingTitle}
            description={m.wizard.pathPricingDesc}
            previewSrc={getVisualStyle("pricing-offer").previewSrc}
            onClick={() => applyPrimaryPathConcept("pricing")}
          />
          <PathButton
            active={visualStyleId === "website-launch"}
            title={m.wizard.pathWebsiteTitle}
            description={m.wizard.pathWebsiteDesc}
            previewSrc={getVisualStyle("website-launch").previewSrc}
            onClick={() => applyPrimaryPathConcept("website")}
          />
        </div>
      ) : variant === "physical-video" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={videoCreativeMode === "product-assistant"}
            title={`🤖 ${assistantMode.title}`}
            description={assistantMode.description}
            previewSrc={videoModePreviewSrc("product-assistant")}
            onClick={() => applyPrimaryPathVideoOnly("assistant")}
          />
          <PathButton
            active={visualStyleId === "storyboard-video"}
            title={m.wizard.pathStoryboardTitle}
            description={m.wizard.pathStoryboardDesc}
            previewSrc={getVisualStyle("storyboard-video").previewSrc}
            onClick={() => applyPrimaryPathVideoOnly("storyboard")}
          />
          <PathButton
            active={visualStyleId === "brand-video"}
            title={m.wizard.visualStyles["brand-video"].title}
            description={m.wizard.visualStyles["brand-video"].description}
            previewSrc={getVisualStyle("brand-video").previewSrc}
            onClick={() => applyPrimaryPathVideoOnly("brand")}
          />
          <PathButton
            active={visualStyleId === "creative-video"}
            title={m.wizard.visualStyles["creative-video"].title}
            description={m.wizard.visualStyles["creative-video"].description}
            previewSrc={getVisualStyle("creative-video").previewSrc}
            onClick={() => applyPrimaryPathVideoOnly("creative")}
          />
          <PathButton
            active={visualStyleId === "ugc-presenter"}
            title={m.wizard.pathUgcPresenterTitle}
            description={m.wizard.pathUgcPresenterDesc}
            previewSrc={getVisualStyle("ugc-presenter").previewSrc}
            onClick={() => applyPrimaryPathVideoOnly("ugc-presenter")}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" data-coach-id="coach-visual-style-paths">
          {workflowMode === "combined" ? (
            <>
              <PathButton
                active={visualStyleId === "storyboard-video"}
                title={m.wizard.pathStoryboardTitle}
                description={m.wizard.pathStoryboardDesc}
                previewSrc={getVisualStyle("storyboard-video").previewSrc}
                onClick={() => applyPrimaryPath("storyboard")}
              />
              <PathButton
                active={visualStyleId === "ugc-presenter"}
                title={m.wizard.pathUgcPresenterTitle}
                description={m.wizard.pathUgcPresenterDesc}
                previewSrc={getVisualStyle("ugc-presenter").previewSrc}
                onClick={() => applyPrimaryPath("ugc-presenter")}
              />
            </>
          ) : (
            <>
              <PathButton
                active={visualStyleId === "product" && imageCreativeMode !== "reference-concept"}
                title={m.wizard.pathQuickTitle}
                description={m.wizard.pathQuickDesc}
                previewSrc={getVisualStyle("product").previewSrc}
                onClick={() => applyPrimaryPath("quick")}
              />
              <PathButton
                active={visualStyleId === "designed-poster"}
                title={m.microWizard.preGenerateSetup.stylePickerDesignedLabel}
                description={m.microWizard.preGenerateSetup.stylePickerDesignedDesc}
                previewSrc={getVisualStyle("designed-poster").previewSrc}
                onClick={() => applyPrimaryPath("designed")}
              />
              <PathButton
                active={visualStyleId === "parts-poster"}
                title={m.microWizard.preGenerateSetup.stylePickerPartsLabel}
                description={m.microWizard.preGenerateSetup.stylePickerPartsDesc}
                previewSrc={getVisualStyle("parts-poster").previewSrc}
                onClick={() => applyPrimaryPath("parts")}
              />
              <PathButton
                active={visualStyleId === "gaming-cover"}
                title={m.microWizard.preGenerateSetup.stylePickerGamingLabel}
                description={m.microWizard.preGenerateSetup.stylePickerGamingDesc}
                previewSrc={getVisualStyle("gaming-cover").previewSrc}
                onClick={() => applyPrimaryPath("gaming-cover")}
              />
              <PathButton
                active={visualStyleId === "sports-big-words"}
                title={m.microWizard.preGenerateSetup.stylePickerSportsLabel}
                description={m.microWizard.preGenerateSetup.stylePickerSportsDesc}
                previewSrc={getVisualStyle("sports-big-words").previewSrc}
                onClick={() => applyPrimaryPath("sports-big-words")}
              />
              <PathButton
                active={visualStyleId === "jelly-3d"}
                title={m.microWizard.preGenerateSetup.stylePickerJellyLabel}
                description={m.microWizard.preGenerateSetup.stylePickerJellyDesc}
                previewSrc={getVisualStyle("jelly-3d").previewSrc}
                onClick={() => applyPrimaryPath("jelly-3d")}
              />
              <PathButton
                active={visualStyleId === "type-force"}
                title={m.microWizard.preGenerateSetup.stylePickerTypeForceLabel}
                description={
                  m.microWizard.preGenerateSetup.stylePickerTypeForceDesc
                }
                previewSrc={getVisualStyle("type-force").previewSrc}
                onClick={() => applyPrimaryPath("type-force")}
              />
              <PathButton
                active={visualStyleId === "material-letters"}
                title={
                  m.microWizard.preGenerateSetup.stylePickerMaterialLettersLabel
                }
                description={
                  m.microWizard.preGenerateSetup.stylePickerMaterialLettersDesc
                }
                previewSrc={getVisualStyle("material-letters").previewSrc}
                onClick={() => applyPrimaryPath("material-letters")}
              />
              <PathButton
                active={visualStyleId === "type-interaction"}
                title={
                  m.microWizard.preGenerateSetup.stylePickerTypeInteractionLabel
                }
                description={
                  m.microWizard.preGenerateSetup.stylePickerTypeInteractionDesc
                }
                previewSrc={getVisualStyle("type-interaction").previewSrc}
                onClick={() => applyPrimaryPath("type-interaction")}
              />
              <PathButton
                active={visualStyleId === "product-lifestyle"}
                title={
                  m.microWizard.preGenerateSetup.stylePickerProductLifestyleLabel
                }
                description={
                  m.microWizard.preGenerateSetup.stylePickerProductLifestyleDesc
                }
                previewSrc={getVisualStyle("product-lifestyle").previewSrc}
                onClick={() => applyPrimaryPath("product-lifestyle")}
              />
              <PathButton
                active={visualStyleId === "model-wear"}
                title={m.wizard.pathModelTitle}
                description={m.wizard.pathModelDesc}
                previewSrc={getVisualStyle("model-wear").previewSrc}
                onClick={() => applyPrimaryPath("model")}
              />
              {workflowMode !== "image-only" ? (
                <>
                  <PathButton
                    active={imageCreativeMode === "reference-concept"}
                    title={m.wizard.pathReferenceTitle}
                    description={m.wizard.pathReferenceDesc}
                    previewSrc={imageModePreviewSrc("reference-concept")}
                    onClick={() => applyPrimaryPath("reference")}
                  />
                  <PathButton
                    active={visualStyleId === "ugc-presenter"}
                    title={m.wizard.pathUgcPresenterTitle}
                    description={m.wizard.pathUgcPresenterDesc}
                    previewSrc={getVisualStyle("ugc-presenter").previewSrc}
                    onClick={() => applyPrimaryPath("ugc-presenter")}
                  />
                  <PathButton
                    active={visualStyleId === "storyboard-video"}
                    title={m.wizard.pathStoryboardTitle}
                    description={m.wizard.pathStoryboardDesc}
                    previewSrc={getVisualStyle("storyboard-video").previewSrc}
                    onClick={() => applyPrimaryPath("storyboard")}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      {showCinematicExtras ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
          <p className="text-xs font-semibold text-violet-900">{m.wizard.conceptCinematicPathsTitle}</p>
          <p className="mt-1 text-xs text-violet-800">{m.wizard.conceptCinematicPathsHint}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <PathButton
              compact
              active={visualStyleId === "concept-cinematic" && cinematicSceneCount === 1}
              title={m.wizard.conceptCinematicSingleTitle}
              description={m.wizard.conceptCinematicSingleDesc}
              previewSrc={getVisualStyle("concept-cinematic").previewSrc}
              onClick={() => applyPrimaryPathConceptVideo("cinematic")}
            />
          </div>
          <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/80 p-2">
            <p className="text-xs font-semibold text-cyan-900">{m.wizard.closestMatchRecipeTitle}</p>
            <p className="mt-1 text-xs text-cyan-800">{m.wizard.closestMatchRecipeHint}</p>
            <button
              type="button"
              onClick={handleClosestMatch}
              className="mt-2 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:border-cyan-400"
            >
              {m.wizard.closestMatchRecipeApply}
            </button>
            {recipeApplyNote ? (
              <p className="mt-1 text-[11px] text-cyan-900">{recipeApplyNote}</p>
            ) : null}
          </div>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
            <p className="text-xs font-semibold text-amber-900">{m.wizard.quickTest8sRecipeTitle}</p>
            <p className="mt-1 text-xs text-amber-800">{m.wizard.quickTest8sRecipeHint}</p>
            <button
              type="button"
              onClick={handleQuickTest8s}
              className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:border-amber-400"
            >
              {m.wizard.quickTest8sRecipeApply}
            </button>
          </div>
        </div>
      ) : null}

      {variant === "physical-image" && !isConcept ? (
        <p className="mt-2 text-[11px] text-slate-500">{m.wizard.primaryPathsShortcutNote}</p>
      ) : null}
      {variant === "physical-video" && videoCreativeMode === "product-assistant" ? (
        <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-950">
          {m.wizard.videoAssistantStepHint}
        </p>
      ) : null}
    </div>
  );
}

function PathButton({
  title,
  description,
  active,
  onClick,
  previewSrc,
  compact = false,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  previewSrc?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left ${
        compact ? "rounded-lg py-2 text-xs" : ""
      } ${
        active ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"
      }`}
    >
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          className={`shrink-0 rounded-lg object-cover ${compact ? "h-12 w-12" : "h-14 w-14"}`}
        />
      ) : null}
      <span className="min-w-0">
        <span className={`block font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>
          {title}
        </span>
        <span className={`mt-1 block text-slate-600 ${compact ? "text-[11px]" : "text-xs"}`}>
          {description}
        </span>
      </span>
    </button>
  );
}
