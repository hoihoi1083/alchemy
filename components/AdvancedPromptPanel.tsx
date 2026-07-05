"use client";

import { useLocale } from "@/components/LocaleProvider";
import {
  PROMPT_MARKETS,
  SUBJECT_FRAMINGS,
  type PromptMarket,
  type SubjectFraming,
} from "@/lib/prompt-variables";

type Props = {
  section: "image" | "video" | "all";
  market: PromptMarket;
  framing: SubjectFraming;
  extra: string;
  imagePrompt: string;
  videoPrompt: string;
  onMarketChange: (v: PromptMarket) => void;
  onFramingChange: (v: SubjectFraming) => void;
  onExtraChange: (v: string) => void;
  onImagePromptChange: (v: string) => void;
  onVideoPromptChange: (v: string) => void;
  onResetFromOptions: () => void;
};

export function AdvancedPromptPanel({
  section,
  market,
  framing,
  extra,
  imagePrompt,
  videoPrompt,
  onMarketChange,
  onFramingChange,
  onExtraChange,
  onImagePromptChange,
  onVideoPromptChange,
  onResetFromOptions,
}: Props) {
  const { m } = useLocale();
  const markets = m.wizard.promptMarkets;
  const framings = m.wizard.promptFramings;

  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-slate-500">{m.wizard.advancedHint}</p>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          {m.wizard.marketLabel}
        </label>
        <select
          value={market}
          onChange={(e) => onMarketChange(e.target.value as PromptMarket)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {PROMPT_MARKETS.map((id) => (
            <option key={id} value={id}>
              {markets[id].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-600">{markets[market].hint}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          {m.wizard.framingLabel}
        </label>
        <select
          value={framing}
          onChange={(e) => onFramingChange(e.target.value as SubjectFraming)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {SUBJECT_FRAMINGS.map((id) => (
            <option key={id} value={id}>
              {framings[id].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-600">{framings[framing].hint}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          {m.wizard.extraLabel}
        </label>
        <input
          value={extra}
          onChange={(e) => onExtraChange(e.target.value)}
          placeholder={m.wizard.extraPlaceholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{m.wizard.promptPreview}</span>
        <button
          type="button"
          onClick={onResetFromOptions}
          className="text-xs text-emerald-600 underline hover:text-emerald-500"
        >
          {m.wizard.resetPrompts}
        </button>
      </div>

      {(section === "image" || section === "all") && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">{m.wizard.imagePromptLabel}</label>
          <textarea
            rows={3}
            value={imagePrompt}
            onChange={(e) => onImagePromptChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800"
          />
        </div>
      )}

      {(section === "video" || section === "all") && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">{m.wizard.videoPromptLabel}</label>
          <textarea
            rows={3}
            value={videoPrompt}
            onChange={(e) => onVideoPromptChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800"
          />
        </div>
      )}
    </div>
  );
}
