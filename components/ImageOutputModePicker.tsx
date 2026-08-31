"use client";

import { useEffect, useMemo, useState } from "react";
import { CarouselOutputSettings } from "@/components/CarouselOutputSettings";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import { useUserPlanEntitlements } from "@/hooks/useUserPlanEntitlements";
import { isCarouselUiSelected } from "@/lib/carousel-output";
import type { CarouselIntent } from "@/lib/carousel-output";
import {
  canUseCarousel,
  minPlanForFeature,
} from "@/lib/billing/plan-gates";
import {
  imageOutputPreviewSrc,
  type ImageOutputMode,
} from "@/lib/image-output-mode";

type Props = {
  value: ImageOutputMode;
  onChange: (mode: ImageOutputMode) => void;
  carouselIntent: CarouselIntent;
  onCarouselIntentChange: (intent: CarouselIntent) => void;
  carouselSlideCount: number;
  onCarouselSlideCountChange: (count: number) => void;
  lockedCampaign?: boolean;
  /** Designed poster etc. — only a finished single still makes sense. */
  lockedSingle?: boolean;
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
  carouselIntent,
  onCarouselIntentChange,
  carouselSlideCount,
  onCarouselSlideCountChange,
  lockedCampaign,
  lockedSingle,
  forVideoKeyframe = false,
  includeTeachingCarousel = true,
  accent = "emerald",
}: Props) {
  const { m } = useLocale();
  const { plan, planReady } = useUserPlanEntitlements();
  const [gateOpen, setGateOpen] = useState(false);
  // Until /api/me returns, don't false-lock carousel for paid users.
  const carouselAllowed =
    !planReady || canUseCarousel(plan) || Boolean(lockedCampaign);
  const locked = Boolean(lockedCampaign || lockedSingle);
  const options: ImageOutputMode[] = useMemo(() => {
    if (lockedCampaign) return ["carousel"];
    if (lockedSingle) return ["single"];
    if (forVideoKeyframe) return ["single", "ab"];
    return ["single", "ab", "carousel"];
  }, [forVideoKeyframe, lockedCampaign, lockedSingle]);

  const uiValue: ImageOutputMode = isCarouselUiSelected(value) ? "carousel" : value;

  useEffect(() => {
    if (!planReady) return;
    if (uiValue === "carousel" && !carouselAllowed && !lockedCampaign) {
      onChange("single");
      return;
    }
    if (!options.includes(uiValue)) {
      onChange(options[0] ?? "single");
    }
  }, [carouselAllowed, lockedCampaign, onChange, options, planReady, uiValue]);

  const selectedClass =
    accent === "violet"
      ? "border-violet-400 bg-violet-50"
      : "border-violet-400 bg-violet-50";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        {forVideoKeyframe ? m.wizard.imageKeyframeModeLabel : m.wizard.imageOutputModeLabel}
      </p>
      <p className="text-xs text-slate-500">
        {lockedSingle
          ? m.wizard.imageOutputModeHintDesignedPoster
          : forVideoKeyframe
            ? m.wizard.imageKeyframeModeHint
            : m.wizard.imageOutputModeHint}
      </p>
      <div
        className={`grid gap-2 sm:grid-cols-2 ${
          options.length > 2 ? "lg:grid-cols-3" : ""
        }`}
      >
        {options.map((mode) => {
          const copy = m.wizard.imageOutputModes[mode];
          const modeLocked = mode === "carousel" && !carouselAllowed && !lockedCampaign;
          const selected = uiValue === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (locked) return;
                if (!planReady) return;
                if (modeLocked) {
                  setGateOpen(true);
                  return;
                }
                onChange(mode);
                if (mode === "carousel") {
                  if (lockedCampaign || !includeTeachingCarousel) {
                    onCarouselIntentChange("promo");
                    onCarouselSlideCountChange(3);
                  }
                }
              }}
              disabled={locked}
              aria-disabled={locked || modeLocked}
              className={`overflow-hidden rounded-xl border text-left transition ${
                modeLocked
                  ? "cursor-pointer border-dashed border-slate-300 bg-slate-50/80 opacity-90"
                  : selected
                    ? selectedClass
                    : "border-slate-200 bg-white hover:border-slate-300"
              } ${locked ? "cursor-default" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageOutputPreviewSrc(mode)}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="block p-3">
                <span className="block text-sm font-semibold text-slate-900">{copy.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{copy.description}</span>
                {modeLocked ? (
                  <span className="mt-1 block text-[10px] font-semibold text-amber-800">
                    {m.pricing.plans.standard.name}+
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {uiValue === "carousel" && !locked && carouselAllowed ? (
        <CarouselOutputSettings
          intent={carouselIntent}
          slideCount={carouselSlideCount}
          onIntentChange={onCarouselIntentChange}
          onSlideCountChange={onCarouselSlideCountChange}
          allowTeachingIntent={includeTeachingCarousel}
          promoAllowed={carouselAllowed}
          accent={accent}
        />
      ) : null}
      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan={minPlanForFeature("carousel_mode")}
        featureLabel={m.wizard.imageOutputModes.carousel.title}
      />
    </div>
  );
}
