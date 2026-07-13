"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { CINEMATIC_SCENE_COUNTS, type CinematicSceneCount } from "@/lib/cinematic-scene-config";
import { isContentResearchStyleExtra } from "@/lib/content-research-promote";

type Variant = "physical-image" | "concept-image" | "physical-video" | "concept-video";

type Props = {
  variant: Variant;
  /** Show cinematic stitch + recipe shortcuts (concept combined cinematic) */
  showCinematicExtras?: boolean;
};

export function PrimaryPathsPanel({ variant, showCinematicExtras = false }: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    applyClosestMatchRecipe,
    applyCinematicStitchRecipe,
    applyPrimaryPath,
    applyPrimaryPathConcept,
    applyPrimaryPathConceptVideo,
    applyPrimaryPathVideoOnly,
    applyQuickTest8sRecipe,
    cinematicSceneCount,
    formatCinematicCopy,
    imageCreativeMode,
    onCinematicSceneCountChange,
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
    <div className="rounded-2xl border border-cyan-200 bg-linear-to-br from-cyan-50 via-white to-indigo-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{pathsTitle}</p>
      <p className="mt-1 text-xs text-slate-600">{pathsHint}</p>

      {variant === "concept-video" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={visualStyleId === "creative-video"}
            title={m.wizard.visualStyles["creative-video"].title}
            description={m.wizard.visualStyles["creative-video"].description}
            onClick={() => applyPrimaryPathConceptVideo("creative")}
          />
          <PathButton
            active={visualStyleId === "brand-video"}
            title={m.wizard.visualStyles["brand-video"].title}
            description={m.wizard.visualStyles["brand-video"].description}
            onClick={() => applyPrimaryPathConceptVideo("brand")}
          />
        </div>
      ) : variant === "concept-image" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={visualStyleId === "info-poster"}
            title={m.wizard.pathInfoTitle}
            description={m.wizard.pathInfoDesc}
            onClick={() => applyPrimaryPathConcept("info")}
          />
          <PathButton
            active={visualStyleId === "brand-fit"}
            title={m.wizard.pathBrandTitle}
            description={m.wizard.pathBrandDesc}
            onClick={() => applyPrimaryPathConcept("brand")}
          />
          <PathButton
            active={visualStyleId === "pricing-offer"}
            title={m.wizard.pathPricingTitle}
            description={m.wizard.pathPricingDesc}
            onClick={() => applyPrimaryPathConcept("pricing")}
          />
          <PathButton
            active={visualStyleId === "website-launch"}
            title={m.wizard.pathWebsiteTitle}
            description={m.wizard.pathWebsiteDesc}
            onClick={() => applyPrimaryPathConcept("website")}
          />
        </div>
      ) : variant === "physical-video" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PathButton
            active={videoCreativeMode === "product-assistant"}
            title={`🤖 ${assistantMode.title}`}
            description={assistantMode.description}
            onClick={() => applyPrimaryPathVideoOnly("assistant")}
          />
          <PathButton
            active={visualStyleId === "storyboard-video"}
            title={m.wizard.pathStoryboardTitle}
            description={m.wizard.pathStoryboardDesc}
            onClick={() => applyPrimaryPathVideoOnly("storyboard")}
          />
          <PathButton
            active={visualStyleId === "brand-video"}
            title={m.wizard.visualStyles["brand-video"].title}
            description={m.wizard.visualStyles["brand-video"].description}
            onClick={() => applyPrimaryPathVideoOnly("brand")}
          />
          <PathButton
            active={visualStyleId === "creative-video"}
            title={m.wizard.visualStyles["creative-video"].title}
            description={m.wizard.visualStyles["creative-video"].description}
            onClick={() => applyPrimaryPathVideoOnly("creative")}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" data-coach-id="coach-visual-style-paths">
          <PathButton
            active={visualStyleId === "product" && imageCreativeMode !== "reference-concept"}
            title={m.wizard.pathQuickTitle}
            description={m.wizard.pathQuickDesc}
            onClick={() => applyPrimaryPath("quick")}
          />
          <PathButton
            active={imageCreativeMode === "reference-concept"}
            title={m.wizard.pathReferenceTitle}
            description={m.wizard.pathReferenceDesc}
            onClick={() => applyPrimaryPath("reference")}
          />
          <PathButton
            active={visualStyleId === "model-wear"}
            title={m.wizard.pathModelTitle}
            description={m.wizard.pathModelDesc}
            onClick={() => applyPrimaryPath("model")}
          />
          <PathButton
            active={visualStyleId === "ugc-presenter"}
            title={m.wizard.pathUgcPresenterTitle}
            description={m.wizard.pathUgcPresenterDesc}
            onClick={() => applyPrimaryPath("ugc-presenter")}
          />
          {workflowMode !== "image-only" ? (
            <PathButton
              active={visualStyleId === "storyboard-video"}
              title={m.wizard.pathStoryboardTitle}
              description={m.wizard.pathStoryboardDesc}
              onClick={() => applyPrimaryPath("storyboard")}
            />
          ) : null}
        </div>
      )}

      {showCinematicExtras ? (
        <div className="mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
          <p className="text-xs font-semibold text-fuchsia-900">{m.wizard.conceptCinematicPathsTitle}</p>
          <p className="mt-1 text-xs text-fuchsia-800">{m.wizard.conceptCinematicPathsHint}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <PathButton
              compact
              active={visualStyleId === "concept-cinematic" && cinematicSceneCount === 1}
              title={m.wizard.conceptCinematicSingleTitle}
              description={m.wizard.conceptCinematicSingleDesc}
              onClick={() => applyPrimaryPathConceptVideo("cinematic")}
            />
            <PathButton
              compact
              active={visualStyleId === "concept-cinematic" && cinematicSceneCount > 1}
              title={m.wizard.conceptCinematicStitchTitle}
              description={m.wizard.conceptCinematicStitchDesc}
              onClick={applyCinematicStitchRecipe}
            />
          </div>
          {visualStyleId === "concept-cinematic" ? (
            <div className="mt-3 rounded-lg border border-fuchsia-200 bg-white/80 p-2">
              <label className="flex flex-wrap items-center gap-2 text-xs text-fuchsia-950">
                <span className="font-semibold">{m.wizard.cinematicSceneCountLabel}</span>
                <select
                  value={cinematicSceneCount}
                  onChange={(e) =>
                    onCinematicSceneCountChange(Number(e.target.value) as CinematicSceneCount)
                  }
                  className="rounded-md border border-fuchsia-300 bg-white px-2 py-1 text-xs text-fuchsia-950"
                >
                  {CINEMATIC_SCENE_COUNTS.map((n) => (
                    <option key={n} value={n}>
                      {n === 1
                        ? m.wizard.conceptCinematicSingleTitle
                        : formatCinematicCopy(m.wizard.cinematicSceneCountOption, n)}
                    </option>
                  ))}
                </select>
                <span className="text-fuchsia-800">
                  {formatCinematicCopy(m.wizard.cinematicSceneCountTotalHint)}
                </span>
              </label>
              <p className="mt-1 text-[11px] text-fuchsia-800">{m.wizard.cinematicSceneCountHint}</p>
            </div>
          ) : null}
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
  compact = false,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left ${
        compact ? "rounded-lg py-2 text-xs" : ""
      } ${
        active ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>{title}</p>
      <p className={`mt-1 text-slate-600 ${compact ? "text-[11px]" : "text-xs"}`}>{description}</p>
    </button>
  );
}
