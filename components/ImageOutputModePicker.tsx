"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ImageOutputMode } from "@/lib/image-output-mode";

type Props = {
  value: ImageOutputMode;
  onChange: (mode: ImageOutputMode) => void;
  lockedCampaign?: boolean;
  includeTeachingCarousel?: boolean;
};

export function ImageOutputModePicker({
  value,
  onChange,
  lockedCampaign,
  includeTeachingCarousel,
}: Props) {
  const { m } = useLocale();
  const options: ImageOutputMode[] = lockedCampaign
    ? ["campaign"]
    : ["single", "ab", "campaign", "teaching-carousel"];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{m.wizard.imageOutputModeLabel}</p>
      <p className="text-xs text-slate-500">{m.wizard.imageOutputModeHint}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((mode) => {
          const copy = m.wizard.imageOutputModes[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => !lockedCampaign && onChange(mode)}
              disabled={lockedCampaign && mode !== "campaign"}
              className={`rounded-xl border p-3 text-left transition ${
                value === mode
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${lockedCampaign ? "cursor-default" : ""}`}
            >
              <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
              <p className="mt-1 text-xs text-slate-600">{copy.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
