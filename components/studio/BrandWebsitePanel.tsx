"use client";

import { useLocale } from "@/components/LocaleProvider";
import { useWizard } from "@/components/studio/WizardContext";
import {
  isBrandVideoStyle,
  isBrandVisualStyle,
} from "@/lib/visual-styles";

export function BrandWebsitePanel() {
  const { m } = useLocale();
  const wizard = useWizard();
  const {
    analyzeBrand,
    brandAnalyzeBusy,
    brandAnalyzeNote,
    brandSocialHint,
    brandWebsiteUrl,
    lockedCampaignMode,
    setBrandSocialHint,
    setBrandWebsiteUrl,
    visualStyleId,
  } = wizard;

  const intro = isBrandVisualStyle(visualStyleId)
    ? lockedCampaignMode
      ? m.wizard.brandCampaignIntro
      : isBrandVideoStyle(visualStyleId)
        ? m.wizard.brandVideoIntro
        : m.wizard.brandFitIntro
    : m.wizard.brandAnalyzeOptionalIntro;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">{intro}</p>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{m.wizard.brandWebsiteLabel}</span>
        <input
          data-coach-id="coach-brand-website"
          value={brandWebsiteUrl}
          onChange={(e) => setBrandWebsiteUrl(e.target.value)}
          placeholder={m.wizard.brandWebsitePlaceholder}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">{m.wizard.brandSocialLabel}</span>
        <input
          value={brandSocialHint}
          onChange={(e) => setBrandSocialHint(e.target.value)}
          placeholder={m.wizard.brandSocialPlaceholder}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>
      <button
        type="button"
        data-coach-id="coach-analyze-brand"
        disabled={brandAnalyzeBusy || !brandWebsiteUrl.trim()}
        onClick={() => void analyzeBrand()}
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {brandAnalyzeBusy ? m.wizard.brandAnalyzeBusy : m.wizard.brandAnalyzeBtn}
      </button>
      {brandAnalyzeNote ? (
        <p className="text-sm text-emerald-800">{brandAnalyzeNote}</p>
      ) : null}
    </div>
  );
}
