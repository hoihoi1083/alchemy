"use client";

import { useEffect, useMemo } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { ImageOutputMode } from "@/lib/image-output-mode";

type Props = {
  value: ImageOutputMode;
  onChange: (mode: ImageOutputMode) => void;
  lockedCampaign?: boolean;
  /**
   * Combined / video keyframe flow: only single + A/B.
   * Campaign & teaching carousel are image-pack deliverables, not Seedance keyframes.
   */
  forVideoKeyframe?: boolean;
  /** When false (and not forVideoKeyframe), hide teaching carousel. Default true for image-only. */
  includeTeachingCarousel?: boolean;
  /** Studio fuse pages use violet selected state. */
  accent?: "emerald" | "violet";
};

export function ImageOutputModePicker({
  value,
  onChange,
  lockedCampaign,
  forVideoKeyframe = false,
  includeTeachingCarousel = true,
  accent = "emerald",
}: Props) {
  const { m } = useLocale();
  const options: ImageOutputMode[] = useMemo(() => {
    if (lockedCampaign) return ["campaign"];
    if (forVideoKeyframe) return ["single", "ab"];
    if (includeTeachingCarousel) return ["single", "ab", "campaign", "teaching-carousel"];
    return ["single", "ab", "campaign"];
  }, [forVideoKeyframe, includeTeachingCarousel, lockedCampaign]);

  useEffect(() => {
    if (!options.includes(value)) {
      onChange(options[0] ?? "single");
    }
  }, [onChange, options, value]);

  const selectedClass =
    accent === "violet"
      ? "border-violet-400 bg-violet-50"
      : "border-emerald-400 bg-emerald-50";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        {forVideoKeyframe ? m.wizard.imageKeyframeModeLabel : m.wizard.imageOutputModeLabel}
      </p>
      <p className="text-xs text-slate-500">
        {forVideoKeyframe ? m.wizard.imageKeyframeModeHint : m.wizard.imageOutputModeHint}
      </p>
      <div
        className={`grid gap-2 sm:grid-cols-2 ${
          options.length > 2 ? "lg:grid-cols-4" : ""
        }`}
      >
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
                  ? selectedClass
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
