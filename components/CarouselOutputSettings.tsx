"use client";

import { useState } from "react";
import { PlanGateDialog } from "@/components/billing/PlanGateDialog";
import { useLocale } from "@/components/LocaleProvider";
import {
  CAROUSEL_SLIDE_COUNTS,
  type CarouselIntent,
  normalizeCarouselSlideCount,
} from "@/lib/carousel-output";

type Props = {
  intent: CarouselIntent;
  slideCount: number;
  onIntentChange: (intent: CarouselIntent) => void;
  onSlideCountChange: (count: number) => void;
  allowTeachingIntent?: boolean;
  promoAllowed?: boolean;
  accent?: "emerald" | "violet";
  compact?: boolean;
};

export function CarouselOutputSettings({
  intent,
  slideCount,
  onIntentChange,
  onSlideCountChange,
  allowTeachingIntent = true,
  promoAllowed = true,
  accent = "emerald",
  compact = false,
}: Props) {
  const { m } = useLocale();
  const [gateOpen, setGateOpen] = useState(false);
  const c = m.wizard.carouselSettings;
  const normalizedCount = normalizeCarouselSlideCount(slideCount, intent);

  const intentOptions: { id: CarouselIntent; disabled?: boolean }[] = allowTeachingIntent
    ? [
        { id: "teaching" },
        { id: "promo", disabled: !promoAllowed },
      ]
    : [{ id: "promo", disabled: !promoAllowed }];

  const borderSelected =
    accent === "violet" ? "border-violet-400 bg-violet-50" : "border-emerald-500 bg-emerald-50/80";

  return (
    <div
      className={`space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 ${
        compact ? "mt-2" : "mt-3"
      }`}
    >
      <div>
        <p className="text-xs font-semibold text-slate-700">{c.intentLabel}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{c.intentHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {intentOptions.map(({ id, disabled }) => {
            const selected = intent === id;
            const copy = id === "teaching" ? c.intentTeaching : c.intentPromo;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled && !selected}
                onClick={() => {
                  if (id === "promo" && !promoAllowed) {
                    setGateOpen(true);
                    return;
                  }
                  onIntentChange(id);
                  if (id === "promo") onSlideCountChange(3);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  selected ? borderSelected : "border-slate-200 bg-white hover:border-slate-300"
                } ${disabled && !selected ? "opacity-60" : ""}`}
              >
                <span className="block font-semibold text-slate-900">{copy.title}</span>
                <span className="mt-0.5 block text-[11px] text-slate-600">{copy.description}</span>
                {id === "promo" && !promoAllowed ? (
                  <span className="mt-1 block text-[10px] font-semibold text-amber-800">
                    {m.pricing.plans.standard.name}+
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {intent === "teaching" ? (
        <div>
          <label className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <span className="font-semibold">{c.slideCountLabel}</span>
            <select
              value={normalizedCount}
              onChange={(e) => onSlideCountChange(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {CAROUSEL_SLIDE_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {c.slideCountOption.replace("{count}", String(n))}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1.5 text-[11px] text-slate-500">{c.slideCountHint}</p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{c.promoSlideCountNote}</p>
      )}

      <PlanGateDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        requiredPlan="standard"
        featureLabel={c.intentPromo.title}
      />
    </div>
  );
}
