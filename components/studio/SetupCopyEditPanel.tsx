"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import { AdvancedPromptPanel } from "@/components/AdvancedPromptPanel";
import { TemplateSlotChecklist } from "@/components/TemplateSlotChecklist";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { VisualStylePicker } from "@/components/VisualStylePicker";
import { isSlotRequired, templateHasSlot } from "@/lib/template-slots";
import { isBrandVisualStyle, isUgcPresenterStyle, visualStylePromptHint } from "@/lib/visual-styles";
import { SetupReferenceSection } from "@/components/studio/SetupReferenceSection";

type Props = {
  /** Micro-wizard: show expert visual style override */
  showAdvancedWorkflow?: boolean;
  /** When reference + brief are shown above (fused pre-generate). */
  omitReference?: boolean;
};

export function SetupCopyEditPanel({
  showAdvancedWorkflow = true,
  omitReference = false,
}: Props) {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    advancedSection,
    applyPromptRebuild,
    business,
    headline,
    imagePrompt,
    isConceptStoryboardOutput,
    offer,
    product,
    promotionMode,
    promptExtra,
    promptMarket,
    setBusiness,
    setBrandKit,
    setHeadline,
    setOffer,
    setProduct,
    setPromptExtra,
    setPromptMarket,
    setImagePrompt,
    setSubjectFraming,
    setShowAdvancedSetup,
    setShowAdvancedSetupPrompts,
    setSubline,
    setVideoPrompt,
    shipItMode,
    showAdvancedSetup,
    showAdvancedSetupPrompts,
    subjectFraming,
    subline,
    templateId,
    templateSlotStatus,
    usesCompositor,
    imageRefPhoto,
    usesReferenceConceptForImage,
    videoPrompt,
    visualStyleId,
    workflowMode,
    selectVisualStyle,
  } = wizard;

  const [brandKitOpen, setBrandKitOpen] = useState(isBrandVisualStyle(visualStyleId));

  const setupReferenceVideoOnStep1 =
    workflowMode === "video-only" || workflowMode === "combined";

  return (
    <div className="space-y-4">
      {!usesCompositor && isUgcPresenterStyle(visualStyleId) ? (
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-900">
            {m.wizard.visualStyles["ugc-presenter"].title}
          </p>
          <p className="text-xs text-rose-800">{m.wizard.ugcPresenter.setupIntro}</p>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "model-wear" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">{m.wizard.visualStyles["model-wear"].title}</p>
          <p className="mt-1 text-xs text-rose-800">{m.wizard.modelWearIntro}</p>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "info-poster" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">{m.wizard.infoPosterTechniqueTitle}</p>
          <p className="mt-1 text-xs text-sky-800">{m.wizard.infoPosterTechniqueIntro}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-sky-800">
            {m.wizard.infoPosterTechniqueSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "designed-poster" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{m.wizard.designedPosterTechniqueTitle}</p>
          <p className="mt-1 text-xs text-amber-900/90">
            {m.wizard.designedPosterTechniqueIntro}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-amber-900/90">
            {m.wizard.designedPosterTechniqueSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "parts-poster" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">{m.wizard.partsPosterTechniqueTitle}</p>
          <p className="mt-1 text-xs text-sky-900/90">
            {m.wizard.partsPosterTechniqueIntro}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-sky-900/90">
            {m.wizard.partsPosterTechniqueSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "pricing-offer" ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.pricing.title}
          </p>
          <p className="mt-1 text-xs text-violet-900/90">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.pricing.body}
          </p>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "website-launch" ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.website.title}
          </p>
          <p className="mt-1 text-xs text-violet-900/90">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.website.body}
          </p>
        </div>
      ) : null}

      {!usesCompositor && visualStyleId === "brand-fit" ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.brand.title}
          </p>
          <p className="mt-1 text-xs text-violet-900/90">
            {m.microWizard.preGenerateSetup.conceptCopyFocus.brand.body}
          </p>
        </div>
      ) : null}

      {!usesCompositor && usesReferenceConceptForImage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {m.wizard.referenceConceptOverridesStyle}
        </p>
      ) : null}

      {!omitReference ? <SetupReferenceSection /> : null}

      {!omitReference && imageRefPhoto ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {m.wizard.referenceOptionalCopyHint}
        </p>
      ) : null}

      {!usesCompositor &&
      !usesReferenceConceptForImage &&
      visualStylePromptHint(visualStyleId) ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{m.wizard.styleAutoAppliedLabel}</span>{" "}
          {m.wizard.visualStyleHints[visualStyleId as keyof typeof m.wizard.visualStyleHints]}
        </p>
      ) : null}

      {templateHasSlot(templateId, "product") ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            {promotionMode === "physical" && !usesCompositor
              ? m.wizard.productLabelRequired
              : m.wizard.productLabel}
          </span>
          <input
            data-coach-id="coach-product-name"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={m.wizard.productPlaceholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      ) : null}

      {templateHasSlot(templateId, "headline") ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            {m.wizard.headlineLabel}
            {isSlotRequired(templateId, "headline") ? " *" : ""}
          </span>
          <input
            data-coach-id="coach-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={m.wizard.headlinePlaceholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      ) : null}

      {templateHasSlot(templateId, "subline") ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            {usesCompositor || visualStyleId === "info-poster"
              ? m.wizard.sublineBulletsLabel
              : visualStyleId === "parts-poster"
                ? m.microWizard.preGenerateSetup.conceptCopyFocus.parts.supportingLabel
                : visualStyleId === "pricing-offer"
                  ? m.microWizard.preGenerateSetup.conceptCopyFocus.pricing.supportingLabel
                  : visualStyleId === "website-launch"
                    ? m.microWizard.preGenerateSetup.conceptCopyFocus.website.supportingLabel
                    : visualStyleId === "brand-fit"
                      ? m.microWizard.preGenerateSetup.conceptCopyFocus.brand.supportingLabel
                      : visualStyleId === "designed-poster"
                        ? m.microWizard.preGenerateSetup.conceptCopyFocus.designed.supportingLabel
                        : m.wizard.sublineLabel}
          </span>
          {usesCompositor ||
          visualStyleId === "info-poster" ||
          visualStyleId === "parts-poster" ? (
            <textarea
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
              placeholder={
                visualStyleId === "info-poster"
                  ? m.wizard.infoPosterBulletsPlaceholder
                  : visualStyleId === "parts-poster"
                    ? m.wizard.partsPosterPartsPlaceholder
                    : visualStyleId === "designed-poster"
                      ? m.wizard.designedPosterTaglinePlaceholder
                      : m.wizard.sublineBulletsPlaceholder
              }
              rows={visualStyleId === "parts-poster" ? 5 : 4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          ) : (
            <input
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
              placeholder={
                visualStyleId === "pricing-offer"
                  ? m.microWizard.preGenerateSetup.conceptCopyFocus.pricing
                      .supportingPlaceholder
                  : visualStyleId === "website-launch"
                    ? m.microWizard.preGenerateSetup.conceptCopyFocus.website
                        .supportingPlaceholder
                    : visualStyleId === "brand-fit"
                      ? m.microWizard.preGenerateSetup.conceptCopyFocus.brand
                          .supportingPlaceholder
                      : visualStyleId === "designed-poster"
                        ? m.wizard.designedPosterTaglinePlaceholder
                        : m.wizard.sublinePlaceholder
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          )}
        </label>
      ) : null}

      {templateHasSlot(templateId, "business") ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            {usesCompositor ? m.wizard.brandLabel : m.wizard.businessLabel}
          </span>
          <input
            data-coach-id="coach-business"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder={
              usesCompositor ? m.wizard.brandPlaceholder : m.wizard.businessPlaceholder
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
      ) : null}

      {templateHasSlot(templateId, "offer") ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            {usesCompositor
              ? m.wizard.signoffLabel
              : visualStyleId === "pricing-offer"
                ? m.microWizard.preGenerateSetup.conceptCopyFocus.pricing.offerLabel
                : visualStyleId === "website-launch"
                  ? m.microWizard.preGenerateSetup.conceptCopyFocus.website.offerLabel
                  : m.wizard.offerLabel}
          </span>
          <input
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder={
              usesCompositor
                ? m.wizard.signoffPlaceholder
                : visualStyleId === "pricing-offer"
                  ? m.microWizard.preGenerateSetup.conceptCopyFocus.pricing
                      .offerPlaceholder
                  : visualStyleId === "website-launch"
                    ? m.microWizard.preGenerateSetup.conceptCopyFocus.website
                        .offerPlaceholder
                    : m.wizard.offerPlaceholder
            }
            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
              visualStyleId === "pricing-offer"
                ? "border-violet-300 bg-violet-50/40"
                : "border-slate-200"
            }`}
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{m.wizard.requirementsLabel}</span>
        <textarea
          value={promptExtra}
          onChange={(e) => setPromptExtra(e.target.value)}
          placeholder={
            m.wizard.requirementsPlaceholders[
              visualStyleId as keyof typeof m.wizard.requirementsPlaceholders
            ] ?? m.wizard.requirementsPlaceholder
          }
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>

      <TemplateSlotChecklist
        templateId={templateId}
        filled={templateSlotStatus()}
        optionalSlotIds={isConceptStoryboardOutput ? ["productPhoto"] : undefined}
        deferredSlotIds={
          setupReferenceVideoOnStep1
            ? ["productPhoto", "styleRef"]
            : ["productPhoto", "styleRef", "referenceVideo"]
        }
      />

      <details
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        open={brandKitOpen}
        onToggle={(e) => setBrandKitOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          {m.wizard.brandFitTitle}
        </summary>
        <div className="mt-3">
          <BrandKitPanel onChange={setBrandKit} />
        </div>
      </details>

      {showAdvancedWorkflow && !shipItMode ? (
        <details
          className="rounded-xl border border-slate-200 bg-white p-3"
          open={showAdvancedSetup}
          onToggle={(e) => setShowAdvancedSetup((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            {m.wizard.advancedWorkflow}
          </summary>
          <div className="mt-3">
            <VisualStylePicker
              value={visualStyleId}
              onChange={selectVisualStyle}
              workflowMode={workflowMode}
              promotionMode={promotionMode}
            />
          </div>
        </details>
      ) : null}

      {!usesCompositor && !shipItMode ? (
        <details
          className="rounded-xl border border-slate-200 bg-white p-3"
          open={showAdvancedSetupPrompts}
          onToggle={(e) =>
            setShowAdvancedSetupPrompts((e.target as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            {workflowMode === "image-only" ? m.wizard.imageAdvancedLabel : m.wizard.advancedPrompts}
          </summary>
          <AdvancedPromptPanel
            section={advancedSection}
            market={promptMarket}
            framing={subjectFraming}
            extra={promptExtra}
            imagePrompt={imagePrompt}
            videoPrompt={videoPrompt}
            onMarketChange={setPromptMarket}
            onFramingChange={setSubjectFraming}
            onExtraChange={setPromptExtra}
            onImagePromptChange={setImagePrompt}
            onVideoPromptChange={setVideoPrompt}
            onResetFromOptions={() => applyPromptRebuild()}
          />
        </details>
      ) : null}
    </div>
  );
}
