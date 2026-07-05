"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { VideoCreativeMode } from "@/lib/creative-workflow";
import { videoModesForStudio } from "@/lib/creative-workflow";
import type { OutputGoal } from "@/lib/creative-workflow";
import type { PromotionMode } from "@/lib/promotion-mode";

type Props = {
  goal: OutputGoal;
  promotionMode?: PromotionMode;
  value: VideoCreativeMode;
  onChange: (mode: VideoCreativeMode) => void;
  /** Video step uses dark panel — light text for readability */
  variant?: "light" | "dark";
};

const ICONS: Record<VideoCreativeMode, string> = {
  "product-assistant": "🤖",
  "product-promo": "📦",
  "reference-concept": "🎬",
  "image-to-video": "📷→🎬",
};

export function VideoCreativeModePicker({
  goal,
  promotionMode = "physical",
  value,
  onChange,
  variant = "light",
}: Props) {
  const { m } = useLocale();
  const modes = videoModesForStudio(promotionMode, goal).filter(
    (id) => !(promotionMode === "concept" && id === "product-assistant"),
  );
  const isDark = variant === "dark";
  const isConcept = promotionMode === "concept";

  return (
    <div className="space-y-2">
      <p
        className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-700"}`}
      >
        {isConcept ? m.wizard.conceptVideoCreativeLabel : m.wizard.videoCreativeLabel}
      </p>
      <div className="grid gap-2">
        {modes.map((id) => {
          const copy =
            isConcept && id === "product-promo"
              ? m.wizard.conceptVideoCreativeMode
              : m.wizard.videoCreativeModes[id];
          const isAssistant = id === "product-assistant";
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? isAssistant
                    ? "border-cyan-400 bg-cyan-950/50 ring-1 ring-cyan-400/60"
                    : isDark
                      ? "border-emerald-400 bg-emerald-950/40"
                      : "border-emerald-400 bg-emerald-50"
                  : isDark
                    ? "border-slate-600 bg-slate-900/60 hover:border-slate-500"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="mr-2 text-xl">{ICONS[id]}</span>
              <span
                className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {copy.title}
              </span>
              <p
                className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                {copy.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
