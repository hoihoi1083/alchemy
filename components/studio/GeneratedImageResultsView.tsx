"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import {
  resolveGeneratedImageResultView,
  type GeneratedImageResultViewKind,
} from "@/lib/generated-image-result-view";

type Props = {
  /** Light = micro-wizard review; dark = classic ImageStep palette. */
  variant?: "light" | "dark";
  /** Storyboard reorder / replace / regenerate controls (classic ImageStep only). */
  showStoryboardControls?: boolean;
};

const PANEL: Record<
  "light" | "dark",
  Record<
    GeneratedImageResultViewKind,
    { wrap: string; title: string; card: string; label: string; sublabel: string }
  >
> = {
  light: {
    empty: { wrap: "", title: "", card: "", label: "", sublabel: "" },
    original: { wrap: "", title: "", card: "", label: "", sublabel: "" },
    storyboard: {
      wrap: "rounded-2xl border border-teal-200 bg-teal-50/60 p-4",
      title: "text-sm font-medium text-teal-900",
      card: "rounded-xl border border-slate-200 bg-white p-2",
      label: "text-xs font-medium text-slate-700",
      sublabel: "text-[10px] text-slate-500",
    },
    cinematic: {
      wrap: "rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4",
      title: "text-sm font-medium text-fuchsia-900",
      card: "rounded-xl border border-slate-200 bg-white p-2",
      label: "text-xs font-medium text-slate-700",
      sublabel: "text-[10px] text-slate-500",
    },
    carousel: {
      wrap: "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4",
      title: "text-sm font-medium text-emerald-900",
      card: "rounded-xl border border-slate-200 bg-white p-2 hover:border-slate-300",
      label: "text-xs font-medium text-slate-700",
      sublabel: "text-[10px] text-slate-500",
    },
    ab: {
      wrap: "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4",
      title: "text-sm font-medium text-emerald-900",
      card: "rounded-xl border border-slate-200 bg-white p-2 hover:border-slate-300",
      label: "text-xs text-slate-600",
      sublabel: "",
    },
    single: {
      wrap: "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4",
      title: "text-sm font-medium text-emerald-900",
      card: "",
      label: "",
      sublabel: "",
    },
  },
  dark: {
    empty: { wrap: "", title: "", card: "", label: "", sublabel: "" },
    original: { wrap: "", title: "", card: "", label: "", sublabel: "" },
    storyboard: {
      wrap: "rounded-2xl border border-teal-700/50 bg-teal-950/25 p-4",
      title: "text-xs font-medium text-teal-200",
      card: "rounded-xl border border-slate-700 bg-slate-900/40 p-2",
      label: "text-xs font-medium text-slate-200",
      sublabel: "text-[10px] text-slate-400",
    },
    cinematic: {
      wrap: "rounded-2xl border border-fuchsia-700/50 bg-fuchsia-950/25 p-4",
      title: "text-xs font-medium text-fuchsia-200",
      card: "rounded-xl border border-slate-700 bg-slate-900/40 p-2",
      label: "text-xs font-medium text-slate-200",
      sublabel: "text-[10px] text-slate-400",
    },
    carousel: {
      wrap: "rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4",
      title: "text-xs font-medium text-emerald-200",
      card: "rounded-xl border border-slate-700 bg-slate-900/40 p-2 hover:border-slate-500",
      label: "text-xs font-medium text-slate-200",
      sublabel: "text-[10px] text-slate-400",
    },
    ab: {
      wrap: "rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4",
      title: "text-xs font-medium text-emerald-200",
      card: "rounded-xl border border-slate-700 bg-slate-900/40 p-2 hover:border-slate-500",
      label: "text-xs text-slate-300",
      sublabel: "",
    },
    single: {
      wrap: "rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-4",
      title: "text-xs font-medium text-emerald-200",
      card: "",
      label: "",
      sublabel: "",
    },
  },
};

function selectedCardClass(variant: "light" | "dark", selected: boolean): string {
  if (variant === "light") {
    return selected
      ? "border-emerald-500 bg-white ring-2 ring-emerald-500/40"
      : "border-slate-200 bg-white hover:border-slate-300";
  }
  return selected
    ? "border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/60"
    : "border-slate-700 bg-slate-900/40 hover:border-slate-500";
}

export function GeneratedImageResultsView({
  variant = "light",
  showStoryboardControls = false,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const view = resolveGeneratedImageResultView({
    imageUrl: wizard.imageUrl,
    useOriginalImage: wizard.useOriginalImage,
    imageVariantUrls: wizard.imageVariantUrls,
    campaignSlides: wizard.campaignSlides,
    storyboardScenes: wizard.storyboardScenes,
    cinematicScenes: wizard.cinematicScenes,
    effectiveImageOutputMode: wizard.effectiveImageOutputMode,
    isStoryboardOutput: wizard.isStoryboardOutput,
    isCinematicStitchOutput: wizard.isCinematicStitchOutput,
  });
  const palette = PANEL[variant][view.kind];
  const modeCopy = m.wizard.imageOutputModes[wizard.effectiveImageOutputMode];

  if (view.kind === "original" || view.kind === "empty") {
    return null;
  }

  const modeBadge =
    modeCopy && (view.kind === "carousel" || view.kind === "ab" || view.kind === "single") ? (
      <p className={`text-xs font-medium ${variant === "light" ? "text-slate-500" : "text-slate-400"}`}>
        {modeCopy.title}
        {view.kind === "carousel"
          ? ` · ${wizard.campaignSlides.length} ${m.wizard.carouselSlideCountLabel}`
          : null}
      </p>
    ) : null;

  if (view.kind === "storyboard") {
    return (
      <div className="space-y-3">
        {modeBadge}
        <div className={palette.wrap}>
          <p className={`mb-2 text-[10px] ${variant === "light" ? "text-teal-800/80" : "text-teal-200/80"}`}>
            {m.wizard.storyboardEditorHint}
          </p>
          {wizard.storyboardPlan?.theme ? (
            <p className={`mb-2 text-xs ${variant === "light" ? "text-teal-900/80" : "text-teal-100/80"}`}>
              <span className="font-medium">{m.wizard.storyboardPlanLabel}:</span>{" "}
              {wizard.storyboardPlan.theme}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wizard.storyboardScenes.map((scene, i) => (
              <div key={`${scene.imageUrl}-${i}`} className={palette.card}>
                <img
                  src={`${scene.imageUrl}${scene.imageUrl.includes("?") ? "&" : "?"}v=${wizard.imageGenKey}-${i}`}
                  alt=""
                  className="mx-auto max-h-48 w-full rounded-lg object-contain"
                />
                <span className={`mt-2 block text-center ${palette.label}`}>
                  {m.wizard.storyboardSceneLabel} {scene.imageIndex}
                  {scene.startSec !== scene.endSec ? ` · ${scene.startSec}–${scene.endSec}s` : ""}
                </span>
                <span className={`mt-1 block text-center line-clamp-2 ${palette.sublabel}`}>
                  {scene.sceneDescriptionZh || scene.role}
                </span>
                {showStoryboardControls ? (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => wizard.reorderStoryboardScene(i, i - 1)}
                      className="min-h-10 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                    >
                      {m.wizard.storyboardMoveUpBtn}
                    </button>
                    <button
                      type="button"
                      disabled={i === wizard.storyboardScenes.length - 1}
                      onClick={() => wizard.reorderStoryboardScene(i, i + 1)}
                      className="min-h-10 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
                    >
                      {m.wizard.storyboardMoveDownBtn}
                    </button>
                    <label className="flex min-h-10 cursor-pointer items-center rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200">
                      {wizard.storyboardSceneReplaceBusy === i
                        ? m.wizard.storyboardReplacingImage
                        : m.wizard.storyboardReplaceImageBtn}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          void wizard.replaceStoryboardSceneImage(i, e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={wizard.storyboardSceneRegenerateBusy !== null}
                      onClick={() => void wizard.regenerateStoryboardSceneWithAi(i)}
                      className="min-h-10 rounded-md border border-amber-500/70 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 disabled:opacity-40"
                    >
                      {wizard.storyboardSceneRegenerateBusy === i
                        ? m.wizard.storyboardRegeneratingImage
                        : m.wizard.storyboardRegenerateAiBtn}
                    </button>
                    {wizard.brandKit?.logoUrl ? (
                      <button
                        type="button"
                        disabled={wizard.storyboardSceneRegenerateBusy !== null}
                        onClick={() => void wizard.stampStoryboardSceneLogo(i)}
                        className="min-h-10 rounded-md border border-emerald-500/70 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40"
                      >
                        {wizard.storyboardSceneRegenerateBusy === i
                          ? m.wizard.storyboardStampingLogo
                          : m.wizard.storyboardStampLogoBtn}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className={`mt-3 text-xs ${variant === "light" ? "text-teal-800/80" : "text-teal-200/80"}`}>
            {m.wizard.storyboardAllScenesImageHint}
          </p>
        </div>
      </div>
    );
  }

  if (view.kind === "cinematic") {
    return (
      <div className="space-y-3">
        {modeBadge}
        <div className={palette.wrap}>
          {wizard.cinematicReelPlan?.theme ? (
            <p className={`mb-2 text-xs ${variant === "light" ? "text-fuchsia-900/80" : "text-fuchsia-100/80"}`}>
              <span className="font-medium">{m.wizard.cinematicReelPlanLabel}:</span>{" "}
              {wizard.cinematicReelPlan.theme}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {wizard.cinematicScenes.map((scene) => (
              <div key={`${scene.imageUrl}-${scene.sceneIndex}`} className={palette.card}>
                <img src={scene.imageUrl} alt="" className="mx-auto max-h-48 w-full rounded-lg object-contain" />
                <span className={`mt-2 block text-center ${palette.label}`}>
                  {m.wizard.storyboardSceneLabel} {scene.sceneIndex}
                  {` · ${scene.startSec}–${scene.endSec}s`}
                </span>
                <span className={`mt-1 block text-center line-clamp-2 ${palette.sublabel}`}>
                  {scene.sceneDescriptionZh || scene.role}
                </span>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-xs ${variant === "light" ? "text-fuchsia-800/80" : "text-fuchsia-200/80"}`}>
            {wizard.formatCinematicCopy(m.wizard.cinematicStitchImageHint)}
          </p>
        </div>
      </div>
    );
  }

  if (view.kind === "carousel") {
    const pickLabel =
      view.carouselVariant === "teaching"
        ? m.wizard.pickTeachingCarouselSlideLabel
        : m.wizard.pickCampaignSlideLabel;
    const gridCols =
      wizard.campaignSlides.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";

    return (
      <div className="space-y-3">
        {modeBadge}
        <div className={palette.wrap}>
          {wizard.campaignPlan?.theme ? (
            <p className={`mb-2 text-xs ${variant === "light" ? "text-emerald-900/80" : "text-emerald-100/80"}`}>
              <span className="font-medium">{m.wizard.campaignPlanLabel}:</span> {wizard.campaignPlan.theme}
            </p>
          ) : null}
          <p className={`mb-3 ${palette.title}`}>{pickLabel}</p>
          <div className={`grid gap-3 ${gridCols}`}>
            {wizard.campaignSlides.map((slide, i) => (
              <button
                key={`${slide.imageUrl}-${i}`}
                type="button"
                onClick={() => {
                  wizard.setSelectedVariantIndex(i);
                  wizard.setImageUrl(slide.imageUrl);
                  wizard.setImageGenKey((k: number) => k + 1);
                }}
                className={`${palette.card} p-2 text-left transition ${selectedCardClass(variant, wizard.selectedVariantIndex === i)}`}
              >
                <img
                  src={`${slide.imageUrl}${slide.imageUrl.includes("?") ? "&" : "?"}v=${wizard.imageGenKey}-${i}`}
                  alt=""
                  className="mx-auto max-h-52 w-full rounded-lg object-contain"
                />
                <span className={`mt-2 block text-center ${palette.label}`}>
                  {wizard.campaignSlideLabel(slide.role, slide.title)}
                </span>
                {slide.headline ? (
                  <span className={`mt-1 block text-center line-clamp-2 ${palette.sublabel}`}>
                    {slide.headline}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === "ab") {
    return (
      <div className="space-y-3">
        {modeBadge}
        <div className={palette.wrap}>
          <p className={`mb-3 ${palette.title}`}>{m.wizard.pickVariantLabel}</p>
          <div className="grid grid-cols-2 gap-3">
            {wizard.imageVariantUrls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => {
                  wizard.setSelectedVariantIndex(i);
                  wizard.setImageUrl(url);
                  wizard.setImageGenKey((k: number) => k + 1);
                }}
                className={`${palette.card} p-2 transition ${selectedCardClass(variant, wizard.selectedVariantIndex === i)}`}
              >
                <img
                  src={`${url}${url.includes("?") ? "&" : "?"}v=${wizard.imageGenKey}-${i}`}
                  alt=""
                  className="mx-auto max-h-52 w-full rounded-lg object-contain"
                />
                <span className={`mt-2 block text-center ${palette.label}`}>
                  {i === 0 ? m.wizard.variantA : m.wizard.variantB}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modeBadge}
      <div className={palette.wrap}>
        <p className={`mb-2 ${palette.title}`}>{m.wizard.aiImageResultLabel}</p>
        <img
          src={`${wizard.imageUrl}${wizard.imageUrl?.includes("?") ? "&" : "?"}v=${wizard.imageGenKey}`}
          alt=""
          className="mx-auto max-h-96 w-full rounded-lg object-contain"
        />
      </div>
    </div>
  );
}
